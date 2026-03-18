#!/usr/bin/env node
'use strict';
// ─── scripts/setup.js ────────────────────────────────────────────────────────
// Asistente de instalación interactivo.
// Uso:  npm run setup
// ─────────────────────────────────────────────────────────────────────────────

const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║   🎓  Backpack LMS — Asistente de Instalación                           ║
║   Open Badges 2.1 / Badge Connect®                                      ║
╚══════════════════════════════════════════════════════════════════════════╝
`);

(async function setup() {
  // URL pública
  console.log('1. URL PÚBLICA DEL SERVIDOR (con https://, sin trailing slash)\n');
  const publicUrl = (await ask('   URL pública [https://backpack.infraestructuragis.com]: ')
    || 'https://backpack.infraestructuragis.com').replace(/\/$/, '');

  if (!publicUrl.startsWith('http')) { console.error('❌ La URL debe comenzar con https://'); process.exit(1); }

  // URL de Moodle
  console.log('\n2. URL DEL LMS (Moodle)\n');
  const moodleUrl = (await ask('   URL del LMS [https://educacioncontinua.ucol.mx]: ')
    || 'https://educacioncontinua.ucol.mx').replace(/\/$/, '');

  // Puerto
  console.log('\n3. PUERTO INTERNO\n');
  const port = await ask('   Puerto [3600]: ') || '3600';

  // Ruta BD
  console.log('\n4. RUTA DE LA BASE DE DATOS SQLite\n');
  const dbPath = await ask('   Ruta [/home2/backpacklms/data/backpack.db]: ')
    || '/home2/backpacklms/data/backpack.db';

  // Información institucional
  console.log('\n5. INFORMACIÓN INSTITUCIONAL\n');
  const institutionName = await ask('   Nombre de la institución [Universidad de Colima]: ')
    || 'Universidad de Colima';
  const departmentName  = await ask('   Departamento [Educación Continua]: ')
    || 'Educación Continua';

  // JWT Secret
  const jwtSecret = crypto.randomBytes(48).toString('hex');
  console.log(`\n   ✓ JWT Secret generado automáticamente`);

  // Escribir .env
  const envPath = path.join(__dirname, '..', '.env');
  const envContent = `# Generado por npm run setup — ${new Date().toISOString()}

PORT=${port}
PUBLIC_URL=${publicUrl}
DB_PATH=${dbPath}
JWT_SECRET=${jwtSecret}
ACCESS_TOKEN_TTL=3600
REFRESH_TOKEN_TTL=2592000
ALLOW_DYNAMIC_REGISTRATION=true
MOODLE_ORIGIN=${moodleUrl}
INSTITUTION_NAME=${institutionName}
DEPARTMENT_NAME=${departmentName}
DEBUG_MODE=false
`;
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log(`\n   ✓ Archivo .env creado en: ${envPath}`);

  // Crear directorio de datos
  const dbDir = path.dirname(path.resolve(dbPath));
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`   ✓ Directorio de datos creado: ${dbDir}`);
  }

  console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║  ✅ CONFIGURACIÓN COMPLETADA                                             ║
╚══════════════════════════════════════════════════════════════════════════╝

Resumen:
  URL pública:  ${publicUrl}
  Moodle/LMS:   ${moodleUrl}
  Puerto:       ${port}
  Base de datos: ${dbPath}

Siguiente paso:
  npm start             (o: pm2 start src/app.js --name backpack-lms)

Verificar:
  curl http://localhost:${port}/health
`);
  rl.close();
})().catch(err => { console.error('❌', err.message); process.exit(1); });
