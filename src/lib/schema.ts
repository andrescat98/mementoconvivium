import { z } from "astro/zod";
import { upgradeTab, type Img } from "./format";

const opt = z.string().trim().optional();
// URL immagine: statica (/ritratti/…) o caricata da admin (/img/<id>)
const src = z.string().regex(/^\/[\w\-./]+$/);
// Immagine con inquadratura (punto focale in %, zoom). Accetta anche il vecchio formato stringa.
const imgReq = z
  .union([src, z.object({ src, x: z.number().min(0).max(100).optional(), y: z.number().min(0).max(100).optional(), zoom: z.number().min(1).max(3).optional() })])
  .transform((v): Img => (typeof v === "string" ? { src: v } : v));
const img = imgReq.optional();
// Stile di una sezione: sfondo (colore, immagine, velo 0–90 % chiaro o scuro per la leggibilità, parallasse),
// colore del testo, font e grandezza dei titoli, spaziatura, animazione d'entrata, effetto sui titoli.
// Attributi in look() (format.ts), CSS in styles/global.css.
export const ANIMS = ["sali", "dissolvenza", "zoom", "sinistra", "destra"] as const;
export const FX = ["ombra", "bagliore", "oro", "inciso", "contorno"] as const;
// forme dell'immagine nel blocco testo (proporzioni; originale = non ritagliata)
export const IMG_AR = ["quadrata", "orizzontale", "panoramica", "originale"] as const;
export const PADS = ["compatta", "ariosa", "schermo"] as const;
// intestazione evento: dove sta il riquadro con date e bottone
export const HERO_LAYOUTS = ["destra", "sinistra", "sotto", "centro"] as const;
const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
export const bgObj = z.object({
  color: hex.optional(),
  image: img,
  veil: z.number().min(0).max(90).optional(),
  dark: z.boolean().optional(), // velo scuro invece che chiaro
  parallax: z.boolean().optional(),
  text: hex.optional(),
  font: z.string().regex(/^[\w\s'",-]+$/).optional(), // es. "Rye, cursive"
  size: z.number().min(0.6).max(1.8).optional(), // scala dei titoli
  pad: z.enum(PADS).optional(),
  height: z.number().int().min(10).max(100).optional(), // altezza minima, % dello schermo
  vpos: z.enum(["alto", "basso"]).optional(), // contenuto in una sezione alta (vuoto = al centro)
  align: z.enum(["sinistra", "centro", "destra", "giustificato"]).optional(), // allineamento del testo
  w: z.enum(["stretta", "larga", "piena"]).optional(), // larghezza del contenuto
  lh: z.number().min(1).max(3).optional(), // interlinea
  fs: z.number().min(0.6).max(2).optional(), // grandezza del testo
  anim: z.enum(ANIMS).optional(),
  fx: z.enum(FX).optional(),
});
const bg = bgObj.optional();

// "bozza": invisibile al pubblico, visibile in anteprima ai moderatori
export const STATUS = ["aperto", "lista-attesa", "coming-soon", "chiuso", "bozza"] as const;

const character = z.object({
  name: z.string().trim().min(1),
  role: z.string().trim().min(1),
  hint: z.string().trim().min(1),
  portrait: img,
});

// ── Blocchi: home, pagine nuove e schede evento sono liste di blocchi (render in components/Blocco.astro).
// "sezione" = una sezione fissa del sito (stile da /admin → Testi e stili delle pagine).
export const BLOCKS = ["testo", "galleria", "personaggi", "faq", "bottone", "video", "eventi", "ricordi", "sezione"] as const;
export const SEZIONI = ["home-hero", "come-funziona", "timeline", "prenota"] as const;
export const EVENTI_SHOW = ["prossimi", "tutti", "passati"] as const;
export const blockSchema = z.object({
  type: z.enum(BLOCKS),
  hidden: z.boolean().optional(),
  title: opt,
  body: z.string().optional(), // markdown minimo, vedi md()
  image: img, // testo
  side: z.enum(["destra", "sinistra", "sopra", "sotto"]).optional(), // posizione dell'immagine nel testo
  imgW: z.number().int().min(10).max(90).optional(), // larghezza dell'immagine, % del blocco
  imgAr: z.enum(IMG_AR).optional(), // forma dell'immagine (vuoto = verticale 4:5)
  valign: z.enum(["centro", "basso"]).optional(), // immagine e testo affiancati: allineamento verticale
  gallery: z.array(z.object({ image: imgReq, caption: opt })).optional(), // galleria
  characters: z.array(character).optional(), // personaggi
  faq: z.array(z.object({ q: z.string().trim().min(1), a: z.string().trim().min(1) })).optional(),
  label: opt, // bottone
  href: opt,
  video: z.string().trim().regex(/^https:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\//, "link YouTube o Vimeo").optional(),
  show: z.enum(EVENTI_SHOW).optional(), // eventi
  limit: z.number().int().min(1).max(24).optional(),
  key: z.enum(SEZIONI).optional(), // sezione
  style: bg,
});
export type Block = z.infer<typeof blockSchema>;

const tab = z.preprocess(
  upgradeTab,
  z.object({
    title: z.string().trim().min(1),
    blocks: z.array(blockSchema).default([]),
    background: bg,
  }),
);

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
  background: bg, // stile predefinito delle schede (ogni scheda può sovrascriverne i campi)
  heroStyle: bg, // stile dell'intestazione
  sfondo: bg, // sfondo della pagina dell'evento (vuoto = quello del sito)
  heroLayout: z.enum(HERO_LAYOUTS).optional(), // vuoto = riquadro a destra
  coverMode: z.enum(["pieno"]).optional(), // copertina a tutto sfondo invece che sfumata a destra
  tabs: z.array(tab).default([]),
  titleFont: opt, // font-family del titolo e dei titoli delle schede, es. "Rye, cursive"
  characterFont: opt, // font-family del nome nel ritratto fullscreen
  historicalYear: z.number().int().optional(),
  era: opt,
  yearLabel: opt,
  place: opt,
  timelineImage: img,
  // foto delle serate già fatte (blocco "ricordi": nella scheda dell'evento e nella pagina galleria del sito)
  serate: z
    .array(z.object({ dateISO: z.iso.date().optional(), place: opt, photos: z.array(z.object({ image: imgReq, caption: opt })).min(1) }))
    .optional(),
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

// ── Testi fissi delle pagine: si modificano cliccandoci sopra in /admin → Pagine (attributo data-k).
// Un a capo nel testo resta a capo sulla pagina.
export const DEFAULT_TESTI = {
  heroLabel: "Partecipa al prossimo evento",
  stepsTitle: "Come funziona",
  step1Title: "Vesti il tuo ruolo",
  step1Text: "Indossa abiti ispirati all'epoca e lasciati avvolgere dall'atmosfera della serata. Ogni dettaglio del tuo look contribuirà a rendere l'esperienza più autentica, immersiva e memorabile.",
  step2Title: "La cena accompagna il mistero",
  step2Text: "Lo spettacolo prende vita durante la cena: tra una portata e l'altra, la storia si sviluppa, gli indizi emergono e gli ospiti vengono accompagnati in un'esperienza coinvolgente.",
  step3Title: "La storia prende vita",
  step3Text: "Attori in costume interpretano personaggi dell'epoca e danno forma al racconto. Scene, dialoghi ed eventi si susseguono, facendo rivivere agli ospiti l'atmosfera, i segreti e i conflitti del passato.",
  timelineLabel: "La nostra storia",
  timelineTitle: "Il viaggio nel tempo",
  timelineIntro: "Ogni spettacolo ci porta in un'epoca diversa. Dalla corte dei faraoni all'era del jazz — ogni banchetto è una porta sul passato.",
  listaLabel: "Prossimi appuntamenti",
  listaTitle: "Gli spettacoli",
  listaSub: "Ogni serata è un viaggio in un'epoca diversa.\nScegli il tuo banchetto e prenota il tuo posto.",
  prenotaLabel: "Partecipa",
  prenotaTitle: "Sei pronto a sederti al banchetto?",
  prenotaText: "Scrivi per prenotare il tuo posto o richiedere informazioni.\nOgni evento è a numero chiuso.",
  prenotaEventoText: "Riserva il tuo posto al tavolo: scrivici e ti racconteremo come unirti alla prossima serata. Ogni evento è a numero chiuso e i posti vanno in fretta.",
};
export type TestoKey = keyof typeof DEFAULT_TESTI;
// vuoto = testo predefinito (getSettings unisce DEFAULT_SETTINGS)
const testo = z.string().trim().min(1).max(2000).optional();
const testi = Object.fromEntries(Object.keys(DEFAULT_TESTI).map((k) => [k, testo])) as Record<TestoKey, typeof testo>;

// ── Pagine nuove (/chi-siamo…): slug che non si scontra con le pagine fisse del sito
const RISERVATI = ["admin", "img", "eventi", "lista-eventi", "contatti", "privacy", "ritratti", "fonts", "_actions", "_astro", "_server-islands"];
export const pageSchema = z.object({
  slug: slugSchema.refine((s) => !RISERVATI.includes(s), "indirizzo già usato dal sito"),
  title: z.string().trim().min(1),
  description: opt, // Google e anteprime social
  hidden: z.boolean().optional(), // bozza: solo anteprima moderatori
  blocks: z.array(blockSchema).default([]),
  sfondo: bg, // sfondo della pagina (vuoto = quello del sito)
});
export type Pagina = z.infer<typeof pageSchema>;
const sez = (key: (typeof SEZIONI)[number]): Block => ({ type: "sezione", key });
export const DEFAULT_HOME: Block[] = [sez("home-hero"), sez("come-funziona"), sez("timeline"), sez("prenota")];

// ── Impostazioni del sito: contatti, link, bottone della home, testi delle pagine
const url = z.union([z.url(), z.literal("").transform(() => undefined)]).optional();
export const HERO_ACTIONS = ["lista", "prossimo", "link"] as const;
export const settingsSchema = z.object({
  email: z.email(),
  phone: opt, // come va mostrato, es. "+39 389 313 7494"
  whatsapp: z.union([z.string().regex(/^\d{8,15}$/, "solo cifre con prefisso, es. 393893137494"), z.literal("").transform(() => undefined)]).optional(),
  instagram: url,
  bookingUrl: url, // se c'è, i bottoni "Prenota" portano qui invece che all'email
  heroAction: z.enum(HERO_ACTIONS), // lista prossime date | pagina del prossimo evento | link
  heroUrl: url,
  nav: z.array(z.object({ label: z.string().trim().min(1), href: z.string().trim().min(1) })).default([]),
  tagline: opt, // motto nel footer
  // stile delle sezioni del sito, per chiave data-sez (home-hero, prenota…): /admin → Pagine → 🎨
  sezioni: z.record(z.string().regex(/^[a-z-]+$/), bgObj).default({}),
  sfondo: bg, // sfondo di tutte le pagine al posto del marmo
  sfondoHome: bg, // sfondo della home (vuoto = quello del sito)
  stili: z.array(z.object({ name: z.string().trim().min(1).max(40), style: bgObj })).default([]), // stili salvati con nome
  // striscia avvisi su tutte le pagine (vuota = niente)
  banner: z.object({ text: opt, href: opt }).default({}),
  // Google e anteprime social delle pagine fisse, per percorso ("/", "/lista-eventi"…)
  seo: z.record(z.string().regex(/^\/[a-z-]*$/), z.object({ title: opt, description: opt, image: img })).default({}),
  analyticsToken: z.union([z.string().regex(/^[0-9a-f]{32}$/, "token di 32 caratteri"), z.literal("").transform(() => undefined)]).optional(), // Cloudflare Web Analytics
  home: z.array(blockSchema).default(DEFAULT_HOME),
  pagine: z.array(pageSchema).default([]),

  ...testi,
});
export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  email: "alberto.mazzucco98@gmail.com",
  phone: "+39 389 313 7494",
  whatsapp: "393893137494",
  instagram: "https://www.instagram.com/memento_convivium",
  heroAction: "lista",
  nav: [
    { label: "Come funziona", href: "/#come-funziona" },
    { label: "Lista eventi", href: "/lista-eventi" },
    { label: "Prenota", href: "/#prenota" },
  ],
  sezioni: {},
  stili: [],
  banner: {},
  seo: {},
  home: DEFAULT_HOME,
  pagine: [],
  tagline: "\"Omnes vulnerant, ultima necat\" — ogni ora ferisce, l'ultima uccide.",
  ...DEFAULT_TESTI,
};
