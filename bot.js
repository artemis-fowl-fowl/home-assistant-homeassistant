const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs').promises;
const mqtt = require('mqtt');

dotenv.config({ path: path.join(__dirname, '.env') });

const USERNAME = process.env.ENT_USERNAME;
const PASSWORD = process.env.ENT_PASSWORD;
const MQTT_BROKER = process.env.MQTT_BROKER;
const MQTT_USERNAME = process.env.MQTT_USERNAME;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD;
const emploiPath = path.join(__dirname, 'emploi.json');

let puppeteer;
let mqttClient;

// Fonction pour extraire l'horaire de début (première heure)
function extractFirstHour(emploiText) {
    if (!emploiText) return null;
    
    // Chercher un horaire au format HhMM (ex: 8h00, 10h55)
    const timeMatch = emploiText.match(/(\d{1,2})h(\d{2})/);
    
    if (timeMatch) {
        return timeMatch[0]; // Retourne l'horaire trouvé (ex: "08h00")
    }
    
    return null;
}

// Initialiser la connexion MQTT
function initMQTT() {
    return new Promise((resolve) => {
        const options = {
            username: MQTT_USERNAME,
            password: MQTT_PASSWORD,
            clean: true,
            connectTimeout: 4000,
            reconnectPeriod: 1000,
            clientId: 'pronote-bot'
        };

        mqttClient = mqtt.connect(MQTT_BROKER, options);

        mqttClient.on('connect', () => {
            console.log('✅ Connecté au broker MQTT');
            
            // Publier la config de l'entité pour Home Assistant
            const configTopic = 'homeassistant/sensor/pronote/heure_pronote/config';
            const configPayload = {
                name: 'Heure Pronote',
                unique_id: 'pronote_heure',
                state_topic: 'pronote/heure_pronote/state',
                unit_of_measurement: '',
                icon: 'mdi:clock-outline',
                device: {
                    identifiers: ['pronote_bot'],
                    name: 'Pronote Bot'
                }
            };
            
            mqttClient.publish(configTopic, JSON.stringify(configPayload), { retain: true });
            resolve();
        });

        mqttClient.on('error', (error) => {
            console.error('❌ Erreur MQTT:', error.message);
            resolve(); // Continuer quand même
        });
    });
}

// Publier l'horaire sur MQTT
async function publishFirstHour(firstHour) {
    if (!mqttClient || !mqttClient.connected) return;
    
    const stateTopic = 'pronote/heure_pronote/state';
    const payload = firstHour || 'Aucun cours';
    
    mqttClient.publish(stateTopic, payload);
    console.log(`📡 Publié sur MQTT: ${payload}`);
}

