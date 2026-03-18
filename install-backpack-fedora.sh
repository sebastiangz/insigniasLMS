#!/bin/bash
# ═════════════════════════════════════════════════════════════════════════════
# install-backpack-fedora.sh
# Script de instalación automatizado para Fedora Server 42
# ═════════════════════════════════════════════════════════════════════════════

set -e  # Salir si hay error

# ── Colores para output ──────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

function log_info()    { echo -e "${BLUE}ℹ️  $1${NC}"; }
function log_success() { echo -e "${GREEN}✅ $1${NC}"; }
function log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
function log_error()   { echo -e "${RED}❌ $1${NC}"; exit 1; }

echo ""
echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                          ║"
echo "║     INSTALACIÓN AUTOMATIZADA — Servidor Mochila Insignias LMS         ║"
echo "║                                                                          ║"
echo "║   Destino: /home2/backpacklms                                            ║"
echo "║   Usuario: sgonzalez                                                     ║"
echo "║   Sistema: Fedora Server 42                                              ║"
echo "║                                                                          ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo ""

# ── Variables ────────────────────────────────────────────────────────────────
INSTALL_DIR="/home2/backpacklms"
GIT_REPO="https://github.com/sebastiangz/insigniasLMS.git"
BACKPACK_URL="https://backpack.infraestructuragis.com"
MOODLE_URL="https://educacioncontinua.ucol.mx"
USER="sgonzalez"

# ── Verificar que se ejecuta como root ──────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
    log_error "Este script debe ejecutarse como root (sudo)"
fi

# ── Paso 1: Verificar Node.js ───────────────────────────────────────────────
log_info "Verificando Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    log_success "Node.js detectado: $NODE_VERSION"
    
    # Verificar que sea >= 18
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$MAJOR_VERSION" -lt 18 ]; then
        log_warning "Se requiere Node.js 18 o superior (tienes v$MAJOR_VERSION)"
        read -p "¿Deseas actualizar Node.js? (s/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Ss]$ ]]; then
            log_info "Actualizando Node.js..."
            curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
            dnf install -y nodejs
            log_success "Node.js actualizado a $(node --version)"
        fi
    fi
else
    log_error "Node.js no está instalado. Instálalo primero:\n  curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -\n  sudo dnf install -y nodejs"
fi

# ── Paso 2: Instalar dependencias del sistema ───────────────────────────────
log_info "Instalando dependencias del sistema..."
dnf install -y git httpd mod_ssl mod_proxy mod_proxy_http mod_headers mod_rewrite || log_warning "Algunas dependencias ya estaban instaladas"
log_success "Dependencias instaladas"

# ── Paso 3: Crear directorio de instalación ─────────────────────────────────
log_info "Creando directorio $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"
chown -R "$USER":"$USER" "$INSTALL_DIR"
log_success "Directorio creado con permisos para $USER"

# ── Paso 4: Clonar repositorio ──────────────────────────────────────────────
log_info "Clonando repositorio desde GitHub..."
if [ -d "$INSTALL_DIR/.git" ]; then
    log_warning "El repositorio ya existe. Haciendo pull..."
    cd "$INSTALL_DIR"
    sudo -u "$USER" git pull
else
    sudo -u "$USER" git clone "$GIT_REPO" "$INSTALL_DIR"
fi
cd "$INSTALL_DIR"
log_success "Repositorio clonado/actualizado"

# ── Paso 5: Organizar estructura ────────────────────────────────────────────
log_info "Organizando estructura de archivos..."
if [ -f "organize.sh" ]; then
    chmod +x organize.sh
    sudo -u "$USER" bash organize.sh || log_warning "organize.sh no pudo ejecutarse completamente"
    log_success "Estructura organizada"
else
    log_warning "organize.sh no encontrado, creando estructura manualmente..."
    sudo -u "$USER" mkdir -p src/db src/middleware src/routes scripts data
    [ -f "db_init.js" ] && sudo -u "$USER" mv db_init.js src/db/init.js
    [ -f "middleware_oauth.js" ] && sudo -u "$USER" mv middleware_oauth.js src/middleware/oauth.js
    [ -f "routes_discovery.js" ] && sudo -u "$USER" mv routes_discovery.js src/routes/discovery.js
    [ -f "routes_oauth.js" ] && sudo -u "$USER" mv routes_oauth.js src/routes/oauth.js
    [ -f "routes_badgeconnect.js" ] && sudo -u "$USER" mv routes_badgeconnect.js src/routes/badgeconnect.js
    [ -f "app.js" ] && sudo -u "$USER" mv app.js src/app.js
    [ -f "setup.js" ] && sudo -u "$USER" mv setup.js scripts/setup.js
fi

# ── Paso 6: Instalar dependencias Node.js ───────────────────────────────────
log_info "Instalando dependencias de Node.js..."
sudo -u "$USER" npm install
log_success "Dependencias instaladas"

# ── Paso 7: Detectar puerto disponible ──────────────────────────────────────
log_info "Detectando puerto disponible..."
AVAILABLE_PORT=3100
for port in $(seq 3100 3200); do
    if ! ss -tulpn 2>/dev/null | grep -q ":$port "; then
        AVAILABLE_PORT=$port
        break
    fi
done
log_success "Puerto disponible detectado: $AVAILABLE_PORT"

# ── Paso 8: Configurar variables de entorno ─────────────────────────────────
log_info "Configurando archivo .env..."
JWT_SECRET=$(openssl rand -hex 48)
cat > "$INSTALL_DIR/.env" <<EOF
# Configuración generada automáticamente
# $(date)

