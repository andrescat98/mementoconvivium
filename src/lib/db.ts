import { createClient, type Client, type Row } from "@libsql/client/web";
import { env } from "cloudflare:workers";
import type { Evento, EventoData } from "./schema";

let client: Client | undefined;
export const db = () =>
  (client ??= createClient({ url: env.TURSO_URL, authToken: env.TURSO_TOKEN }));

const COLS = "slug, data, body, updated_at, updated_by, rev";
const toEvento = (r: Row): Evento => ({
  id: r.slug as string,
  data: JSON.parse(r.data as string),
  body: r.body as string,
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
  body: string;
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
        sql: "UPDATE events SET data = ?, body = ?, updated_by = ?, updated_at = unixepoch(), rev = rev + 1 WHERE slug = ? RETURNING updated_at, rev",
        args: [json, o.body, o.author ?? null, o.slug],
      });
    } else {
      res = await tx.execute({
        sql: "INSERT INTO events (slug, data, body, updated_by) VALUES (?, ?, ?, ?) RETURNING updated_at, rev",
        args: [o.slug, json, o.body, o.author ?? null],
      });
      if (orig) {
        await tx.execute({ sql: "DELETE FROM events WHERE slug = ?", args: [orig] });
        await tx.execute({ sql: "UPDATE event_versions SET slug = ? WHERE slug = ?", args: [o.slug, orig] });
      }
    }
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
  body: string;
  author?: string;
  savedAt: number;
  deleted: boolean;
}
const toVersion = (r: Row): Version => ({
  id: Number(r.id),
  slug: r.slug as string,
  data: JSON.parse(r.data as string),
  body: r.body as string,
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

// Elimina le immagini caricate non più usate da eventi né versioni (con 1 giorno di tolleranza
// per quelle appena caricate e non ancora salvate).
// ponytail: instr() sul JSON scansiona tutto, va benissimo finché le righe sono qualche migliaio.
const GC = `DELETE FROM images WHERE created_at < unixepoch() - 86400
  AND NOT EXISTS (SELECT 1 FROM events WHERE instr(events.data, '/img/' || images.id))
  AND NOT EXISTS (SELECT 1 FROM event_versions WHERE instr(event_versions.data, '/img/' || images.id))`;

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
