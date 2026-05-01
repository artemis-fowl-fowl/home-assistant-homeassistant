FROM node:18-slim

WORKDIR /app

# Installer dépendances système pour Puppeteer et Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copier les fichiers package
COPY package*.json ./

# Installer les dépendances Node
RUN npm install --production

# Copier le code de l'app
COPY bot.js .
COPY emploi.json .

# Variables d'environnement pour Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

# Lancer le bot
CMD ["node", "bot.js"]
