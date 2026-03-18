#!/usr/bin/env node
'use strict';
// ─── scripts/setup.js ────────────────────────────────────────────────────────
// Script de instalación interactivo para Insignias UCol.
// Uso:  npm run setup
// ─────────────────────────────────────────────────────────────────────────────

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
  input:  process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║   🎓  INSIGNIAS UCOL — Asistente de Instalación                         ║
║                                                                          ║
║   Universidad de Colima — Educación Continua                            ║
║   Servidor de Mochila de Insignias Digitales (Open Badges 2.1)          ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
`);

(async function setup() {
  console.log('Este asistente te ayudará a configurar el servidor.\n');

  // ── Paso 1: URL pública ────────────────────────────────────────────────────
  console.log('1. URL PÚBLICA DEL SERVIDOR');
  console.log('   Esta es la URL donde estará accesible el servidor de insignias.');
  console.log('   Debe incluir https:// y ser accesible desde Internet.\n');
  
  const publicUrl = await ask('   URL pública [https://insignias.educacioncontinua.ucol.mx]: ') 
    || 'https://insignias.educacioncontinua.ucol.mx';

  if (!publicUrl.startsWith('http')) {
    console.log('\n   ⚠️  La URL debe comenzar con https:// (o http:// solo para desarrollo local).');
    process.exit(1);
  }

  // ── Paso 2: URL de Moodle ──────────────────────────────────────────────────
  console.log('\n2. URL DE MOODLE');
  console.log('   La URL de tu instalación de Moodle.\n');
  
  const moodleUrl = await ask('   URL de Moodle [https://educacioncontinua.ucol.mx]: ')
    || 'https://educacioncontinua.ucol.mx';

  if (!moodleUrl.startsWith('http')) {
    console.log('\n   ⚠️  La URL debe comenzar con https:// (o http:// para desarrollo local).');
    process.exit(1);
  }

  // ── Paso 3: Puerto ─────────────────────────────────────────────────────────
  console.log('\n3. PUERTO DEL SERVIDOR');
  console.log('   Puerto en el que escuchará el servidor Node.js.');
  console.log('   Si usas Nginx/Apache como proxy, este puerto debe ser interno.\n');
  
  const port = await ask('   Puerto [3100]: ') || '3100';

  if (isNaN(port) || port < 1 || port > 65535) {
    console.log('\n   ⚠️  El puerto debe ser un número entre 1 y 65535.');
    process.exit(1);
  }

  // ── Paso 4: Ruta de base de datos ─────────────────────────────────────────
  console.log('\n4. RUTA DE BASE DE DATOS SQLite');
  console.log('   El archivo se creará automáticamente si no existe.\n');
  
  const dbPath = await ask('   Ruta [./data/backpack.db]: ') || './data/backpack.db';

  // ── Paso 5: Configuración avanzada ────────────────────────────────────────
  console.log('\n5. CONFIGURACIÓN AVANZADA');
  console.log('   Puedes dejar los valores por defecto o personalizarlos.\n');
  
  const institutionName = await ask('   Nombre de la institución [Universidad de Colima]: ')
    || 'Universidad de Colima';
  
  const departmentName = await ask('   Departamento [Educación Continua]: ')
    || 'Educación Continua';
  
  const debugMode = (await ask('   ¿Habilitar modo debug? (si/no) [no]: ') || 'no')
    .toLowerCase().startsWith('s') ? 'true' : 'false';

  // ── Paso 6: Generar JWT_SECRET ────────────────────────────────────────────
  console.log('\n6. GENERANDO SECRETO JWT...');
  const jwtSecret = crypto.randomBytes(48).toString('hex');
  console.log(`   ✓ Secreto generado (${jwtSecret.slice(0, 20)}...)`);

  // ── Paso 7: Escribir .env ──────────────────────────────────────────────────
  console.log('\n7. CREANDO ARCHIVO .env...');

  const now = new Date().toISOString();
  const envContent = `# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  INSIGNIAS UCOL — Configuración del Servidor                            ║
# ║  Generado automáticamente: ${now.padEnd(42)}║
# ╚══════════════════════════════════════════════════════════════════════════╝

# ─── Servidor ─────────────────────────────────────────────────────────────
PORT=${port}

