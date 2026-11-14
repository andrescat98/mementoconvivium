# Memento Convivium

Sito delle cene con delitto a tema storico. **Astro 7** renderizzato da un **Cloudflare Worker**, eventi e immagini caricate su **Turso** (libSQL). Tutto su piani gratuiti.

- Sito: https://mementoconvivium.pages.dev (il Worker diretto: https://mementoconvivium.andrescat98.workers.dev)
- Area moderatori: `/admin` → guida in [docs/moderatori.md](docs/moderatori.md)

## Come funziona

| Cosa | Dove |
|---|---|
| Home, lista eventi, pagina evento | SSR nel Worker, dati da Turso (`src/lib/db.ts`) |
| Indirizzo pubblico | progetto Pages `mementoconvivium`: `pages/_worker.js` inoltra al Worker via service binding `SITE` (nessun redirect); i file statici in `pages/_routes.json` → `exclude` li serve Pages direttamente |
| Contatti, privacy | prerenderizzate al build (`export const prerender = true`) |
| Cache pagine eventi | `memoryCache` di Astro, 5 min + SWR 1 h, tag `eventi` invalidato a ogni salvataggio (`astro.config.mjs`) |
| Admin | `src/pages/admin.astro` + Astro Actions (`src/actions/index.ts`) |
| Login | password unica (secret `ADMIN_PASSWORD`), cookie HMAC 7 giorni, max 5 tentativi/min per IP |
| Immagini caricate | ridimensionate a 1600 px e convertite in webp nel browser, salvate come BLOB in Turso, servite da `/img/<hash>` con cache immutabile |
| Immagini storiche | asset statici in `public/eventi/<slug>/` |
| Schema dati | `src/lib/schema.ts` (zod), tabelle in `db/schema.sql` |

Un evento è una riga di `events`: `data` (JSON validato dallo schema) + `body` (racconto in Markdown minimo: paragrafi, `**grassetto**`, `*corsivo*`, `[link](https://…)`). Le etichette delle date ("Ven 19 Giu 2026") sono calcolate da `dateISO`.

## Sviluppo locale

```sh
npm install
npm run fix:no-avx2        # solo su CPU senza AVX2, vedi sotto
cp .dev.vars.example .dev.vars
npm run db:local           # terminale 1: Turso locale su :8080
cat db/schema.sql db/seed.sql | turso db shell http://127.0.0.1:8080   # solo la prima volta
npm run dev                # terminale 2: http://localhost:4321
```

Per lavorare sul DB di produzione metti in `.dev.vars` l'URL `libsql://…` e un token (vedi sotto).

| Comando | |
|---|---|
| `npm run dev` | dev server (workerd, come in produzione); `npx astro dev stop` per fermarlo |
| `npm run preview` | build + anteprima di produzione |
| `npm run check` | rigenera i tipi di `wrangler.jsonc` + type check |
| `npm test` | test di `src/lib/format.ts` |
| `npm run deploy` | build + `wrangler deploy` |

### CPU senza AVX2

Il compilatore Rust di Astro 7 va in crash (`exit 132`, SIGILL) su CPU senza AVX2 (es. Intel Ivy Bridge). `npm run fix:no-avx2` installa la versione WASI, più lenta ma identica. Va rilanciato dopo ogni `npm install`. Il build su Cloudflare non ne ha bisogno.

## Primo deploy

```sh
turso auth login
turso db tokens create mementoconvivium      # copia il token
npx wrangler secret put TURSO_TOKEN          # incolla il token
npx wrangler secret put ADMIN_PASSWORD       # password lunga per i moderatori
npm run deploy
```

Il progetto Pages si aggiorna da solo a ogni push su `master` (build: `npm run build:pages`, output `pages/`, service binding `SITE` → `mementoconvivium`). Il Worker invece si pubblica solo con `npm run deploy`.

Nuova cartella di immagini statiche in `public/`? Aggiungila a `exclude` in `pages/_routes.json`, altrimenti passa (funzionando lo stesso) dal Worker.

Cambiare `ADMIN_PASSWORD` disconnette tutti i moderatori.

## Limiti gratuiti (indicativi)

- Workers Free: 100.000 richieste/giorno. Gli asset statici non contano.
- Turso Free: 5 GB, 500 M righe lette/mese. Una visita a una pagina non in cache = 1 query; un'immagine = 1 riga letta per browser (poi resta in cache).
- Workers Cache (cache edge davanti al Worker) è **spenta di proposito**: accesa, farebbe contare anche le richieste agli asset statici.
