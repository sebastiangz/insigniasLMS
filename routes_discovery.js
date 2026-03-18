'use strict';
// ─── src/routes/discovery.js ─────────────────────────────────────────────────
// 1) GET  /.well-known/badgeconnect.json   → Badge Connect manifest
// 2) POST /register                        → Dynamic Client Registration (RFC 7591)
//
// Moodle leyó los docs: cuando agrega un nuevo backpack con "Open Badges v2.1",
// primero descarga el manifest para conocer los endpoints, luego registra su
// client_id/secret mediante POST /register.
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const { getDb } = require('../db/init');

const PUBLIC_URL = process.env.PUBLIC_URL;

// ── 1) Manifest ──────────────────────────────────────────────────────────────
// Este JSON le dice a Moodle dónde están todos los endpoints del Badge Connect.
router.get('/.well-known/badgeconnect.json', (req, res) => {
  res.json({
    '@context':          'https://purl.imsglobal.org/spec/ob/v2p1/context/badgeconnect_v2p1.jsonld',
    'type':              'ServiceDescriptor',
    'apiBase':           PUBLIC_URL,

    // Endpoints obligatorios para un Host (Provider Read + Write)
    'registrationEndpoint':  `${PUBLIC_URL}/register`,
    'authorizationEndpoint': `${PUBLIC_URL}/oauth/authorize`,
    'tokenEndpoint':         `${PUBLIC_URL}/oauth/token`,
    'profileEndpoint':       `${PUBLIC_URL}/ob/v2p1/profile`,
    'assertionsEndpoint':    `${PUBLIC_URL}/ob/v2p1/assertions`,

    // Scopes que soportamos
    'scopesSupported': [
      'https://purl.imsglobal.org/spec/ob/v2p1/scope/assertion.read',
      'https://purl.imsglobal.org/spec/ob/v2p1/scope/assertion.write',
      'https://purl.imsglobal.org/spec/ob/v2p1/scope/profile.read',
      'https://purl.imsglobal.org/spec/ob/v2p1/scope/profile.update'
    ],

    // Grant types
    'grant_types_supported':   ['authorization_code'],
    'response_types_supported': ['code']
  });
});

// ── 2) Dynamic Client Registration ───────────────────────────────────────────
// Moodle envía un POST con sus datos y recibe un client_id + client_secret.
router.post('/register', (req, res) => {
  // Si el admin deshabilitó el registro dinámico, solo permitir desde localhost
  if (process.env.ALLOW_DYNAMIC_REGISTRATION !== 'true') {
    // En producción podrías verificar un token de admin aquí.
    // Por ahora bloqueamos.
    return res.status(403).json({
      error: 'registration_not_permitted',
      error_description: 'Dynamic registration is disabled. Register the client manually.'
    });
  }

  const {
    redirect_uris = [],
    client_name   = 'Unknown Consumer',
    software_id,
    software_version
  } = req.body || {};

  if (!Array.isArray(redirect_uris) || redirect_uris.length === 0) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'redirect_uris es requerido y debe ser un array no vacío.'
    });
  }

  const db = getDb();

  // Generar client_id y client_secret
  const client_id     = crypto.randomBytes(16).toString('hex');
  const client_secret = crypto.randomBytes(32).toString('hex');

  db.prepare(`
    INSERT INTO oauth_clients (client_id, client_secret, redirect_uris, name)
    VALUES (?, ?, ?, ?)
  `).run(client_id, client_secret, JSON.stringify(redirect_uris), client_name);

  console.log(`[Registration] Nuevo cliente registrado: ${client_name} → ${client_id}`);

  // RFC 7591: devolver el client_id y secret junto con los datos recibidos
  res.status(201).json({
    client_id,
    client_secret,
    redirect_uris,
    client_name,
    software_id:      software_id  || '',
    software_version: software_version || '1.0'
  });
});

module.exports = router;