// Récupérer et afficher l'emploi du temps dans le terminal
async function updateEmploi() {
    try {
        console.log(`\n⏱️  [${new Date().toLocaleString('fr-FR')}] Récupération de l'emploi du temps...`);

        let emploiText = '';
        try {
            if (!puppeteer) puppeteer = require('puppeteer');
            
            const browser = await puppeteer.launch({ 
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });
            const page = await browser.newPage();
            await page.setDefaultTimeout(15000);
            ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            // Note: Les etapes suivantes sont basées sur mon educonnect donc il vous faudra adapter les selecteurs pour cela il faut                       //
            // 1. Ouvrir votre navigateur en mode développeur (F12) et inspecter les éléments de la page de connexion à pronote                            //
            // 2. Trouver les selecteurs correspondants pour chaque étape (sélection de l'EDU, bouton submit, bouton responsable, champs de connexion)    //
            // 3. Remplacer les selecteurs dans le code ci-dessous par ceux que vous avez trouvés                                                        //
            // Par exemple, si le bouton pour sélectionner l'EDU a un id "edu-button", vous remplaceriez 'label[for="idp-EDU"]' par '#edu-button'       //
            /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            // Accéder à Pronote
            await page.goto('https://your-cas-domain.example.fr/login?service=https%3A%2F%2Fyour-ent-domain.example.fr%2Fsg.do%3FPROC%3DIDENTIFICATION_FRONT', { waitUntil: 'domcontentloaded' });
            
            // Sélectionner EDU
            try {
                await page.waitForSelector('label[for="idp-EDU"]', { timeout: 5000 });
                await page.click('label[for="idp-EDU"]');
            } catch (e) {
                console.log('⚠️ Sélecteur EDU non trouvé');
            }
            
            // Soumettre
            try {
                await page.waitForSelector('.cas__wayf-submit #button-submit', { timeout: 5000 });
                await page.click('.cas__wayf-submit #button-submit');
            } catch (e) {
                console.log('⚠️ Bouton submit non trouvé');
            }
            await new Promise(r => setTimeout(r, 1000));
            
            // Cliquer responsable
            try {
                await page.waitForSelector('#bouton_responsable', { timeout: 5000 });
                await page.click('#bouton_responsable');
            } catch (e) {
                console.log('⚠️ Bouton responsable non trouvé');
            }
            await new Promise(r => setTimeout(r, 500));

            // Connexion
            try {
                await page.waitForSelector('input[name="j_username"]', { timeout: 5000 });
                await page.click('input[name="j_username"]');
                await page.type('input[name="j_username"]', USERNAME, { delay: 25 });
                
                await page.click('input[name="j_password"]');
                await page.type('input[name="j_password"]', PASSWORD, { delay: 25 });
                await page.click('button[type="submit"]');
            } catch (e) {
                console.log('⚠️ Erreur lors de la connexion');
            }
            
            await new Promise(r => setTimeout(r, 3000));

            // Navigation à emploi du temps
            try {
                await page.goto('https://your-school-code.index-education.net/pronote/eleve.html', { waitUntil: 'domcontentloaded' });
            } catch (e) {
                console.log('⚠️ Navigation Pronote échouée');
            }
            await new Promise(r => setTimeout(r, 3000));

            // Récupérer les données avec plusieurs stratégies
            emploiText = await page.evaluate(() => {
                const courses = [];
                
                // Stratégie 1: Chercher les éléments de classe "cours"
                document.querySelectorAll('[class*="cours"], [class*="course"], [class*="lesson"]').forEach(el => {
                    const text = el.innerText?.trim();
                    if (text && text.length > 3 && !text.includes('undefined')) {
                        courses.push(text);
                    }
                });

                // Stratégie 2: Chercher dans le contenu textuel
                if (courses.length === 0) {
                    const bodyText = document.body.innerText;
                    const lines = bodyText.split('\n').filter(line => 
                        line.includes('h') && (line.includes(':') || line.match(/\d{1,2}:\d{2}/))
                    );
                    courses.push(...lines.slice(0, 10));
                }

                // Stratégie 3: Tout contenu entre 30 et 200 caractères
                if (courses.length === 0) {
                    document.querySelectorAll('div, p, span').forEach(el => {
                        const text = el.innerText?.trim();
                        if (text && text.length > 30 && text.length < 200 && !text.includes('undefined')) {
                            courses.push(text);
                        }
                    });
                }

                return courses.length > 0 
                    ? courses.slice(0, 5).join('\n\n') 
                    : 'Aucun cours trouvé - Page chargée';
            });

            // Sauvegarder pour consultation
            await fs.writeFile(emploiPath, JSON.stringify({ description: emploiText, timestamp: new Date().toISOString() }, null, 2));

            await browser.close();
            console.log('✅ Emploi du temps récupéré avec succès');
        } catch (puppeteerError) {
            console.log('⚠️ Erreur Puppeteer, tentative lecture fichier...');
            try {
                const emploiData = await fs.readFile(emploiPath, 'utf-8');
                const emploi = JSON.parse(emploiData);
                emploiText = emploi.description || 'Emploi du temps indisponible';
            } catch {
                emploiText = '📅 Emploi du temps - Impossible de récupérer les données.';
            }
        }

        // Afficher dans le terminal - Uniquement la première heure
        const firstHour = extractFirstHour(emploiText);
        
        if (firstHour) {
            console.log('\n📅 === PREMIÈRE HEURE DU JOUR ===');
            console.log(`🕐 Horaire de début: ${firstHour}`);
            console.log('==================================\n');
            
            // Publier sur MQTT
            await publishFirstHour(firstHour);
        } else {
            console.log('📌 Pas d\'horaire trouvé');
            await publishFirstHour(null);
        }
    } catch (error) {
        console.error('❌ Erreur emploi du temps:', error.message);
    }
}

// Démarrage
(async () => {
    console.log('🚀 Démarrage du bot - Récupération emploi du temps toutes les heures...\n');
    
    // Initialiser MQTT
    await initMQTT();
    
    // Première récupération immédiate
    await updateEmploi();
    
    // Récupération toutes les heures (3600000 ms)
    setInterval(async () => {
        await updateEmploi();
    }, 3600000);
})();
