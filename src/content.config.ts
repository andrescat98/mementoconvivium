import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

const eventiCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/eventi" }),
  schema: z.object({
    title: z.string(),
    theme: z.string(),
    dates: z
      .array(
        z.object({
          label: z.string(),
          // YAML interpreta una data non quotata come Date: la normalizziamo a "YYYY-MM-DD"
          dateISO: z.preprocess(
            (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v),
            z.string(),
          ),
          location: z.string().optional(),
          price: z.string().optional(),
        }),
      )
      .optional(),
    duration: z.string(),
    excerpt: z.string(),
    // font-family per il nome personaggio nel ritratto fullscreen, es. "Rye, cursive" — se assente usa il default
    characterFont: z.string().optional(),
    status: z.enum(["aperto", "lista-attesa", "coming-soon", "chiuso"]).default("aperto"),
    location: z.string().optional(),
    price: z.string().optional(),
    includes: z.array(z.string()).optional(),
    characters: z
      .array(
        z.object({
          name: z.string(),
          role: z.string(),
          hint: z.string(),
          // solo il nome del file dentro public/eventi/<slug-evento>/
          portrait: z.string().optional(),
        }),
      )
      .optional(),
    historicalYear: z.number().optional(),
    era: z.string().optional(),
    yearLabel: z.string().optional(),
    place: z.string().optional(),
    timelineImage: z.string().optional(),
  }),
});

export const collections = {
  eventi: eventiCollection,
};
