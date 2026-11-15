import { defineConfig, memoryCache } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Pagine con eventi: renderizzate dal worker e tenute in cache in memoria.
// Ogni salvataggio da /admin invalida il tag "eventi" (nell'isolate corrente);
// gli altri isolate si aggiornano entro maxAge.
const eventi = { maxAge: 300, swr: 3600, tags: ['eventi'] };

export default defineConfig({
  site: 'https://mementoconvivium.pages.dev',
  output: 'server',
  adapter: cloudflare({ imageService: 'passthrough' }),
  session: false,
  cache: { provider: memoryCache() },
  routeRules: {
    '/': eventi,
    '/lista-eventi': eventi,
    '/eventi/[slug]': eventi,
    '/contatti': eventi,
    '/privacy': eventi,
    '/[slug]': eventi, // pagine nuove da /admin
    '/sitemap.xml': eventi,
  },
});
