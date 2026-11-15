import type { Bg } from "./schema";

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

/** Prima data futura (ISO) dell'evento, undefined se non ce ne sono. */
export const nextDate = (d: { dates?: { dateISO: string }[] }) =>
  d.dates?.map((x) => x.dateISO).filter((x) => x >= today()).sort()[0];

/** Tipi di blocco in /admin: icona, nome, descrizione. */
export const BLOCK_TEXT: Record<string, [string, string, string]> = {
  testo: ["¶", "Testo", "testo con un'immagine accanto, facoltativa"],
  galleria: ["▦", "Galleria", "foto con didascalia, si aprono a schermo intero"],
  personaggi: ["☺", "Personaggi", "ritratti con nome, ruolo e indizio"],
  faq: ["?", "Domande frequenti", "domande che si aprono al clic"],
  bottone: ["➜", "Bottone", "invito con testo e link"],
  video: ["▶", "Video", "YouTube o Vimeo"],
  eventi: ["✦", "Elenco eventi", "card degli eventi prossimi, passati o tutti"],
  ricordi: ["❖", "Foto delle serate", "le foto delle serate passate: dell'evento, o di tutti con il filtro"],
  sezione: ["◆", "Sezione del sito", "intestazione, come funziona, timeline, prenota"],
};
export const SEZIONI_TEXT: Record<string, string> = {
  "home-hero": "Intestazione della home (logo e bottone)",
  "come-funziona": "Come funziona",
  timeline: "Timeline degli eventi",
  prenota: "Box Prenota",
};