# ─── URL pública (SIN trailing slash) ─────────────────────────────────────
PUBLIC_URL=${publicUrl.replace(/\/$/, '')}

# ─── Base de datos ────────────────────────────────────────────────────────
DB_PATH=${dbPath}

# ─── Seguridad OAuth 2 / JWT ──────────────────────────────────────────────
JWT_SECRET=${jwtSecret}
ACCESS_TOKEN_TTL=3600
REFRESH_TOKEN_TTL=2592000

# ─── Registro de clientes OAuth ──────────────────────────────────────────
ALLOW_DYNAMIC_REGISTRATION=true

# ─── CORS: origen permitido ──────────────────────────────────────────────
MOODLE_ORIGIN=${moodleUrl.replace(/\/$/, '')}

# ─── Información institucional ────────────────────────────────────────────
INSTITUTION_NAME=${institutionName}
INSTITUTION_SHORT=UCol
DEPARTMENT_NAME=${departmentName}

# ─── Logs y debug ─────────────────────────────────────────────────────────
DEBUG_MODE=${debugMode}
`;

  const envPath = path.join(__dirname, '..', '.env');
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('   ✓ Archivo .env creado en:', envPath);

  // ── Paso 8: Crear carpeta de datos ────────────────────────────────────────
  const dbDir = path.dirname(path.resolve(dbPath));
  
  console.log('\n8. CREANDO DIRECTORIO DE DATOS...');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`   ✓ Directorio creado: ${dbDir}`);
  } else {
    console.log(`   ✓ Directorio ya existe: ${dbDir}`);
  }

  // ── Resumen ────────────────────────────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║  ✓✓✓ INSTALACIÓN COMPLETADA EXITOSAMENTE ✓✓✓                            ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝

📋 RESUMEN DE CONFIGURACIÓN:

  🌐 URL pública:       ${publicUrl}
  📚 Moodle:            ${moodleUrl}
  🔌 Puerto:            ${port}
  💾 Base de datos:     ${dbPath}
  🏛️  Institución:       ${institutionName}
  🔐 JWT Secret:        ✓ generado (${jwtSecret.length} caracteres)
  🐛 Debug mode:        ${debugMode === 'true' ? 'ACTIVADO' : 'desactivado'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 SIGUIENTES PASOS:

  1️⃣  Arrancar el servidor:

      npm start              (modo producción)
      npm run dev            (modo desarrollo con auto-reload)

      O con PM2 (recomendado para producción):

      npm install -g pm2
      pm2 start src/app.js --name insignias-ucol
      pm2 save
      pm2 startup

  2️⃣  Verificar que funciona:

      curl http://localhost:${port}/health

      Deberías ver:  {"status":"ok","service":"Insignias UCol",...}

  3️⃣  Configurar Nginx como proxy reverso:

      Consulta la sección "Configurar Nginx" en README.md

  4️⃣  Registrar el backpack en Moodle:

      → Administración del sitio → Servidor → Servicios OAuth 2
      → Crear servicio "Open Badges" con URL: ${publicUrl}

      → Administración del sitio → Badges → Gestionar mochila
      → Agregar nueva mochila:
         • Backpack URL: ${publicUrl}
         • API URL: ${publicUrl}
         • Versión: Open Badges v2.1
         • OAuth 2: (seleccionar el servicio creado arriba)

  5️⃣  Probar desde un estudiante:

      → Moodle → Preferencias → Badges → Configuración de mochila
      → Seleccionar "Insignias UCol"
      → Clic en "Conectar"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📖 Para más información, consulta:
   • README.md        — Documentación técnica completa
   • INSTALACION.md   — Guía de instalación detallada
   • ESTRUCTURA.md    — Organización de archivos

🆘 Soporte:
   • Health check: ${publicUrl}/health
   • Manifest: ${publicUrl}/.well-known/badgeconnect.json
   • Logs: pm2 logs insignias-ucol

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎓 Insignias UCol — Universidad de Colima
   Servidor de Mochila de Insignias Digitales (Open Badges 2.1)

`);

  rl.close();
})().catch(err => {
  console.error('\n❌ Error durante la instalación:', err.message);
  process.exit(1);
});
