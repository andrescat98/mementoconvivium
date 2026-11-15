-- Un evento = una riga. `data` è il JSON validato da src/lib/schema.ts (schede comprese).
-- `body` è il racconto dei vecchi eventi senza schede: convertito alla lettura (normalize in db.ts), poi vuoto.
CREATE TABLE IF NOT EXISTS events (
  slug       TEXT PRIMARY KEY CHECK (slug GLOB '[a-z0-9]*' AND slug NOT GLOB '*[^a-z0-9-]*'),
  data       TEXT NOT NULL CHECK (json_valid(data)),
  body       TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_by TEXT,
  rev        INTEGER NOT NULL DEFAULT 0 -- +1 a ogni salvataggio: rileva modifiche concorrenti
);

-- Versioni precedenti (ultime 30 per evento) ed eventi eliminati (deleted = 1), ripristinabili da /admin.
CREATE TABLE IF NOT EXISTS event_versions (
  id       INTEGER PRIMARY KEY,
  slug     TEXT NOT NULL,
  data     TEXT NOT NULL,
  body     TEXT NOT NULL,
  author   TEXT,
  saved_at INTEGER NOT NULL DEFAULT (unixepoch()),
  deleted  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS event_versions_slug ON event_versions (slug, id);

-- Immagini caricate da /admin (webp ridimensionate nel browser). id = hash sha-256 del contenuto.
CREATE TABLE IF NOT EXISTS images (
  id         TEXT PRIMARY KEY,
  mime       TEXT NOT NULL,
  data       BLOB NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Impostazioni del sito (contatti, link, bottone home): una riga JSON, validata da settingsSchema.
CREATE TABLE IF NOT EXISTS settings (
  id   INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL CHECK (json_valid(data))
);

-- Cronologia delle impostazioni (home, pagine nuove, testi, stili, contatti): ogni salvataggio, ultime 50.
-- Creata anche al primo salvataggio da saveSettings() in db.ts.
CREATE TABLE IF NOT EXISTS settings_versions (
  id       INTEGER PRIMARY KEY,
  data     TEXT NOT NULL,
  author   TEXT,
  saved_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Migrazione 2026-11-14 per DB creati prima di updated_by/rev:
-- ALTER TABLE events ADD COLUMN updated_by TEXT;
-- ALTER TABLE events ADD COLUMN rev INTEGER NOT NULL DEFAULT 0;
