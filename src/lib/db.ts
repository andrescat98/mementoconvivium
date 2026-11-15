import { createClient, type Client, type Row } from "@libsql/client/web";
import { env } from "cloudflare:workers";
import { upgradeTab } from "./format";
import { DEFAULT_SETTINGS, type Evento, type EventoData, type Settings } from "./schema";

let client: Client | undefined;
export const db = () =>
  (client ??= createClient({ url: env.TURSO_URL, authToken: env.TURSO_TOKEN }));

/**
 * Eventi salvati prima delle schede (racconto in `body`, personaggi in `data.characters`):
 * convertiti alla lettura in schede "La storia" + "Personaggi". Le schede a modello unico diventano schede
 * con un blocco (upgradeTab). Si riscrivono al primo salvataggio.
 */
function normalize(json: string, body: string): EventoData {
  const d = JSON.parse(json);
  if (!d.tabs) {
    d.tabs = [];
    if (body) d.tabs.push({ title: "La storia", template: "testo", body });
    if (d.characters?.length)
      d.tabs.push({
        title: "Personaggi",
        template: "personaggi",
        body: "Ogni ospite riceverà la propria scheda via email.\nQuesti sono i volti che troverai al banchetto.",
        characters: d.characters,
      });
    delete d.characters;
  }
  d.tabs = d.tabs.map(upgradeTab);
  return d;
}

const COLS = "slug, data, body, updated_at, updated_by, rev";
const toEvento = (r: Row): Evento => ({
  id: r.slug as string,
  data: normalize(r.data as string, r.body as string),
  updatedAt: Number(r.updated_at),
  updatedBy: (r.updated_by as string | null) ?? undefined,
  rev: Number(r.rev),
});

/** Eventi pubblici (senza bozze); `all` per l'admin. */
export async function getEvents(all = false): Promise<Evento[]> {
  const where = all ? "" : "WHERE json_extract(data, '$.status') != 'bozza'";
  const { rows } = await db().execute(`SELECT ${COLS} FROM events ${where} ORDER BY slug`);
  return rows.map(toEvento);
}

export async function getEvent(slug: string): Promise<Evento | undefined> {
  const { rows } = await db().execute({ sql: `SELECT ${COLS} FROM events WHERE slug = ?`, args: [slug] });
  return rows[0] && toEvento(rows[0]);
}

export class StaleError extends Error {}

const KEEP_VERSIONS = 30;
// Copia lo stato attuale in event_versions prima di sovrascriverlo, tenendo le ultime KEEP_VERSIONS.
const snapshot = (slug: string) => [
  { sql: "INSERT INTO event_versions (slug, data, body, author, saved_at) SELECT slug, data, body, updated_by, updated_at FROM events WHERE slug = ?", args: [slug] },
  { sql: "DELETE FROM event_versions WHERE slug = ? AND deleted = 0 AND id NOT IN (SELECT id FROM event_versions WHERE slug = ? AND deleted = 0 ORDER BY id DESC LIMIT ?)", args: [slug, slug, KEEP_VERSIONS] },
];

/**
 * Crea, aggiorna o rinomina un evento. `rev` è quella letta all'apertura: se nel frattempo
 * un altro moderatore ha salvato lancia StaleError (salvo `force`). Slug duplicato → errore UNIQUE.
 */
export async function saveEvent(o: {
  slug: string;
  data: EventoData;
  originalSlug?: string;
  rev?: number;
  force?: boolean;
  author?: string;
}): Promise<{ updatedAt: number; rev: number }> {
  const json = JSON.stringify(o.data);
  const tx = await db().transaction("write");
  try {
    const cur = o.originalSlug
      ? (await tx.execute({ sql: "SELECT rev FROM events WHERE slug = ?", args: [o.originalSlug] })).rows[0]
      : undefined;
    if (cur && !o.force && Number(cur.rev) !== o.rev) throw new StaleError();
    // evento eliminato da un altro moderatore nel frattempo: lo si ricrea
    const orig = cur ? o.originalSlug! : undefined;
    for (const s of orig ? snapshot(orig) : []) await tx.execute(s);

    let res;
    if (orig === o.slug) {
      res = await tx.execute({
        sql: "UPDATE events SET data = ?, body = '', updated_by = ?, updated_at = unixepoch(), rev = rev + 1 WHERE slug = ? RETURNING updated_at, rev",
        args: [json, o.author ?? null, o.slug],
      });
    } else {
      res = await tx.execute({
        sql: "INSERT INTO events (slug, data, updated_by) VALUES (?, ?, ?) RETURNING updated_at, rev",
        args: [o.slug, json, o.author ?? null],
      });
      if (orig) {
        await tx.execute({ sql: "DELETE FROM events WHERE slug = ?", args: [orig] });
        await tx.execute({ sql: "UPDATE event_versions SET slug = ? WHERE slug = ?", args: [o.slug, orig] });
      }
    }
    await tx.execute(SETTINGS_VERSIONS); // la GC legge settings_versions: potrebbe non esistere ancora
    await tx.execute(GC);
    await tx.commit();
    return { updatedAt: Number(res.rows[0].updated_at), rev: Number(res.rows[0].rev) };
  } finally {
    tx.close();
  }
}

