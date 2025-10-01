# Stage 1 : Build l'app
FROM node:18-alpine AS builder

WORKDIR /app

# Copie package et installe deps
COPY package*.json ./
RUN npm ci --only=production  # --only=prod pour petit image

# Copie le code source
COPY . .

# Stage 2 : Runtime (plus léger)
FROM node:18-alpine

WORKDIR /app

# Copie deps et code du builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app ./

# Expose le port
EXPOSE 3000

# Health check (optionnel)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node health.js || exit 1  # Si tu ajoutes un health.js simple plus tard

# Lance le serveur
CMD ["node", "server.js"]