import type { APIRoute } from "astro";
import { getImage } from "../../lib/db";

// id = hash del contenuto: l'URL non cambia mai contenuto, quindi cache immutabile nel browser.
// ponytail: ogni primo download legge il BLOB da Turso; se il traffico cresce, attivare Workers Cache.
export const GET: APIRoute = async ({ params }) => {
  const img = /^[0-9a-f]{24}$/.test(params.id!) ? await getImage(params.id!) : undefined;
  if (!img) return new Response("Not found", { status: 404 });
  return new Response(img.data, {
    headers: {
      "Content-Type": img.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
