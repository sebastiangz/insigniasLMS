'use strict';
const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const { getDb } = require('../db/init');

const PUBLIC_URL = process.env.PUBLIC_URL;

// ── 1) Manifest ───────────────────────────────────────────────────────────────
router.get('/.well-known/badgeconnect.json', (req, res) => {
  res.json({
    '@context': 'https://purl.imsglobal.org/spec/ob/v2p1/context/badgeconnect_v2p1.jsonld',
    'badgeConnectAPI': [
      {
        'apiBase':          PUBLIC_URL,
        'name':             process.env.INSTITUTION_NAME || 'Backpack LMS',
        'image':            '',
        'registrationUrl':  `${PUBLIC_URL}/register`,
        'authorizationUrl': `${PUBLIC_URL}/oauth/authorize`,
        'tokenUrl':         `${PUBLIC_URL}/oauth/token`,
        'profileUrl':       `${PUBLIC_URL}/ob/v2p1/profile`,
        'assertionsUrl':    `${PUBLIC_URL}/ob/v2p1/assertions`,
        'collectionsUrl':   `${PUBLIC_URL}/ob/v2p1/collections`,
        'scopesOffered': [
          'https://purl.imsglobal.org/spec/ob/v2p1/scope/assertion.read',
          'https://purl.imsglobal.org/spec/ob/v2p1/scope/assertion.write',
          'https://purl.imsglobal.org/spec/ob/v2p1/scope/profile.read',
          'https://purl.imsglobal.org/spec/ob/v2p1/scope/profile.update'
        ]
      }
    ]
  });
});

// ── 2) Dynamic Client Registration ───────────────────────────────────────────
router.post('/register', (req, res) => {
  if (process.env.ALLOW_DYNAMIC_REGISTRATION !== 'true') {
    return res.status(403).json({
      error: 'registration_not_permitted',
      error_description: 'Dynamic registration is disabled.'
    });
  }

  const {
    redirect_uris  = [],
    client_name    = 'Unknown Consumer',
    software_id,
    software_version
  } = req.body || {};

  if (!Array.isArray(redirect_uris) || redirect_uris.length === 0) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'redirect_uris es requerido y debe ser un array no vacío.'
    });
  }

  const db            = getDb();
  const client_id     = crypto.randomBytes(16).toString('hex');
  const client_secret = crypto.randomBytes(32).toString('hex');

  db.prepare(`
    INSERT INTO oauth_clients (client_id, client_secret, redirect_uris, name)
    VALUES (?, ?, ?, ?)
  `).run(client_id, client_secret, JSON.stringify(redirect_uris), client_name);

  console.log(`[Registration] Nuevo cliente: ${client_name} → ${client_id}`);

  res.status(201).json({
    client_id,
    client_secret,
    redirect_uris,
    client_name,
    software_id:      software_id      || '',
    software_version: software_version || '1.0'
  });
});

module.exports = router;
