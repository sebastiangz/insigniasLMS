# ═════════════════════════════════════════════════════════════════════════════
# Dockerfile para Servidor Mochila Insignias LMS
# Multi-stage build para imagen optimizada
# ═════════════════════════════════════════════════════════════════════════════

# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

LABEL maintainer="sgonzalez@infraestructuragis.com"
LABEL description="Open Badges 2.1 Backpack Server"

WORKDIR /build

# Copiar solo package.json primero (cache de dependencias)
COPY package*.json ./

# Instalar dependencias (incluyendo devDependencies para build)
RUN npm ci --only=production && \
    npm cache clean --force

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:22-alpine

# Metadata
LABEL org.opencontainers.image.title="Insignias LMS Backpack"
LABEL org.opencontainers.image.description="Open Badges 2.1 Badge Connect Server"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.vendor="Universidad de Colima"

# Instalar dependencias del sistema
RUN apk add --no-cache \
    sqlite \
    dumb-init \
    curl

# Crear usuario no-root
RUN addgroup -g 1001 -S backpack && \
    adduser -u 1001 -S backpack -G backpack

# Directorio de trabajo
WORKDIR /app

# Copiar dependencias desde builder
COPY --from=builder /build/node_modules ./node_modules

# Copiar código de la aplicación
COPY --chown=backpack:backpack . .

# Crear directorio para la base de datos
RUN mkdir -p /app/data && \
    chown -R backpack:backpack /app/data

# Cambiar a usuario no-root
USER backpack

# Variables de entorno por defecto
ENV NODE_ENV=production \
    PORT=3100 \
    DB_PATH=/app/data/backpack.db

# Exponer puerto
EXPOSE 3100

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Usar dumb-init para manejo correcto de señales
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Comando por defecto
CMD ["node", "src/app.js"]
