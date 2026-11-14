# Memento Convivium — mappa per agenti

Astro 7 SSR su Cloudflare Worker (`@astrojs/cloudflare` 14) + Turso. Italiano in UI, commenti e docs. Dettagli: README.md.

- `src/lib/schema.ts` — zod `eventoSchema` (schede `tabs`, immagini `{src,x,y,zoom}`, sfondi) + `Evento {id, data}`, `settingsSchema` + `DEFAULT_SETTINGS`
- `src/lib/db.ts` — client libSQL web, eventi/versioni/immagini/impostazioni (`getSettings` in cache 60 s), `normalize()` converte i vecchi eventi con `body` in schede, GC immagini orfane
- `src/lib/format.ts` — `dateLabel`, `today`, `md`, `imgStyle` (inquadratura), `googleFontsHref`, `slugify`, `bookHref` + `format.test.ts`
- `src/lib/fonts.ts` — font Google del selettore in /admin
- `src/lib/auth.ts` — cookie HMAC firmato con `ADMIN_PASSWORD`
- `src/actions/index.ts` — login/logout/saveEvent/deleteEvent/uploadImage; ogni action admin chiama `guard()` e invalida il tag `eventi`
- `src/pages/admin.astro` — markup UI moderatori; logica in `src/scripts/admin.ts` (vanilla), stili in `src/styles/admin.css`
- `src/pages/eventi/[slug].astro` — intestazione + schede (JS mostra una scheda per `#ancora`), `components/Sfondo.astro`
- `src/pages/img/[id].ts` — BLOB da Turso
- `src/env.d.ts` — tipi minimi `cloudflare:workers` (i tipi runtime completi confliggono col DOM: usare `npm run types`, non `wrangler types`)
- `pages/` — progetto Pages = solo proxy (`_worker.js` → service binding `SITE`) + `_routes.json` per servire statici da Pages
- `db/schema.sql`, `db/seed.sql` — schema e snapshot iniziale (8 eventi)

Regole:
- Nuovo campo evento → `schema.ts` + campo in `admin.astro` + `fill()`/`collect()` in `scripts/admin.ts` + template che lo usa. Niente migrazioni SQL: `data` è JSON.
- Contatti/link: mai hardcoded, usare `getSettings()`.
- Pagine con dati eventi → aggiungere la rotta a `routeRules` in `astro.config.mjs`.
- Verifica: `npm test && npm run check && npm run build`. La CPU di sviluppo non ha AVX2: se `astro` esce con 132, `npm run fix:no-avx2`.
- Test locale: `npm run db:local` + `.dev.vars` (vedi `.dev.vars.example`).