/** Elimina l'evento lasciandone una copia in event_versions (deleted = 1), ripristinabile da /admin. */
export async function deleteEvent(slug: string, author?: string) {
  await db().batch(
    [
      SETTINGS_VERSIONS,
      { sql: "INSERT INTO event_versions (slug, data, body, author, deleted) SELECT slug, data, body, ?, 1 FROM events WHERE slug = ?", args: [author ?? null, slug] },
      { sql: "DELETE FROM events WHERE slug = ?", args: [slug] },
      GC,
    ],
    "write",
  );
}

export interface Version {
  id: number;
  slug: string;
  data: EventoData;
  author?: string;
  savedAt: number;
  deleted: boolean;
}
const toVersion = (r: Row): Version => ({
  id: Number(r.id),
  slug: r.slug as string,
  data: normalize(r.data as string, r.body as string),
  author: (r.author as string | null) ?? undefined,
  savedAt: Number(r.saved_at),
  deleted: Boolean(r.deleted),
});

export async function getHistory(slug: string): Promise<Version[]> {
  const { rows } = await db().execute({
    sql: "SELECT * FROM event_versions WHERE slug = ? ORDER BY id DESC LIMIT ?",
    args: [slug, KEEP_VERSIONS],
  });
  return rows.map(toVersion);
}

/** Ultima copia di ogni evento eliminato e non più esistente. */
export async function getDeleted(): Promise<Version[]> {
  const { rows } = await db().execute(`
    SELECT * FROM event_versions v
    WHERE deleted = 1 AND NOT EXISTS (SELECT 1 FROM events e WHERE e.slug = v.slug)
      AND id = (SELECT max(id) FROM event_versions WHERE slug = v.slug AND deleted = 1)
    ORDER BY id DESC LIMIT 20`);
  return rows.map(toVersion);
}

// Elimina le immagini caricate non più usate da eventi, impostazioni (home, pagine, sfondi, stili…) né versioni
// (con 1 giorno di tolleranza per quelle appena caricate e non ancora salvate).
// ponytail: instr() sul JSON scansiona tutto, va benissimo finché le righe sono qualche migliaio.
const GC = `DELETE FROM images WHERE created_at < unixepoch() - 86400
  AND NOT EXISTS (SELECT 1 FROM events WHERE instr(events.data, '/img/' || images.id))
  AND NOT EXISTS (SELECT 1 FROM event_versions WHERE instr(event_versions.data, '/img/' || images.id))
  AND NOT EXISTS (SELECT 1 FROM settings WHERE instr(settings.data, '/img/' || images.id))
  AND NOT EXISTS (SELECT 1 FROM settings_versions WHERE instr(settings_versions.data, '/img/' || images.id))`;

export interface MediaItem { id: string; mime: string; bytes: number; createdAt: number; used: boolean; inHistory: boolean }
/** Tutte le immagini; used = in eventi/impostazioni correnti, inHistory = anche (o solo) nelle versioni vecchie. */
export async function listImages(): Promise<MediaItem[]> {
  await db().execute(SETTINGS_VERSIONS);
  const { rows } = await db().execute(`SELECT id, mime, length(data) AS bytes, created_at,
    (EXISTS (SELECT 1 FROM events WHERE instr(events.data, '/img/' || images.id))
      OR EXISTS (SELECT 1 FROM settings WHERE instr(settings.data, '/img/' || images.id))) AS used,
    (EXISTS (SELECT 1 FROM event_versions WHERE instr(event_versions.data, '/img/' || images.id))
      OR EXISTS (SELECT 1 FROM settings_versions WHERE instr(settings_versions.data, '/img/' || images.id))) AS hist
    FROM images ORDER BY created_at DESC`);
  return rows.map((r) => ({ id: r.id as string, mime: r.mime as string, bytes: Number(r.bytes), createdAt: Number(r.created_at), used: !!r.used, inHistory: !!r.hist }));
}

