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
          dateISO: z.string(),
          location: z.string().optional(),
          price: z.string().optional(),
        }),
      )
      .optional(),
    guests: z.string(),
    duration: z.string(),
    excerpt: z.string(),
    featured: z.boolean().default(false),
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
