import { createClient, type Client } from "@libsql/client/web";
import { env } from "cloudflare:workers";
import type { Evento, EventoData } from "./schema";

let client: Client | undefined;
export const db = () =>
  (client ??= createClient({ url: env.TURSO_URL, authToken: env.TURSO_TOKEN }));

const toEvento = (r: Record<string, unknown>): Evento => ({
  id: r.slug as string,
  data: JSON.parse(r.data as string),
  body: r.body as string,
});

export async function getEvents(): Promise<Evento[]> {
  const { rows } = await db().execute("SELECT slug, data, body FROM events ORDER BY slug");
  return rows.map(toEvento);
}

export async function getEvent(slug: string): Promise<Evento | undefined> {
  const { rows } = await db().execute({ sql: "SELECT slug, data, body FROM events WHERE slug = ?", args: [slug] });
  return rows[0] && toEvento(rows[0]);
}

/** Crea (originalSlug vuoto), aggiorna o rinomina un evento. Lancia su slug duplicato. */
export async function saveEvent(slug: string, data: EventoData, body: string, originalSlug?: string) {
  const json = JSON.stringify(data);
  const stmts =
    originalSlug === slug
      ? [{ sql: "UPDATE events SET data = ?, body = ?, updated_at = unixepoch() WHERE slug = ?", args: [json, body, slug] }]
      : [
          { sql: "INSERT INTO events (slug, data, body) VALUES (?, ?, ?)", args: [slug, json, body] },
          ...(originalSlug ? [{ sql: "DELETE FROM events WHERE slug = ?", args: [originalSlug] }] : []),
        ];
  await db().batch([...stmts, GC], "write");
}

export async function deleteEvent(slug: string) {
  await db().batch([{ sql: "DELETE FROM events WHERE slug = ?", args: [slug] }, GC], "write");
}

// Elimina le immagini caricate non più usate da nessun evento (con 1 giorno di tolleranza
// per quelle appena caricate e non ancora salvate).
// ponytail: instr() sul JSON scansiona tutti gli eventi, va benissimo finché sono centinaia.
const GC = `DELETE FROM images WHERE created_at < unixepoch() - 86400
  AND NOT EXISTS (SELECT 1 FROM events WHERE instr(events.data, '/img/' || images.id))`;

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