/** Elimina un'immagine solo se non è usata da eventi o impostazioni correnti. */
export async function deleteImage(id: string): Promise<boolean> {
  const { rowsAffected } = await db().execute({
    sql: `DELETE FROM images WHERE id = ?
      AND NOT EXISTS (SELECT 1 FROM events WHERE instr(events.data, '/img/' || images.id))
      AND NOT EXISTS (SELECT 1 FROM settings WHERE instr(settings.data, '/img/' || images.id))`,
    args: [id],
  });
  return rowsAffected > 0;
}

export async function putImage(bytes: ArrayBuffer, mime: string): Promise<string> {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const id = [...hash.slice(0, 12)].map((b) => b.toString(16).padStart(2, "0")).join("");
  await db().execute({
    sql: "INSERT INTO images (id, mime, data) VALUES (?, ?, ?) ON CONFLICT DO NOTHING",
    args: [id, mime, new Uint8Array(bytes)],
  });
  return `/img/${id}`;
}

export async function getImage(id: string) {
  const { rows } = await db().execute({ sql: "SELECT mime, data FROM images WHERE id = ?", args: [id] });
  return rows[0] as unknown as { mime: string; data: ArrayBuffer } | undefined;
}

// ── Impostazioni del sito: una riga JSON, unita ai default (campi nuovi = valore di default)
let settingsCache: { at: number; p: Promise<Settings> } | undefined;
export function getSettings(): Promise<Settings> {
  // ponytail: cache per isolate di 60 s; il salvataggio la svuota solo nell'isolate corrente
  if (!settingsCache || Date.now() - settingsCache.at > 60_000) {
    const p = db()
      .execute("SELECT data FROM settings WHERE id = 1")
      .then(({ rows }) => ({ ...DEFAULT_SETTINGS, ...(rows[0] ? JSON.parse(rows[0].data as string) : {}) }));
    settingsCache = { at: Date.now(), p };
    p.catch(() => (settingsCache = undefined));
  }
  return settingsCache.p;
}

const SETTINGS_VERSIONS = `CREATE TABLE IF NOT EXISTS settings_versions (
  id INTEGER PRIMARY KEY, data TEXT NOT NULL, author TEXT, saved_at INTEGER NOT NULL DEFAULT (unixepoch()))`;
const KEEP_SETTINGS = 50;

// Salva e aggiunge la versione alla cronologia. ponytail: niente controllo di modifiche concorrenti
// come per gli eventi (vince l'ultimo salvataggio); la cronologia permette di recuperare.
export async function saveSettings(s: Settings, author?: string) {
  const data = JSON.stringify(s);
  await db().batch(
    [
      SETTINGS_VERSIONS, // ponytail: idempotente e costa poco; evita una migrazione manuale su Turso
      { sql: "INSERT INTO settings (id, data) VALUES (1, ?) ON CONFLICT (id) DO UPDATE SET data = excluded.data", args: [data] },
      { sql: "INSERT INTO settings_versions (data, author) VALUES (?, ?)", args: [data, author ?? null] },
      { sql: "DELETE FROM settings_versions WHERE id NOT IN (SELECT id FROM settings_versions ORDER BY id DESC LIMIT ?)", args: [KEEP_SETTINGS] },
    ],
    "write",
  );
  settingsCache = undefined;
}

export interface SettingsVersion {
  id: number;
  data: Settings;
  author?: string;
  savedAt: number;
}
export async function getSettingsHistory(): Promise<SettingsVersion[]> {
  await db().execute(SETTINGS_VERSIONS);
  const { rows } = await db().execute("SELECT * FROM settings_versions ORDER BY id DESC");
  return rows.map((r) => ({
    id: Number(r.id),
    data: { ...DEFAULT_SETTINGS, ...JSON.parse(r.data as string) },
    author: (r.author as string | null) ?? undefined,
    savedAt: Number(r.saved_at),
  }));
}
