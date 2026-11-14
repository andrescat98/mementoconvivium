import { z } from "astro/zod";

const opt = z.string().trim().optional();
// URL immagine: statica (/ritratti/…) o caricata da admin (/img/<id>)
const imgUrl = z.string().regex(/^\/[\w\-./]+$/).optional();

// "bozza": invisibile al pubblico, visibile in anteprima ai moderatori
export const STATUS = ["aperto", "lista-attesa", "coming-soon", "chiuso", "bozza"] as const;

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
  characters: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        role: z.string().trim().min(1),
        hint: z.string().trim().min(1),
        portrait: imgUrl,
      }),
    )
    .optional(),
  // font-family per il nome personaggio nel ritratto fullscreen, es. "Rye, cursive"
  characterFont: opt,
  historicalYear: z.number().int().optional(),
  era: opt,
  yearLabel: opt,
  place: opt,
  timelineImage: imgUrl,
});

export const slugSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "solo minuscole, numeri e trattini");

export type EventoData = z.infer<typeof eventoSchema>;
export interface Evento {
  id: string;
  data: EventoData;
  body: string;
  updatedAt?: number; // unix secondi
  updatedBy?: string;
  rev?: number; // contatore salvataggi, per rilevare modifiche concorrenti
}
