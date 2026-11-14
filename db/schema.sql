-- Un evento = una riga. `data` è il JSON validato da src/lib/schema.ts, `body` il racconto in Markdown.
CREATE TABLE IF NOT EXISTS events (
  slug       TEXT PRIMARY KEY CHECK (slug GLOB '[a-z0-9]*' AND slug NOT GLOB '*[^a-z0-9-]*'),
  data       TEXT NOT NULL CHECK (json_valid(data)),
  body       TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Immagini caricate da /admin (webp ridimensionate nel browser). id = hash sha-256 del contenuto.
CREATE TABLE IF NOT EXISTS images (
  id         TEXT PRIMARY KEY,
  mime       TEXT NOT NULL,
  data       BLOB NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
