# Pronote Bot

Un bot automatisé pour récupérer votre emploi du temps depuis Pronote et le publier sur MQTT pour intégration avec Home Assistant.

## Fonctionnalités

- 📅 Récupération automatique de l'emploi du temps Pronote
- 📡 Publication sur MQTT pour Home Assistant
- 🐳 Déploiement facile avec Docker Compose
- ⏰ Extraction de la première heure de cours

## Prérequis

- Docker et Docker Compose
- Identifiants ENT (établissement)
- Un broker MQTT fonctionnel
- Connexion réseau vers Pronote

## Configuration

### 1. Cloner le repository

```bash
git clone https://github.com/artemis-fowl-fowl/home-assistant-homeassistant.git
cd pronote-bot
```

### 2. Configurer les variables d'environnement

Copiez `.env.example` vers `.env` et remplissez vos données :

```bash
cp .env.example .env
```

Éditez `.env` :

```
DISCORD_TOKEN=your_actual_discord_token_here
ENT_USERNAME=your_ent_username
ENT_PASSWORD=your_ent_password
HEAD=true
MQTT_BROKER=mqtt://your-mqtt-broker:1883
MQTT_USERNAME=mqtt_user
MQTT_PASSWORD=your_actual_mqtt_password
```

⚠️ **Important:** N'oubliez pas d'adapter les URLs Pronote dans `bot.js` selon votre établissement.

### 3. Lancer avec Docker Compose

```bash
docker-compose up -d
```

Vérifiez que tout fonctionne :

```bash
docker-compose logs -f pronote-bot
```

## Configuration Pronote

Avant de lancer le bot, mettez à jour les URLs Pronote dans `bot.js` :
- Remplacez `your-cas-domain.example.fr` par votre domaine CAS
- Remplacez `your-ent-domain.example.fr` par votre domaine ENT
- Remplacez `your-school-code` par votre code établissement

## Intégration Home Assistant

L'entité MQTT `sensor.pronote_heure` sera créée automatiquement.

Dans Home Assistant, configurez MQTT :
- **Broker:** Adresse IP de votre serveur
- **Port:** 1883
- **Username:** La valeur de `MQTT_USERNAME` dans `.env`
- **Password:** La valeur de `MQTT_PASSWORD` dans `.env`

## Dépannage

```bash
# Voir les logs
docker-compose logs -f pronote-bot

# Redémarrer le service
docker-compose restart pronote-bot

# Arrêter les services
docker-compose down
```

## Sécurité

- Le fichier `.env` contenant vos identifiants est dans `.gitignore`
- Ne commitez jamais votre `.env` réel sur GitHub
- Utilisez `.env.example` comme template pour la documentation

## Licence

MIT

## Adaptation des sélecteurs Pronote

⚠️ **Important:** Les sélecteurs HTML utilisés dans le code dépendent de votre ENT. Voici comment les adapter :

### Étapes pour adapter le code

1. **Ouvrir le mode développeur** : Appuyez sur `F12` dans votre navigateur
2. **Inspecter les éléments** : Identifiez les sélecteurs pour chaque étape :
   - Sélection de l'EDU (établissement)
   - Bouton de soumission
   - Bouton responsable/parent
   - Champs de connexion (username/password)

### Exemple d'adaptation

Si le bouton pour sélectionner l'EDU a l'ID `edu-button` au lieu de `idp-EDU`, modifiez :

```javascript
// ❌ Avant
await page.waitForSelector('label[for="idp-EDU"]', { timeout: 5000 });

// ✅ Après
await page.waitForSelector('#edu-button', { timeout: 5000 });
```

### Sélecteurs couramment utilisés

| Élement | Sélecteur par défaut | Alternatives possibles |
|---------|----------------------|------------------------|
| EDU | `label[for="idp-EDU"]` | `#edu-button`, `.idp-selector` |
| Submit | `.cas__wayf-submit #button-submit` | `button[type="submit"]`, `#btn-submit` |
| Responsable | `#bouton_responsable` | `.parent-button`, `[data-role="parent"]` |
| Username | `input[name="j_username"]` | `#username`, `.login-field` |
| Password | `input[name="j_password"]` | `#password`, `.pwd-field` |

### Besoin d'aide ?
contacter moi sur discord @chatmeow69
