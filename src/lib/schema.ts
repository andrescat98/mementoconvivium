import { z } from "astro/zod";
import type { Img } from "./format";

const opt = z.string().trim().optional();
// URL immagine: statica (/ritratti/…) o caricata da admin (/img/<id>)
const src = z.string().regex(/^\/[\w\-./]+$/);
// Immagine con inquadratura (punto focale in %, zoom). Accetta anche il vecchio formato stringa.
const imgReq = z
  .union([src, z.object({ src, x: z.number().min(0).max(100).optional(), y: z.number().min(0).max(100).optional(), zoom: z.number().min(1).max(3).optional() })])
  .transform((v): Img => (typeof v === "string" ? { src: v } : v));
const img = imgReq.optional();
// Sfondo: colore, immagine e velo chiaro (0–90 %) per tenere leggibile il testo
const bg = z
  .object({ color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(), image: img, veil: z.number().min(0).max(90).optional() })
  .optional();

// "bozza": invisibile al pubblico, visibile in anteprima ai moderatori
export const STATUS = ["aperto", "lista-attesa", "coming-soon", "chiuso", "bozza"] as const;
// Modelli di scheda: testo (+ immagine accanto), galleria di foto, personaggi
export const TEMPLATES = ["testo", "galleria", "personaggi"] as const;

const character = z.object({
  name: z.string().trim().min(1),
  role: z.string().trim().min(1),
  hint: z.string().trim().min(1),
  portrait: img,
});

const tab = z.object({
  title: z.string().trim().min(1),
  template: z.enum(TEMPLATES),
  body: z.string().optional(), // markdown minimo, vedi md()
  image: img, // testo
  gallery: z.array(z.object({ image: imgReq, caption: opt })).optional(), // galleria
  characters: z.array(character).optional(), // personaggi
  background: bg,
});

export const eventoSchema = z.object({
  title: z.string().trim().min(1),
  theme: z.string().trim().min(1),
  status: z.enum(STATUS).default("aperto"),
  duration: z.string().trim().min(1),
  excerpt: z.string().trim().min(1),
  // label leggibile ("Sab 14 Giu 2025") calcolata da dateISO, vedi dateLabel()
  dates: z
    .array(z.object({ dateISO: z.iso.date(), location: opt, price: opt }))
    .optional(),
  // usati solo se non ci sono date
  location: opt,
  price: opt,
  includes: z.array(z.string().trim().min(1)).optional(),
  cover: img, // copertina: sfondo dell'intestazione e anteprima sui social
  background: bg, // sfondo predefinito delle schede
  tabs: z.array(tab).default([]),
  titleFont: opt, // font-family del titolo e dei titoli delle schede, es. "Rye, cursive"
  characterFont: opt, // font-family del nome nel ritratto fullscreen
  historicalYear: z.number().int().optional(),
  era: opt,
  yearLabel: opt,
  place: opt,
  timelineImage: img,
});

export const slugSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "solo minuscole, numeri e trattini");

export type EventoData = z.infer<typeof eventoSchema>;
export type Tab = EventoData["tabs"][number];
export type Bg = NonNullable<EventoData["background"]>;
export interface Evento {
  id: string;
  data: EventoData;
  updatedAt?: number; // unix secondi
  updatedBy?: string;
  rev?: number; // contatore salvataggi, per rilevare modifiche concorrenti
}

// ── Impostazioni del sito: contatti, link, bottone della home
const url = z.union([z.url(), z.literal("").transform(() => undefined)]).optional();
export const HERO_ACTIONS = ["lista", "prossimo", "link"] as const;
export const settingsSchema = z.object({
  email: z.email(),
  phone: opt, // come va mostrato, es. "+39 389 313 7494"
  whatsapp: z.union([z.string().regex(/^\d{8,15}$/, "solo cifre con prefisso, es. 393893137494"), z.literal("").transform(() => undefined)]).optional(),
  instagram: url,
  bookingUrl: url, // se c'è, i bottoni "Prenota" portano qui invece che all'email
  heroLabel: z.string().trim().min(1),
  heroAction: z.enum(HERO_ACTIONS), // lista prossime date | pagina del prossimo evento | link
  heroUrl: url,
  nav: z.array(z.object({ label: z.string().trim().min(1), href: z.string().trim().min(1) })).default([]),
  tagline: opt, // motto nel footer
});
export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  email: "alberto.mazzucco98@gmail.com",
  phone: "+39 389 313 7494",
  whatsapp: "393893137494",
  instagram: "https://www.instagram.com/memento_convivium",
  heroLabel: "Partecipa al prossimo evento",
  heroAction: "lista",
  nav: [
    { label: "Come funziona", href: "/#come-funziona" },
    { label: "Lista eventi", href: "/lista-eventi" },
    { label: "Prenota", href: "/#prenota" },
  ],
  tagline: "\"Omnes vulnerant, ultima necat\" — ogni ora ferisce, l'ultima uccide.",
};
