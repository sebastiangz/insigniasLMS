#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# organize.sh — Script de organización de archivos para Insignias UCol
#
# Uso:
#   1. Descarga todos los archivos de Claude a una carpeta
#   2. Copia este script (organize.sh) a esa misma carpeta
#   3. Ejecuta:  bash organize.sh
#
# El script creará la estructura correcta y moverá cada archivo a su lugar.
# ─────────────────────────────────────────────────────────────────────────────

set -e  # Salir si hay error

echo ""
echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                          ║"
echo "║   🎓  INSIGNIAS UCOL — Organizador de Archivos                          ║"
echo "║                                                                          ║"
echo "║   Este script organizará los archivos descargados en la estructura      ║"
echo "║   correcta para ejecutar npm install y npm run setup.                   ║"
echo "║                                                                          ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo ""

# Verificar que estamos en la carpeta correcta
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encuentra package.json en esta carpeta."
    echo ""
    echo "   Por favor ejecuta este script desde la carpeta donde descargaste"
    echo "   todos los archivos de Claude."
    echo ""
    exit 1
fi

echo "📁 Creando estructura de directorios..."

# Crear estructura
mkdir -p src/db
mkdir -p src/middleware
mkdir -p src/routes
mkdir -p scripts
mkdir -p data
mkdir -p docs

echo "   ✓ Directorios creados"

echo ""
echo "📦 Organizando archivos..."

# Función para mover archivo con verificación
move_file() {
    local source="$1"
    local dest="$2"
    
    if [ -f "$source" ]; then
        mv "$source" "$dest"
        echo "   ✓ $source → $dest"
        return 0
    else
        echo "   ⚠️  No encontrado: $source (omitiendo)"
        return 1
    fi
}

# Organizar archivos del core
move_file "db_init.js" "src/db/init.js"
move_file "middleware_oauth.js" "src/middleware/oauth.js"
move_file "routes_discovery.js" "src/routes/discovery.js"
move_file "routes_oauth.js" "src/routes/oauth.js"
move_file "routes_badgeconnect.js" "src/routes/badgeconnect.js"

# El app.js puede tener varios nombres dependiendo de cómo lo descargaste
if [ -f "app.js" ]; then
    move_file "app.js" "src/app.js"
elif [ -f "insignias-ucol_app.js" ]; then
    move_file "insignias-ucol_app.js" "src/app.js"
elif [ ! -f "src/app.js" ]; then
    echo "   ❌ Error: No se encuentra app.js. Asegúrate de haberlo descargado."
    exit 1
fi

# Script de setup
if [ -f "setup.js" ]; then
    move_file "setup.js" "scripts/setup.js"
elif [ -f "insignias-ucol_setup.js" ]; then
    move_file "insignias-ucol_setup.js" "scripts/setup.js"
fi

# Documentación
if [ -f "README.md" ]; then
    # Si hay un README con prefijo, usar ese
    if [ -f "insignias-ucol_README.md" ]; then
        move_file "insignias-ucol_README.md" "README.md"
        rm -f "README.md.bak" 2>/dev/null
    fi
else
    move_file "insignias-ucol_README.md" "README.md" 2>/dev/null || true
fi

move_file "INSTALACION.md" "docs/INSTALACION.md" 2>/dev/null || true
move_file "ESTRUCTURA.md" "docs/ESTRUCTURA.md" 2>/dev/null || true
move_file "INICIO_RAPIDO.md" "docs/INICIO_RAPIDO.md" 2>/dev/null || true

# Configuración
# .env.example debe quedarse en la raíz
if [ ! -f ".env.example" ]; then
    echo "   ⚠️  .env.example no encontrado"
fi

# package.json debe estar en la raíz (ya debería estar)
if [ ! -f "package.json" ]; then
    echo "   ❌ Error: package.json no encontrado"
    exit 1
fi

echo ""
echo "🔧 Configurando permisos..."

# Dar permisos de ejecución
chmod +x scripts/setup.js 2>/dev/null || true
chmod 755 src/app.js

echo "   ✓ Permisos configurados"

echo ""
echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                          ║"
echo "║  ✅ ORGANIZACIÓN COMPLETADA                                              ║"
echo "║                                                                          ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📂 Estructura resultante:"
echo ""

# Mostrar árbol (si tree está instalado, si no, usar ls)
if command -v tree &> /dev/null; then
    tree -L 2 -I 'node_modules|data' --dirsfirst
else
    echo "insignias-ucol/"
    echo "├── package.json"
    echo "├── .env.example"
    echo "├── README.md"
    echo "├── scripts/"
    echo "│   └── setup.js"
    echo "├── docs/"
    echo "│   └── (documentación)"
    echo "└── src/"
    echo "    ├── app.js"
    echo "    ├── db/"
    echo "    │   └── init.js"
    echo "    ├── middleware/"
    echo "    │   └── oauth.js"
    echo "    └── routes/"
    echo "        ├── discovery.js"
    echo "        ├── oauth.js"
    echo "        └── badgeconnect.js"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📌 SIGUIENTES PASOS:"
echo ""
echo "  1️⃣  Instalar dependencias:"
echo "      npm install"
echo ""
echo "  2️⃣  Configurar el servidor:"
echo "      npm run setup"
echo ""
echo "  3️⃣  Arrancar el servidor:"
echo "      npm start                          (modo simple)"
echo "      npm run dev                        (desarrollo con auto-reload)"
echo "      pm2 start src/app.js --name insignias-ucol   (producción)"
echo ""
echo "  4️⃣  Verificar:"
echo "      curl http://localhost:3100/health"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📖 Para más información, consulta:"
echo "   • README.md              — Documentación completa"
echo "   • docs/INSTALACION.md    — Guía de instalación paso a paso"
echo "   • docs/INICIO_RAPIDO.md  — Comandos esenciales"
echo ""
echo "🎓 Insignias UCol — Universidad de Colima"
echo ""
