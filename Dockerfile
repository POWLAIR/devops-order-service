# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
RUN npm ci

# Copier le code source
COPY . .

# Build de l'application
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Installer curl pour le healthcheck
RUN apk add --no-cache curl

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer uniquement les dépendances de production
RUN npm ci --only=production

# Copier les fichiers buildés depuis le stage builder
COPY --from=builder /app/dist ./dist

# Créer un répertoire pour la base de données
RUN mkdir -p /app/data

# Exposer le port
EXPOSE 3000

# Commande de démarrage
CMD ["npm", "run", "start:prod"]