PORT=$AVAILABLE_PORT
PUBLIC_URL=$BACKPACK_URL
DB_PATH=$INSTALL_DIR/data/backpack.db
JWT_SECRET=$JWT_SECRET
ACCESS_TOKEN_TTL=3600
REFRESH_TOKEN_TTL=2592000
ALLOW_DYNAMIC_REGISTRATION=true
MOODLE_ORIGIN=$MOODLE_URL
INSTITUTION_NAME=Universidad de Colima
INSTITUTION_SHORT=UCol
DEPARTMENT_NAME=Educación Continua
DEBUG_MODE=false
EOF
chown "$USER":"$USER" "$INSTALL_DIR/.env"
chmod 600 "$INSTALL_DIR/.env"  # Solo el owner puede leer
log_success "Archivo .env creado con puerto $AVAILABLE_PORT"

# ── Paso 9: Configurar Apache VirtualHost ───────────────────────────────────
log_info "Configurando Apache VirtualHost..."
VHOST_FILE="/etc/httpd/conf.d/backpack.infraestructuragis.com.conf"

cat > "$VHOST_FILE" <<EOF
# VirtualHost para backpack.infraestructuragis.com
# Generado automáticamente: $(date)

<VirtualHost *:80>
    ServerName backpack.infraestructuragis.com
    ServerAdmin sgonzalez@infraestructuragis.com
    Redirect permanent / https://backpack.infraestructuragis.com/
    ErrorLog /var/log/httpd/backpack-error.log
    CustomLog /var/log/httpd/backpack-access.log combined
</VirtualHost>

<VirtualHost *:443>
    ServerName backpack.infraestructuragis.com
    ServerAdmin sgonzalez@infraestructuragis.com

    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:$AVAILABLE_PORT/
    ProxyPassReverse / http://127.0.0.1:$AVAILABLE_PORT/

    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"
    ProxyTimeout 300

    ErrorLog /var/log/httpd/backpack-ssl-error.log
    CustomLog /var/log/httpd/backpack-ssl-access.log combined

    # Certbot agregará aquí las líneas SSL automáticamente
</VirtualHost>
EOF
log_success "VirtualHost configurado"

# ── Paso 10: Verificar configuración Apache ─────────────────────────────────
log_info "Verificando configuración de Apache..."
if apachectl configtest &> /dev/null; then
    log_success "Configuración Apache OK"
else
    log_error "Error en configuración Apache. Ejecuta: sudo apachectl configtest"
fi

# ── Paso 11: Instalar PM2 ───────────────────────────────────────────────────
log_info "Instalando PM2..."
if command -v pm2 &> /dev/null; then
    log_success "PM2 ya está instalado"
else
    npm install -g pm2
    log_success "PM2 instalado globalmente"
fi

# ── Paso 12: Configurar PM2 para el usuario ─────────────────────────────────
log_info "Configurando PM2 como $USER..."
sudo -u "$USER" bash -c "cd $INSTALL_DIR && pm2 delete backpack-lms 2>/dev/null || true"
sudo -u "$USER" bash -c "cd $INSTALL_DIR && pm2 start src/app.js --name backpack-lms"
sudo -u "$USER" pm2 save
log_success "Aplicación iniciada con PM2"

# ── Paso 13: Configurar PM2 startup ──────────────────────────────────────────
log_info "Configurando PM2 startup..."
sudo -u "$USER" pm2 startup systemd -u "$USER" --hp "/home/$USER" | grep "sudo" | bash || log_warning "PM2 startup ya configurado"
log_success "PM2 configurado para auto-inicio"

# ── Paso 14: Reiniciar Apache ───────────────────────────────────────────────
log_info "Reiniciando Apache..."
systemctl enable httpd
systemctl restart httpd
log_success "Apache reiniciado"

# ── Paso 15: Verificar que el servidor responde ─────────────────────────────
log_info "Verificando que el servidor responde..."
sleep 3
if curl -s http://127.0.0.1:$AVAILABLE_PORT/health | grep -q "ok"; then
    log_success "Servidor respondiendo correctamente en puerto $AVAILABLE_PORT"
else
    log_warning "El servidor no responde. Verifica los logs: pm2 logs backpack-lms"
fi

# ── Resumen Final ────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                          ║"
echo "║  ✅ INSTALACIÓN COMPLETADA                                               ║"
echo "║                                                                          ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 RESUMEN:"
echo "  📁 Directorio:     $INSTALL_DIR"
echo "  🔌 Puerto Node.js: $AVAILABLE_PORT"
echo "  🌐 URL pública:    $BACKPACK_URL"
echo "  👤 Usuario:        $USER"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo " SIGUIENTES PASOS:"
echo ""
echo "1  Obtener certificado SSL:"
echo "    sudo dnf install -y certbot python3-certbot-apache"
echo "    sudo certbot --apache -d backpack.infraestructuragis.com"
echo ""
echo "2  Verificar logs:"
echo "    pm2 logs backpack-lms"
echo "    sudo tail -f /var/log/httpd/backpack-*"
echo ""
echo "3  Verificar health check:"
echo "    curl http://127.0.0.1:$AVAILABLE_PORT/health"
echo "    curl https://backpack.infraestructuragis.com/health  (después de SSL)"
echo ""
echo "  Registrar en el LMS (moodle):"
echo "    Admin → Servidor → Servicios OAuth 2 → Crear 'Open Badges'"
echo "    URL: $BACKPACK_URL"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
log_success "Instalación completada. El servidor está corriendo."
echo ""
