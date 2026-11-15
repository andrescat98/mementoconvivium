# Memento Convivium — mappa per agenti

Astro 7 SSR su Cloudflare Worker (`@astrojs/cloudflare` 14) + Turso. Italiano in UI, commenti e docs. Dettagli: README.md.

- `src/lib/schema.ts` — zod `eventoSchema` (schede `tabs` = titolo + `blocks`), `blockSchema` (blocchi di schede, home e pagine), `bgObj` (stile: sfondo, testo, font, animazione, effetto), `pageSchema`, `settingsSchema` (+ `home`, `pagine`, `sezioni`, `stili`) + `DEFAULT_SETTINGS`
- `src/lib/db.ts` — client libSQL web, eventi/versioni/immagini/impostazioni (`getSettings` in cache 60 s, cronologia in `settings_versions`), `normalize()` converte i vecchi eventi con `body` in schede, GC immagini orfane, `listImages`/`moveImages` per la libreria foto di /admin (foto DB + statiche `public/ritratti/*/*.webp` via `import.meta.glob`, mai cancellabili; cartelle derivate = eventi/Sito/Non usate, cartelle proprie nella tabella `media_folders` creata al volo, fuori dal GC)
- `src/lib/format.ts` — `dateLabel`, `today`, `nextDate`, `bookCta`, `md` (paragrafi, ## titoli, elenchi, citazioni, ---, sottolineato, barrato, foto), `imgStyle` (inquadratura), `look`/`veil` (attributi dello stile), `videoEmbed`, `upgradeTab`, `googleFontsHref`, `slugify`, `bookHref`, `BLOCK_TEXT` + `format.test.ts`
- `src/lib/fonts.ts` — font Google del selettore in /admin
- `src/lib/auth.ts` — cookie HMAC firmato con `ADMIN_PASSWORD`
- `src/actions/index.ts` — login/logout/saveEvent/deleteEvent/uploadImage; ogni action admin chiama `guard()` e invalida il tag `eventi`
- `src/pages/admin.astro` — markup UI moderatori; logica in `src/scripts/admin.ts` (vanilla: bozze locali in localStorage `mc_draft:*`, cronologia), stili in `src/styles/admin.css`
- `src/components/` — `Blocco` (un blocco di qualunque tipo; le sezioni fisse sono `HomeHero`, `ComeFunziona`, `TimelineSection`, `Prenota`), `FotoDialog` (una per pagina), `TimelineCard`, `EventCard`, `EventoHero`, `Sfondo`: usati dalle pagine e da `/admin/anteprima`
- `src/pages/admin/anteprima.astro` — POST JSON dall'admin (`{slug,data}` evento o `{blocks}` home/pagina) → anteprima coi dati non salvati. In /admin evento e pagine sono divisi: form a sinistra, anteprima dal vivo a destra (`#live`); le parti cliccabili sono `[data-ed]` (`hero`, `cards`, `t0`, `t0.2`, `2`) e il clic lascia nel form solo quel blocco (`.sel`, CSS in admin.css); le schede hanno la barra come sul sito e i "＋" (`.ed-ins`) aggiungono blocchi in quel punto. L'anteprima è la pagina vera (header, Partecipa = `PrenotaEvento`, footer): titoli e testi si scrivono lì (`decorate()`/`wireLive()` in admin.ts, testo → markdown con `htmlToMd`), foto trascinate/incollate nel testo (`![](/img/…)` in `md()`), angoli dei blocchi = sposta/duplica/nascondi/togli/aggiungi, bordo inferiore = altezza; testi del sito (`data-k`), stile delle sezioni fisse e voci del menu si salvano nelle impostazioni insieme all'evento o alla pagina. Un solo Salva, in alto (`#save-top`). Formattazione del testo: barra in alto stile Word (`#ribbon`): stile paragrafo e testo in linea via execCommand → `htmlToMd`; carattere, grandezze (testo in px, titoli in %), colore, allineamento, interlinea e spazio tra paragrafi vanno nello stile del blocco (`livePaint`); Markdown incollato o da file .md → `pasteMd`
- `src/pages/index.astro` (home = `settings.home`), `src/pages/[slug].astro` (pagine nuove = `settings.pagine`)
- `src/pages/eventi/[slug].astro` — intestazione + schede di blocchi (JS mostra una scheda per `#ancora`)
- `src/pages/img/[id].ts` — BLOB da Turso; `src/pages/sitemap.xml.ts`
- `src/layouts/Layout.astro` — sfondo della pagina al posto del marmo (prop `sfondo` ?? `settings.sfondo` → `--page-bg`, `pageBg()`), SEO delle pagine fisse (`settings.seo`), avviso (`settings.banner`), Cloudflare Web Analytics (`settings.analyticsToken`), animazioni d'entrata
- `src/env.d.ts` — tipi minimi `cloudflare:workers` (i tipi runtime completi confliggono col DOM: usare `npm run types`, non `wrangler types`)
- `pages/` — progetto Pages = solo proxy (`_worker.js` → service binding `SITE`) + `_routes.json` per servire statici da Pages
- `db/schema.sql`, `db/seed.sql` — schema e snapshot iniziale (8 eventi)

Regole:
- Nuovo campo evento → `schema.ts` + campo in `admin.astro` + `fill()`/`collect()` in `scripts/admin.ts` + template che lo usa. Niente migrazioni SQL: `data` è JSON.
- Nuovo tipo di blocco → `BLOCKS`/`blockSchema` + `BLOCK_TEXT` (format.ts) + campi `data-for` in `tpl-block` (admin.astro) + `addBlock()`/`readBlock()` in `scripts/admin.ts` + render in `Blocco.astro`.
- Nuova opzione di stile → `bgObj` + `look()` + CSS in `global.css` + `tpl-bg` e `initBg()`/`readBg()` in admin.
- Contatti/link: mai hardcoded, usare `getSettings()`.
- Testi fissi delle pagine: chiave in `DEFAULT_TESTI` (schema.ts) + `data-k="chiave"` sull'elemento → modificabili in /admin → Testi delle pagine.
- Stili condivisi (variabili, header, bottoni, box Prenota) in `styles/global.css`, non in Layout.
- Pagine con dati eventi → aggiungere la rotta a `routeRules` in `astro.config.mjs`.
- Verifica: `npm test && npm run check && npm run build`. La CPU di sviluppo non ha AVX2: se `astro` esce con 132, `npm run fix:no-avx2`.
- Test locale: `npm run db:local` + `.dev.vars` (vedi `.dev.vars.example`).
