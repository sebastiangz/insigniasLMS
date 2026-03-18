'use strict';
// ─── src/middleware/oauth.js ─────────────────────────────────────────────────
// Helpers para generar y validar tokens, y el middleware `requireBearer`
// que protege los endpoints del Badge Connect API.
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require('crypto');
const { getDb } = require('../db/init');

const ACCESS_TTL  = Number(process.env.ACCESS_TOKEN_TTL  || 3600);
const REFRESH_TTL = Number(process.env.REFRESH_TOKEN_TTL || 2592000);

// ── Genera un token opaque aleatorio ─────────────────────────────────────────
function generateToken () {
  return crypto.randomBytes(32).toString('hex');
}

// ── Genera un authorization_code ─────────────────────────────────────────────
function generateAuthCode () {
  return crypto.randomBytes(24).toString('hex');
}

// ── Crea una sesión completa (code + access + refresh) ───────────────────────
function createSession (userId, clientId, scope) {
  const db       = getDb();
  const { v4 }   = require('uuid');
  const now      = Math.floor(Date.now() / 1000);

  const session = {
    id:              v4(),
    user_id:         userId,
    client_id:       clientId,
    auth_code:       generateAuthCode(),
    access_token:    generateToken(),
    refresh_token:   generateToken(),
    scope:           scope || '',
    access_expires:  now + ACCESS_TTL,
    refresh_expires: now + REFRESH_TTL
  };

  db.prepare(`
    INSERT INTO oauth_sessions
      (id, user_id, client_id, auth_code, access_token, refresh_token, scope, access_expires, refresh_expires)
    VALUES
      (:id, :user_id, :client_id, :auth_code, :access_token, :refresh_token, :scope, :access_expires, :refresh_expires)
  `).run(session);

  return session;
}

// ── Intercambia auth_code por tokens (code grant) ────────────────────────────
function exchangeCode (code, clientId) {
  const db  = getDb();
  const now = Math.floor(Date.now() / 1000);

  const session = db.prepare(
    'SELECT * FROM oauth_sessions WHERE auth_code = ? AND client_id = ?'
  ).get(code, clientId);

  if (!session) return null;

  // El code ya fue usado
  db.prepare('UPDATE oauth_sessions SET auth_code = NULL WHERE id = ?').run(session.id);

  return session;
}

// ── Refresh: invalida el refresh_token viejo y emite nuevos tokens ───────────
function refreshSession (refreshToken) {
  const db  = getDb();
  const now = Math.floor(Date.now() / 1000);

  const session = db.prepare(
    'SELECT * FROM oauth_sessions WHERE refresh_token = ?'
  ).get(refreshToken);

  if (!session || session.refresh_expires < now) return null;

  // Generar nuevos tokens
  const newAccess  = generateToken();
  const newRefresh = generateToken();
  const newAccessExp  = now + ACCESS_TTL;
  const newRefreshExp = now + REFRESH_TTL;

  db.prepare(`
    UPDATE oauth_sessions
    SET access_token = ?, refresh_token = ?, access_expires = ?, refresh_expires = ?
    WHERE id = ?
  `).run(newAccess, newRefresh, newAccessExp, newRefreshExp, session.id);

  return {
    ...session,
    access_token:   newAccess,
    refresh_token:  newRefresh,
    access_expires: newAccessExp,
    refresh_expires: newRefreshExp
  };
}

// ── Middleware: extrae Bearer y atiende la sesión ────────────────────────────
function requireBearer (req, res, next) {
  const header = req.headers.authorization || '';

  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      result: { error: 'invalid_token', error_description: 'Missing or invalid Bearer token' }
    });
  }

  const token = header.slice(7);
  const db    = getDb();
  const now   = Math.floor(Date.now() / 1000);

  const session = db.prepare(
    'SELECT * FROM oauth_sessions WHERE access_token = ?'
  ).get(token);

  if (!session || session.access_expires < now) {
    return res.status(401).json({
      status: 'error',
      result: { error: 'invalid_token', error_description: 'Token expired or not found' }
    });
  }

  // Adjunta la sesión al request
  req.oauthSession = session;
  next();
}

module.exports = {
  generateToken,
  generateAuthCode,
  createSession,
  exchangeCode,
  refreshSession,
  requireBearer
};