export const STATUS_TEXT: Record<string, string> = {
  aperto: "Aperto",
  "lista-attesa": "Lista d'attesa",
  chiuso: "Chiuso",
  "coming-soon": "Coming soon",
  bozza: "Bozza",
};

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// testo in linea: foto del sito, **grassetto**, __sottolineato__, ~~barrato~~, *corsivo*, [link](https://…)
const inline = (s: string) =>
  esc(s)
    .replace(/!\[([^\]]*)\]\((\/[\w\-./]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<u>$1</u>")
    .replace(/~~(.+?)~~/g, "<s>$1</s>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\n/g, "<br>");

/**
 * Markdown minimo dei testi (blocchi, schede, FAQ), scritto dall'editor dal vivo di /admin (htmlToMd):
 * paragrafi (riga vuota), "## " titolo di sezione, "### " sottotitolo, elenchi "- " e "1. ", citazioni "> ",
 * linea "---", più il testo in linea sopra. L'HTML in input viene sempre escapato.
 * ponytail: niente elenchi annidati o tabelle; se servono, usare `marked`.
 */
export const md = (src: string) =>
  src
    .trim()
    .split(/\n\s*\n/)
    .map((p) => {
      p = p.trim();
      const lines = p.split("\n");
      const all = (re: RegExp) => lines.every((l) => re.test(l));
      const items = (re: RegExp) => lines.map((l) => `<li>${inline(l.replace(re, ""))}</li>`).join("");
      if (/^### /.test(p)) return `<h4>${inline(p.slice(4))}</h4>`;
      if (/^## /.test(p)) return `<h3>${inline(p.slice(3))}</h3>`;
      if (p === "---") return "<hr>";
      if (all(/^[-*] /)) return `<ul>${items(/^[-*] /)}</ul>`;
      if (all(/^\d+\. /)) return `<ol>${items(/^\d+\. /)}</ol>`;
      if (all(/^> ?/)) return `<blockquote>${inline(lines.map((l) => l.replace(/^> ?/, "")).join("\n"))}</blockquote>`;
      return `<p>${inline(p)}</p>`;
    })
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

/** Vecchia scheda evento a modello unico ({template, body, …}) → scheda con un blocco (schema.ts, db.ts, admin). */
export function upgradeTab(t: any) {
  if (!t?.template) return t;
  const { title, background, template, ...rest } = t;
  return { title, background, blocks: [{ type: template, ...rest }] };
}

/** Link YouTube/Vimeo → indirizzo del player da incorporare (youtube-nocookie: niente cookie finché non si preme play). */
export function videoEmbed(url?: string) {
  const yt = url?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vi = url?.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vi) return `https://player.vimeo.com/video/${vi[1]}`;
}

/** Colore del velo sull'immagine di sfondo (chiaro o scuro). */
export const veil = (b: Bg) => (b.dark ? `rgb(20 17 14 / ${b.veil}%)` : `rgb(245 242 236 / ${b.veil}%)`);

/** Attributi dello stile di una sezione (schema.ts bgObj, CSS in global.css). Usata anche dall'admin per l'anteprima dal vivo. */
export function look(b?: Bg) {
  const t = b?.text;
  const vars = [
    t && `--cream:${t};--white:${t};--gold:${t};--gold-light:${t};--cream-dim:color-mix(in srgb,${t} 75%,transparent)`,
    b?.font && `--sez-font:${b.font}`,
    b?.size && `--sez-zoom:${b.size}`,
    b?.height && `--sez-h:${b.height}svh`,
    b?.lh && `--sez-lh:${b.lh}`,
    b?.fs && `--sez-fs:${b.fs}`,
  ].filter(Boolean);
  const flag = (v?: unknown) => (v ? "" : undefined);
  return {
    "data-anim": b?.anim, "data-fx": b?.fx, "data-pad": b?.pad,
    "data-font": flag(b?.font), "data-size": flag(b?.size), "data-h": flag(b?.height), "data-vpos": b?.vpos, "data-align": b?.align, "data-w": b?.w,
    "data-lh": flag(b?.lh), "data-fs": flag(b?.fs), "data-parallax": flag(b?.parallax && b.image),
    style: vars.join(";") || undefined,
  };
}

/** Stile di ogni scheda evento: parte da quello dell'intestazione (colori, testo, impaginazione; non immagine,
 * altezza, spazi e animazione), poi lo stile predefinito delle schede, poi quello della scheda. */
const EREDITA = ["color", "op", "veil", "dark", "text", "font", "size", "align", "w", "lh", "fs", "fx"] as const;
export function tabLooks(d: { heroStyle?: Bg; background?: Bg; tabs: { background?: Bg }[] }): (Bg | undefined)[] {
  const base = Object.fromEntries(EREDITA.filter((k) => d.heroStyle?.[k] !== undefined).map((k) => [k, d.heroStyle![k]]));
  return d.tabs.map((t) => {
    const l = { ...base, ...d.background, ...t.background } as Bg;
    return Object.values(l).some((v) => v !== undefined) ? l : undefined;
  });
}

/** Sfondo di una pagina (colore, immagine inquadrata, velo) come valore di `background`, al posto del marmo (global.css body::before). */
export function pageBg(b?: Bg) {
  if (!b?.color && !b?.image) return undefined;
  // opacità: il colore e l'immagine si schiariscono sul fondo avorio (il velo copre lo stesso)
  const op = b.op ?? 100;
  const fade = op < 100 ? `rgb(245 242 236 / ${100 - op}%)` : undefined;
  const v = b.veil ? veil(b) : undefined;
  return [
    fade && `linear-gradient(${fade},${fade})`,
    v && `linear-gradient(${v},${v})`,
    b.image && `url("${b.image.src.replace(/["\\]/g, "")}") ${b.image.x ?? 50}% ${b.image.y ?? 50}% / cover no-repeat`,
    b.color,
  ].filter(Boolean).join(",");
}

/** Foglio Google Fonts con i font del sito (Layout e anteprima admin). */
export const SITE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Cinzel:wght@400;600;700&family=Cinzel+Decorative:wght@400&display=swap";

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

/** Testo del bottone di prenotazione per stato. */
export const BOOK_TEXT: Record<string, string> = {
  aperto: "Prenota ora",
  "lista-attesa": "Lista d'attesa",
  "coming-soon": "Coming soon",
  chiuso: "Prenotazioni chiuse",
};

/** Dove porta "Prenota": link esterno se impostato, altrimenti email con oggetto. */
export const bookHref = (s: { email: string; bookingUrl?: string }, title?: string) =>
  s.bookingUrl ?? `mailto:${s.email}${title ? "?subject=" + encodeURIComponent("Prenotazione: " + title) : ""}`;

/** Bottone "Prenota" della pagina evento; undefined se chiuso o con sole date passate. */
export function bookCta(d: { title: string; status: string; dates?: { dateISO: string }[] }, s: { email: string; bookingUrl?: string }) {
  if (d.status === "chiuso" || (d.dates?.length && !nextDate(d))) return;
  return { href: bookHref(s, d.title), label: BOOK_TEXT[d.status] ?? "Coming soon", cls: d.status === "aperto" ? "btn-primary" : "btn-ghost" };
}
