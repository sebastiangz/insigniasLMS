'use strict';
// ─── src/routes/badgeconnect.js ──────────────────────────────────────────────
// Badge Connect® API — endpoints protegidos con Bearer token:
//   GET    /ob/v2p1/profile
//   PUT    /ob/v2p1/profile
//   GET    /ob/v2p1/assertions
//   POST   /ob/v2p1/assertions
//   DELETE /ob/v2p1/assertions/:id
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router  = express.Router();
const { v4 }  = require('uuid');
const { getDb }         = require('../db/init');
const { requireBearer } = require('../middleware/oauth');

router.use(requireBearer);

// ── GET /ob/v2p1/profile ─────────────────────────────────────────────────────
router.get('/ob/v2p1/profile', (req, res) => {
  const db   = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.oauthSession.user_id);

  if (!user) {
    return res.status(404).json(envelope('error', { error: 'user_not_found' }));
  }

  res.json(envelope('success', {
    id:          user.id,
    email:       user.email,
    displayName: user.display_name || '',
    image:       null
  }));
});

// ── PUT /ob/v2p1/profile ─────────────────────────────────────────────────────
router.put('/ob/v2p1/profile', (req, res) => {
  const db              = getDb();
  const { displayName, email } = req.body || {};
  const userId          = req.oauthSession.user_id;
  const updates         = [];
  const params          = [];

  if (displayName !== undefined) { updates.push('display_name = ?'); params.push(displayName); }
  if (email !== undefined)       { updates.push('email = ?');        params.push(email); }

  if (updates.length === 0) {
    return res.status(400).json(envelope('error', { error: 'nothing_to_update' }));
  }

  updates.push('updated_at = strftime("%s","now")');
  params.push(userId);

  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  res.json(envelope('success', {
    id:          user.id,
    email:       user.email,
    displayName: user.display_name || ''
  }));
});

// ── GET /ob/v2p1/assertions ──────────────────────────────────────────────────
router.get('/ob/v2p1/assertions', (req, res) => {
  const db     = getDb();
  const userId = req.oauthSession.user_id;
  const limit  = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;

  const total = db.prepare(
    'SELECT COUNT(*) as cnt FROM assertions WHERE user_id = ? AND revoked = 0'
  ).get(userId).cnt;

  const rows = db.prepare(
    'SELECT * FROM assertions WHERE user_id = ? AND revoked = 0 ORDER BY imported_at DESC LIMIT ? OFFSET ?'
  ).all(userId, limit, offset);

  const assertions = rows.map(r => {
    try      { return JSON.parse(r.baked_data); }
    catch(e) { return { id: r.assertion_url }; }
  });

  if (offset + limit < total) {
    const nextOffset = offset + limit;
    res.set('Link', `<${process.env.PUBLIC_URL}/ob/v2p1/assertions?limit=${limit}&offset=${nextOffset}>; rel="next"`);
  }

  res.json(envelope('success', { result: assertions, total, limit, offset }));
});

// ── POST /ob/v2p1/assertions ─────────────────────────────────────────────────
router.post('/ob/v2p1/assertions', async (req, res) => {
  const db     = getDb();
  const userId = req.oauthSession.user_id;
  const { assertion } = req.body || {};

  if (!assertion) {
    return res.status(400).json(envelope('error', {
      error: 'invalid_request',
      error_description: 'El campo "assertion" es requerido.'
    }));
  }

  let assertionData;
  let assertionUrl;

  if (typeof assertion === 'string') {
    assertionUrl = assertion;
    try {
      assertionData = await fetchAssertion(assertionUrl);
    } catch (err) {
      console.error('[POST assertions] Error fetching assertion:', err.message);
      return res.status(502).json(envelope('error', {
        error: 'upstream_error',
        error_description: `No se pudo obtener la assertion desde ${assertionUrl}: ${err.message}`
      }));
    }
  } else if (typeof assertion === 'object') {
    assertionData = assertion;
    assertionUrl  = assertion.id || assertion.uid || '';
  } else {
    return res.status(400).json(envelope('error', {
      error: 'invalid_request',
      error_description: '"assertion" debe ser una URL (string) u objeto JSON.'
    }));
  }

  if (!assertionData || (!assertionData.type && !assertionData.uid)) {
    return res.status(400).json(envelope('error', {
      error: 'invalid_assertion',
      error_description: 'El JSON no parece ser una Assertion Open Badges válida.'
    }));
  }

  // Deduplicar
  const existing = db.prepare(
    'SELECT id FROM assertions WHERE user_id = ? AND assertion_url = ?'
  ).get(userId, assertionUrl);

  if (existing) {
    return res.status(200).json(envelope('success', {
      result: assertionData,
      message: 'Esta assertion ya existe en tu mochila.'
    }));
  }

  const id = v4();
  db.prepare('INSERT INTO assertions (id, user_id, assertion_url, baked_data) VALUES (?, ?, ?, ?)')
    .run(id, userId, assertionUrl, JSON.stringify(assertionData));

  console.log(`[Assertions] Badge importada: usuario=${userId}, url=${assertionUrl}`);
  res.status(201).json(envelope('success', { result: assertionData }));
});

// ── DELETE /ob/v2p1/assertions/:id ───────────────────────────────────────────
router.delete('/ob/v2p1/assertions/:id', (req, res) => {
  const db     = getDb();
  const userId = req.oauthSession.user_id;

  const assertion = db.prepare(
    'SELECT * FROM assertions WHERE id = ? AND user_id = ?'
  ).get(req.params.id, userId);

  if (!assertion) {
    return res.status(404).json(envelope('error', { error: 'not_found' }));
  }

  db.prepare('UPDATE assertions SET revoked = 1 WHERE id = ?').run(assertion.id);
  res.status(204).send();
});

// ─── Utilidades ──────────────────────────────────────────────────────────────

function envelope (status, result) { return { status, result }; }

async function fetchAssertion (url) {
  const urlObj    = new URL(url);
  const isHttps   = urlObj.protocol === 'https:';
  const transport = isHttps ? require('https') : require('http');

  return new Promise((resolve, reject) => {
    transport.get(url, { headers: { Accept: 'application/json' } }, (response) => {
      if (response.statusCode !== 200) {
        return reject(new Error(`HTTP ${response.statusCode}`));
      }
      let data = '';
      response.on('data', chunk => { data += chunk; });
      response.on('end', () => {
        try        { resolve(JSON.parse(data)); }
        catch (e)  { reject(new Error('Respuesta no es JSON válido')); }
      });
    }).on('error', reject);
  });
}

module.exports = router;
