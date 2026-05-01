# Déploiement sur Ubuntu avec Docker Compose

## Installation préalable

```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Installer Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Ajouter votre utilisateur au groupe docker
sudo usermod -aG docker $USER
newgrp docker
```

## Configuration

### 1. Préparer les dossiers
```bash
mkdir -p mosquitto/config
mkdir -p mosquitto/data
mkdir -p mosquitto/log
```

### 2. Créer le fichier de mots de passe Mosquitto
```bash
# Créer le fichier avec les credentials
sudo docker run --rm -v $(pwd)/mosquitto/config:/mosquitto/config eclipse-mosquitto mosquitto_passwd -c /mosquitto/config/passwd.txt mqtt_user YOUR_MQTT_PASSWORD

# Ou manuellement (remplacer par votre mot de passe):
echo "mqtt_user:$(/bin/echo -n 'YOUR_MQTT_PASSWORD' | openssl passwd -apr1 -stdin)" | sudo tee mosquitto/config/passwd.txt
```

### 3. Vérifier le fichier .env
```bash
cat .env
```

Doit contenir:
```
MQTT_BROKER=mqtt://mosquitto:1883
MQTT_USERNAME=mqtt_user
MQTT_PASSWORD=YOUR_MQTT_PASSWORD
ENT_USERNAME=your_ent_username
ENT_PASSWORD=your_ent_password
```

### 4. Lancer les conteneurs
```bash
# Démarrer les services
docker-compose up -d

# Vérifier le statut
docker-compose ps

# Voir les logs du bot
docker-compose logs -f pronote-bot

# Voir les logs de mosquitto
docker-compose logs -f mosquitto
```

## Commandes utiles

```bash
# Arrêter les services
docker-compose down

# Redémarrer
docker-compose restart

# Supprimer les volumes (données)
docker-compose down -v

# Voir l'IP du conteneur mosquitto
docker inspect pronote_network | grep -i gateway

# Tester la connexion MQTT
docker run -it --rm --network pronote_network eclipse-mosquitto mosquitto_sub -h mosquitto -u mqtt_user -P 'YOUR_MQTT_PASSWORD' -t 'pronote/#'

# Afficher la première heure actualisée
docker exec pronote_bot tail -f logs/emploi.json
```

## Intégration Home Assistant

Dans Home Assistant, configurez MQTT vers votre serveur Ubuntu:
- **Broker:** your_ubuntu_ip:1883
- **Username:** mqtt_user
- **Password:** YOUR_MQTT_PASSWORD

L'entité `sensor.pronote_heure` sera automatiquement créée.
