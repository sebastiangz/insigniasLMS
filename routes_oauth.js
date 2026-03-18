'use strict';
// ─── src/routes/oauth.js ─────────────────────────────────────────────────────
// GET  /oauth/authorize   → Muestra la pantalla de consentimiento al usuario.
//                            En un backpack real esto sería una página HTML con un
//                            formulario de login + botón "Allow".  Aquí, para
//                            simplificar, usamos un HTML inline que simula eso.
//                            En producción conectarías esto con el SSO de tu Moodle
//                            (o un login propio).
//
// POST /oauth/token       → Intercambia code→tokens  o  refresh_token→nuevos tokens.
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router  = express.Router();
const { v4 }  = require('uuid');
const { getDb } = require('../db/init');
const {
  createSession,
  exchangeCode,
  refreshSession,
  generateToken
} = require('../middleware/oauth');

// ── GET /oauth/authorize ─────────────────────────────────────────────────────
// Parámetros esperados (query string):
//   client_id     – identificador del Consumer (Moodle)
//   redirect_uri  – URL donde Moodle espera el callback con ?code=…
//   response_type – siempre "code"
//   scope         – scopes pedidos (space-separated)
//   state         – valor opaque que Moodle espera de vuelta (anti-CSRF)
//
// Flujo:
//   1. Verificar que client_id existe en la BD.
//   2. Mostrar pantalla de consentimiento (HTML simple).
//   3. Cuando el usuario confirma → crear sesión → redirigir a redirect_uri?code=…&state=…
// ─────────────────────────────────────────────────────────────────────────────
router.get('/oauth/authorize', (req, res) => {
  const { client_id, redirect_uri, response_type, scope, state } = req.query;

  // Validaciones básicas
  if (!client_id || !redirect_uri || response_type !== 'code') {
    return res.status(400).send(errorPage('Parámetros incompletos o inválidos.'));
  }

  const db     = getDb();
  const client = db.prepare('SELECT * FROM oauth_clients WHERE client_id = ?').get(client_id);

  if (!client) {
    return res.status(401).send(errorPage('client_id no reconocido.'));
  }

  // Verificar que redirect_uri está en la lista permitida del cliente
  const allowedRedirects = JSON.parse(client.redirect_uris || '[]');
  if (!allowedRedirects.includes(redirect_uri)) {
    return res.status(400).send(errorPage('redirect_uri no permitida para este cliente.'));
  }

  // ── Renderizar pantalla de consentimiento ──────────────────────────────────
  // En producción aquí meteras un login real o un iframe SSO.
  // Por ahora pedimos solo el email del estudiante (que identifica la cuenta
  // dentro del backpack) y un botón de "Permitir acceso".
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Conectar Mochila de Insignias</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #f1f5f9;
      padding: 20px;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 40px 36px;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 25px 50px rgba(0,0,0,.4);
    }
    .logo {
      text-align: center;
      margin-bottom: 28px;
    }
    .logo span {
      font-size: 42px;
    }
    h1 {
      font-size: 1.4rem;
      font-weight: 600;
      text-align: center;
      color: #f8fafc;
      margin-bottom: 8px;
    }
    .subtitle {
      text-align: center;
      color: #94a3b8;
      font-size: 0.85rem;
      margin-bottom: 28px;
    }
    label {
      display: block;
      font-size: 0.82rem;
      color: #94a3b8;
      margin-bottom: 6px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: .5px;
    }
    input[type=email], input[type=text] {
      width: 100%;
      padding: 12px 14px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      color: #f1f5f9;
      font-size: 0.95rem;
      outline: none;
      transition: border-color .2s;
    }
    input:focus { border-color: #3b82f6; }
    .scope-box {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 14px 16px;
      margin: 18px 0;
    }
    .scope-box p {
      font-size: 0.78rem;
      color: #64748b;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: .4px;
    }
    .scope-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 0;
      font-size: 0.82rem;
      color: #cbd5e1;
    }
    .scope-item .dot {
      width: 7px; height: 7px;
      border-radius: 50%;
      background: #3b82f6;
      flex-shrink: 0;
    }
    .btn-allow {
      width: 100%;
      padding: 13px;
      background: linear-gradient(135deg, #2563eb, #3b82f6);
      border: none;
      border-radius: 8px;
      color: #fff;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      margin-top: 8px;
      transition: filter .2s;
    }
    .btn-allow:hover { filter: brightness(1.12); }
    .footer {
      text-align: center;
      margin-top: 20px;
      font-size: 0.72rem;
      color: #475569;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo"><span>🎓</span></div>
    <h1>Conectar tu Mochila de Insignias</h1>
    <p class="subtitle">Universidad de Colima — Educación Continua</p>

    <form method="POST" action="/oauth/consent">
      <input type="hidden" name="client_id"     value="${esc(client_id)}">
      <input type="hidden" name="redirect_uri"  value="${esc(redirect_uri)}">
      <input type="hidden" name="scope"         value="${esc(scope || '')}">
      <input type="hidden" name="state"         value="${esc(state || '')}">

      <label for="email">Correo electrónico</label>
      <input type="email" id="email" name="email" placeholder="tu@correo.edu" required>

      <label for="display_name" style="margin-top:14px;">Nombre</label>
      <input type="text" id="display_name" name="display_name" placeholder="Juan Pérez" required>

      <div class="scope-box">
        <p>Permisos solicitados</p>
        ${buildScopeList(scope)}
      </div>

      <button class="btn-allow" type="submit">✓ Permitir acceso</button>
    </form>

    <div class="footer">
      Al permitir el acceso, tus insignias podrán ser vistas desde tu perfil en Moodle.<br>
      Puedes revocar el permiso en cualquier momento desde tu cuenta.
    </div>
  </div>
</body>
</html>`;

  res.send(html);
});

// ── POST /oauth/consent ──────────────────────────────────────────────────────
// Procesa el formulario de consentimiento. Crea/busca el usuario y emite el code.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/oauth/consent', (req, res) => {
  const { client_id, redirect_uri, scope, state, email, display_name } = req.body || {};

  if (!client_id || !redirect_uri || !email) {
    return res.status(400).send(errorPage('Datos incompletos.'));
  }

  const db = getDb();

  // Buscar o crear usuario por email
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    const id = uuid();
    db.prepare(`
      INSERT INTO users (id, email, display_name) VALUES (?, ?, ?)
    `).run(id, email, display_name || '');
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  } else if (display_name) {
    db.prepare('UPDATE users SET display_name = ?, updated_at = strftime("%s","now") WHERE id = ?')
      .run(display_name, user.id);
  }

  // Crear sesión OAuth
  const session = createSession(user.id, client_id, scope);

  // Redirigir al Consumer con code + state
  const sep   = redirect_uri.includes('?') ? '&' : '?';
  const url   = `${redirect_uri}${sep}code=${session.auth_code}&state=${encodeURIComponent(state || '')}`;

  console.log(`[Consent] Usuario ${user.email} autorizado → redirigiendo a Moodle`);
  res.redirect(302, url);
});

// ── POST /oauth/token ────────────────────────────────────────────────────────
// Soporta dos grant_type:
//   • authorization_code  → intercambia el code por access_token + refresh_token
//   • refresh_token       → emite nuevos tokens
// ─────────────────────────────────────────────────────────────────────────────
router.post('/oauth/token', (req, res) => {
  const { grant_type, code, refresh_token, client_id, client_secret, redirect_uri } = req.body || {};

  const db = getDb();

  // ── Autenticar al cliente ──────────────────────────────────────────────────
  // Moodle puede enviar las credenciales como Basic Auth o en el body.
  let resolvedClientId     = client_id;
  let resolvedClientSecret = client_secret;

  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Basic ')) {
    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString();
    const [cid, csec] = decoded.split(':');
    resolvedClientId     = cid;
    resolvedClientSecret = csec;
  }

  const client = db.prepare('SELECT * FROM oauth_clients WHERE client_id = ?').get(resolvedClientId);
  if (!client || client.client_secret !== resolvedClientSecret) {
    return res.status(401).json({
      error:             'invalid_client',
      error_description: 'client_id o client_secret incorrecto.'
    });
  }

  // ── grant_type: authorization_code ─────────────────────────────────────────
  if (grant_type === 'authorization_code') {
    if (!code) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'code es requerido.' });
    }

    const session = exchangeCode(code, resolvedClientId);
    if (!session) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Code inválido o ya usado.' });
    }

    const now = Math.floor(Date.now() / 1000);
    return res.json({
      access_token:  session.access_token,
      refresh_token: session.refresh_token,
      token_type:    'Bearer',
      expires_in:    session.access_expires - now,
      scope:         session.scope
    });
  }

  // ── grant_type: refresh_token ──────────────────────────────────────────────
  if (grant_type === 'refresh_token') {
    if (!refresh_token) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'refresh_token es requerido.' });
    }

    const updated = refreshSession(refresh_token);
    if (!updated) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'refresh_token expirado o inválido.' });
    }

    const now = Math.floor(Date.now() / 1000);
    return res.json({
      access_token:  updated.access_token,
      refresh_token: updated.refresh_token,
      token_type:    'Bearer',
      expires_in:    updated.access_expires - now,
      scope:         updated.scope
    });
  }

  // ── grant_type no soportado ────────────────────────────────────────────────
  return res.status(400).json({
    error:             'unsupported_grant_type',
    error_description: `grant_type "${grant_type}" no soportado.`
  });
});

// ─── Utilidades ──────────────────────────────────────────────────────────────

function esc (s) {
  return String(s || '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

function uuid () {
  return require('uuid').v4();
}

function buildScopeList (scope) {
  const labels = {
    'https://purl.imsglobal.org/spec/ob/v2p1/scope/assertion.read':   'Leer tus insignias',
    'https://purl.imsglobal.org/spec/ob/v2p1/scope/assertion.write':  'Agregar insignias a tu mochila',
    'https://purl.imsglobal.org/spec/ob/v2p1/scope/profile.read':     'Leer tu perfil',
    'https://purl.imsglobal.org/spec/ob/v2p1/scope/profile.update':   'Actualizar tu perfil'
  };

  return (scope || '').split(/\s+/).filter(Boolean).map(s =>
    `<div class="scope-item"><span class="dot"></span>${esc(labels[s] || s)}</div>`
  ).join('');
}

function errorPage (msg) {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>Error</title>
<style>
  body { font-family: system-ui; background:#0f172a; color:#f1f5f9;
         display:flex; align-items:center; justify-content:center; min-height:100vh; }
  .box { background:#1e293b; border-radius:12px; padding:40px; max-width:400px; text-align:center; }
  h1 { color:#ef4444; margin-bottom:12px; }
</style></head><body>
<div class="box"><h1>⚠️ Error</h1><p>${esc(msg)}</p></div>
</body></html>`;
}

module.exports = router;
