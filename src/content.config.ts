import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const eventiCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/eventi' }),
  schema: z.object({
    title: z.string(),
    theme: z.string(),
    date: z.string(),
    guests: z.string(),
    duration: z.string(),
    excerpt: z.string(),
    featured: z.boolean().default(false),
    status: z.enum(['aperto', 'lista-attesa', 'coming-soon']).default('aperto'),
    quote: z.object({
      text: z.string(),
      author: z.string(),
    }).optional(),
    location: z.string().optional(),
    price: z.string().optional(),
    includes: z.array(z.string()).optional(),
    characters: z.array(z.object({
      name: z.string(),
      role: z.string(),
      hint: z.string(),
    })).optional(),
  }),
});

export const collections = {
  eventi: eventiCollection,
};
