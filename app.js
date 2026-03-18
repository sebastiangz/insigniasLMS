'use strict';
// ─── src/app.js ──────────────────────────────────────────────────────────────
// Insignias UCol — Servidor de Mochila de Insignias Digitales
// Universidad de Colima — Educación Continua
//
// Entry point principal. Carga configuración, monta rutas y arranca servidor.
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const cors    = require('cors');

// Importar rutas
const discoveryRoutes    = require('./routes/discovery');
const oauthRoutes        = require('./routes/oauth');
const badgeConnectRoutes = require('./routes/badgeconnect');

const app  = express();
const PORT = process.env.PORT || 3100;

const INSTITUTION = process.env.INSTITUTION_NAME || 'Universidad de Colima';
const DEPARTMENT  = process.env.DEPARTMENT_NAME  || 'Educación Continua';

// ── CORS ─────────────────────────────────────────────────────────────────────
const moodleOrigin = process.env.MOODLE_ORIGIN || '';
const publicUrl    = process.env.PUBLIC_URL     || '';

app.use(cors({
  origin: (origin, cb) => {
    const allowed = [moodleOrigin, publicUrl, 'http://localhost:3100'];
    cb(null, allowed.includes(origin) || !origin);
  },
  methods:        ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials:    true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ── Body parser ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Rutas ────────────────────────────────────────────────────────────────────
app.use('/', discoveryRoutes);
app.use('/', oauthRoutes);
app.use('/', badgeConnectRoutes);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status:      'ok',
    service:     'Insignias UCol',
    institution: INSTITUTION,
    department:  DEPARTMENT,
    version:     '1.0.0',
    timestamp:   new Date().toISOString(),
    public_url:  publicUrl
  });
});

// ── Landing page ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Insignias UCol — Mochila de Insignias Digitales</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      background: linear-gradient(135deg, #003d7a 0%, #005a9c 100%);
      color: #fff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container { max-width: 600px; text-align: center; }
    .logo { font-size: 72px; margin-bottom: 20px; }
    h1 { font-size: 2rem; font-weight: 700; margin-bottom: 12px; }
    .subtitle {
      font-size: 1.1rem;
      opacity: 0.9;
      margin-bottom: 40px;
    }
    .card {
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 16px;
      padding: 28px;
      margin-bottom: 20px;
      text-align: left;
    }
    .card h2 {
      font-size: 1.2rem;
      margin-bottom: 12px;
      color: #fff;
    }
    .card p {
      font-size: 0.95rem;
      opacity: 0.85;
      line-height: 1.6;
    }
    .footer {
      font-size: 0.85rem;
      opacity: 0.7;
      margin-top: 32px;
    }
    a {
      color: #fff;
      text-decoration: underline;
      transition: opacity 0.2s;
    }
    a:hover { opacity: 0.8; }
    .badge {
      display: inline-block;
      background: rgba(255,255,255,0.15);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.75rem;
      margin: 4px 4px 0 0;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🎓</div>
    <h1>Insignias UCol</h1>
    <p class="subtitle">Mochila de Insignias Digitales</p>

    <div class="card">
      <h2>¿Qué es esto?</h2>
      <p>
        Este servidor almacena las <strong>insignias digitales</strong> que recibes
        en Moodle. Es compatible con el estándar internacional
        <strong>Open Badges 2.1</strong> y se integra automáticamente con tu
        plataforma educativa.
      </p>
      <p style="margin-top:12px;">
        <span class="badge">✓ Portable</span>
        <span class="badge">✓ Verificable</span>
        <span class="badge">✓ Open Source</span>
      </p>
    </div>

    <div class="card">
      <h2>Para estudiantes</h2>
      <p>
        Conecta tu mochila desde:<br>
        <strong>Moodle → Preferencias → Badges → Configuración de mochila</strong>
      </p>
      <p style="margin-top:12px;">
        Todas tus insignias ganadas se almacenarán aquí de forma segura.
        Podrás exportarlas y compartirlas con empleadores, otras universidades
        o plataformas profesionales.
      </p>
    </div>

    <div class="card">
      <h2>Estándares abiertos</h2>
      <p>
        Este servidor implementa <strong>Badge Connect® API</strong> (Open Badges 2.1),
        el estándar global para credenciales digitales desarrollado por IMS Global
        Learning Consortium (1EdTech).
      </p>
    </div>

    <div class="footer">
      <strong>${INSTITUTION}</strong> — ${DEPARTMENT}<br>
      Servidor de código abierto bajo licencia GPL-3.0<br><br>
      <a href="/health">Estado del servidor</a> •
      <a href="/.well-known/badgeconnect.json">Manifest (JSON)</a>
    </div>
  </div>
</body>
</html>`);
});

// ── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    result: { error: 'not_found', path: req.path }
  });
});

// ── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({
    status: 'error',
    result: { error: 'internal_server_error' }
  });
});

// ── Arranque ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                          ║');
  console.log('║   🎓  INSIGNIAS UCOL — Servidor de Mochila de Insignias Digitales       ║');
  console.log('║                                                                          ║');
  console.log(`║   Institución:  ${INSTITUTION.padEnd(57)}║`);
  console.log(`║   Departamento: ${DEPARTMENT.padEnd(57)}║`);
  console.log('║                                                                          ║');
  console.log(`║   Puerto:       ${PORT.toString().padEnd(57)}║`);
  console.log(`║   URL pública:  ${(publicUrl || '(no configurada)').padEnd(57)}║`);
  console.log(`║   Moodle:       ${(moodleOrigin || '(no configurada)').padEnd(57)}║`);
  console.log('║                                                                          ║');
  console.log('║   Endpoints Badge Connect® API:                                         ║');
  console.log('║     GET  /.well-known/badgeconnect.json                                  ║');
  console.log('║     POST /register                                                       ║');
  console.log('║     GET  /oauth/authorize                                                ║');
  console.log('║     POST /oauth/token                                                    ║');
  console.log('║     GET  /ob/v2p1/profile                                                ║');
  console.log('║     GET  /ob/v2p1/assertions                                             ║');
  console.log('║     POST /ob/v2p1/assertions                                             ║');
  console.log('║                                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`✓ Servidor iniciado correctamente`);
  console.log(`✓ Visita ${publicUrl || 'http://localhost:'+PORT} para verificar`);
  console.log('');
});

module.exports = app;
