'use strict';
// ─── src/db/init.js ──────────────────────────────────────────────────────────
// Abre (o crea) el archivo SQLite y aplica el esquema.
// Se invoca la primera vez que arranca la aplicación.
// ─────────────────────────────────────────────────────────────────────────────

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

let db;

function getDb () {
  if (!db) {
    const dbPath = path.resolve(process.env.DB_PATH || './data/backpack.db');

    // Crear carpeta si no existe
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema () {
  db.exec(`
    -- Clientes OAuth registrados (Consumer = Moodle)
    CREATE TABLE IF NOT EXISTS oauth_clients (
      client_id     TEXT PRIMARY KEY,
      client_secret TEXT NOT NULL,
      redirect_uris TEXT NOT NULL DEFAULT '[]',
      name          TEXT,
      created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );

    -- Usuarios del backpack (identificados por email)
    CREATE TABLE IF NOT EXISTS users (
      id              TEXT    PRIMARY KEY,
      email           TEXT    UNIQUE NOT NULL,
      display_name    TEXT,
      moodle_user_id  INTEGER,
      created_at      INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      updated_at      INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );

    -- Sesiones OAuth (authorization codes y tokens)
    CREATE TABLE IF NOT EXISTS oauth_sessions (
      id              TEXT    PRIMARY KEY,
      user_id         TEXT    NOT NULL REFERENCES users(id),
      client_id       TEXT    NOT NULL REFERENCES oauth_clients(client_id),
      auth_code       TEXT    UNIQUE,
      access_token    TEXT    UNIQUE NOT NULL,
      refresh_token   TEXT    UNIQUE NOT NULL,
      scope           TEXT    NOT NULL DEFAULT '',
      access_expires  INTEGER NOT NULL,
      refresh_expires INTEGER NOT NULL,
      created_at      INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );

    -- Assertions recibidas (badges que el usuario importó desde Moodle)
    CREATE TABLE IF NOT EXISTS assertions (
      id              TEXT    PRIMARY KEY,
      user_id         TEXT    NOT NULL REFERENCES users(id),
      assertion_url   TEXT    NOT NULL,
      baked_data      TEXT    NOT NULL,
      revoked         INTEGER NOT NULL DEFAULT 0,
      imported_at     INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_assertions_user_url
      ON assertions(user_id, assertion_url);

    -- Colecciones (agrupan assertions dentro de la mochila)
    CREATE TABLE IF NOT EXISTS collections (
      id          TEXT    PRIMARY KEY,
      user_id     TEXT    NOT NULL REFERENCES users(id),
      name        TEXT    NOT NULL,
      description TEXT,
      public      INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS collection_items (
      collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
      assertion_id  TEXT NOT NULL REFERENCES assertions(id)  ON DELETE CASCADE,
      PRIMARY KEY (collection_id, assertion_id)
    );
  `);
}

module.exports = { getDb };
