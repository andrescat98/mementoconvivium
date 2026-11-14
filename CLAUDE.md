# Memento Convivium — mappa per agenti

Astro 7 SSR su Cloudflare Worker (`@astrojs/cloudflare` 14) + Turso. Italiano in UI, commenti e docs. Dettagli: README.md.

- `src/lib/schema.ts` — zod `eventoSchema` + tipo `Evento {id, data, body}` (forma uguale alle vecchie content collections)
- `src/lib/db.ts` — client libSQL web, `getEvents/getEvent/saveEvent/deleteEvent/putImage/getImage`, GC immagini orfane
- `src/lib/format.ts` — `dateLabel`, `today`, `md` (markdown minimo con escape) + `format.test.ts`
- `src/lib/auth.ts` — cookie HMAC firmato con `ADMIN_PASSWORD`
- `src/actions/index.ts` — login/logout/saveEvent/deleteEvent/uploadImage; ogni action admin chiama `guard()` e invalida il tag `eventi`
- `src/pages/admin.astro` — UI moderatori, vanilla JS, nessun framework
- `src/pages/img/[id].ts` — BLOB da Turso
- `src/env.d.ts` — tipi minimi `cloudflare:workers` (i tipi runtime completi confliggono col DOM: usare `npm run types`, non `wrangler types`)
- `db/schema.sql`, `db/seed.sql` — schema e snapshot iniziale (8 eventi)

Regole:
- Nuovo campo evento → `schema.ts` + form in `admin.astro` (`open()` e `collect()`) + template che lo usa. Niente migrazioni SQL: `data` è JSON.
- Pagine con dati eventi → aggiungere la rotta a `routeRules` in `astro.config.mjs`.
- Verifica: `npm test && npm run check && npm run build`. La CPU di sviluppo non ha AVX2: se `astro` esce con 132, `npm run fix:no-avx2`.
- Test locale: `npm run db:local` + `.dev.vars` (vedi `.dev.vars.example`).
