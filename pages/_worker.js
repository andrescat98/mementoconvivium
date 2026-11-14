// Pages fa solo da indirizzo pubblico (mementoconvivium.pages.dev): inoltra tutto al Worker
// `mementoconvivium` via service binding (SITE, configurato nel progetto Pages). Niente redirect.
export default { fetch: (req, env) => env.SITE.fetch(req) };
