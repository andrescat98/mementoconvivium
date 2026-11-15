// Mappa del sito per Google: pagine fisse, eventi pubblici, pagine nuove non nascoste
import type { APIRoute } from "astro";
import { getEvents, getSettings } from "../lib/db";

export const GET: APIRoute = async ({ site }) => {
  const [eventi, s] = await Promise.all([getEvents(), getSettings()]);
  const paths = [
    "/", "/lista-eventi", "/contatti", "/privacy",
    ...eventi.filter((e) => e.data.status !== "coming-soon").map((e) => `/eventi/${e.id}`),
    ...s.pagine.filter((p) => !p.hidden).map((p) => `/${p.slug}`),
  ];
  const urls = paths.map((p) => `<url><loc>${new URL(p, site)}</loc></url>`).join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
};
