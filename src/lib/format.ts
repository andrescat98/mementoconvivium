const fmt = new Intl.DateTimeFormat("it-IT", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-06-19" → "Ven 19 Giu 2026" */
export const dateLabel = (iso: string) =>
  fmt.format(new Date(iso)).replace(/(^|\s)\p{L}/gu, (c) => c.toUpperCase());

export const today = () => new Date().toISOString().slice(0, 10);

export const STATUS_TEXT: Record<string, string> = {
  aperto: "Aperto",
  "lista-attesa": "Lista d'attesa",
  chiuso: "Chiuso",
  "coming-soon": "Coming soon",
  bozza: "Bozza",
};

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Markdown minimo per il racconto degli eventi: paragrafi, **grassetto**, *corsivo*,
 * [link](https://…). L'HTML in input viene sempre escapato.
 * ponytail: niente liste/titoli; se servono, usare `marked`.
 */
export const md = (src: string) =>
  src
    .trim()
    .split(/\n\s*\n/)
    .map(
      (p) =>
        `<p>${esc(p.trim())
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.+?)\*/g, "<em>$1</em>")
          .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
          .replace(/\n/g, "<br>")}</p>`,
    )
    .join("");

/** Immagine con inquadratura: punto focale x/y in % (0–100) e zoom (1–3). */
export interface Img {
  src: string;
  x?: number;
  y?: number;
  zoom?: number;
}

/** Accetta anche il vecchio formato (solo URL). */
export const toImg = (v?: string | Img | null): Img | undefined =>
  !v ? undefined : typeof v === "string" ? { src: v } : v;

/**
 * Stile per un <img> con `object-fit: cover` dentro un contenitore `overflow: hidden`:
 * il punto focale resta fermo anche zoomando. `defY` = punto verticale se non scelto (ritratti: 0 = in alto).
 */
export function imgStyle(i?: Img, defY = 50) {
  if (!i) return "";
  const x = i.x ?? 50, y = i.y ?? defY, z = i.zoom ?? 1;
  return `object-position:${x}% ${y}%;transform-origin:${x}% ${y}%` + (z > 1 ? `;transform:scale(${z})` : "");
}

/** Font già caricati dal sito (non vanno chiesti a Google Fonts). */
export const BASE_FONTS = ["Cinzel", "Cinzel Decorative", "Cormorant Garamond", "Jack Pirate"];

/** URL Google Fonts per i font-family dati ("Rye, cursive"), esclusi quelli del sito; undefined se nessuno. */
export function googleFontsHref(...fonts: (string | undefined)[]) {
  const fams = [...new Set(fonts.map((f) => f?.split(",")[0].trim().replace(/['"]/g, "")).filter((f): f is string => !!f && !BASE_FONTS.includes(f)))];
  return fams.length ? `https://fonts.googleapis.com/css2?${fams.map((f) => "family=" + f.replace(/ /g, "+")).join("&")}&display=swap` : undefined;
}

/** Slug per ancore (#la-storia). */
export const slugify = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Dove porta "Prenota": link esterno se impostato, altrimenti email con oggetto. */
export const bookHref = (s: { email: string; bookingUrl?: string }, title?: string) =>
  s.bookingUrl ?? `mailto:${s.email}${title ? "?subject=" + encodeURIComponent("Prenotazione: " + title) : ""}`;
