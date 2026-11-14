// `wrangler types --include-runtime=false` genera solo Env: i tipi runtime completi di workerd
// vanno in conflitto con il DOM degli script client (Element, ParentNode…). Qui solo ciò che usiamo.
declare module "cloudflare:workers" {
  export const env: Cloudflare.Env;
}

interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

// Estensione Workers (non standard), tempo costante
interface SubtleCrypto {
  timingSafeEqual(a: ArrayBuffer | ArrayBufferView, b: ArrayBuffer | ArrayBufferView): boolean;
}
