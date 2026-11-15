import type { AstroCookies } from "astro";
import { env } from "cloudflare:workers";

// Sessione = "<scadenza>.<hmac(scadenza)>" firmata con ADMIN_PASSWORD:
// cambiando la password si invalidano tutte le sessioni.
// Dura 30 giorni e si rinnova a ogni apertura di /admin: si rientra solo dopo 30 giorni senza usarlo.
const COOKIE = "mc_admin";
const TTL = 30 * 24 * 3600;
const enc = new TextEncoder();

async function hmac(msg: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(env.ADMIN_PASSWORD), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}

const sha = async (s: string) => crypto.subtle.digest("SHA-256", enc.encode(s));
const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");

export async function checkPassword(input: string) {
  if (!env.ADMIN_PASSWORD) return false;
  return crypto.subtle.timingSafeEqual(await sha(input), await sha(env.ADMIN_PASSWORD));
}

export async function login(cookies: AstroCookies) {
  const exp = String(Math.floor(Date.now() / 1000) + TTL);
  cookies.set(COOKIE, `${exp}.${hex(await hmac(exp))}`, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: TTL,
  });
}

export const logout = (cookies: AstroCookies) => cookies.delete(COOKIE, { path: "/" });

export async function isAdmin(cookies: AstroCookies) {
  const [exp, sig] = cookies.get(COOKIE)?.value.split(".") ?? [];
  // timingSafeEqual lancia su lunghezze diverse: sha-256 hex = 64 caratteri
  if (!env.ADMIN_PASSWORD || sig?.length !== 64 || !(Number(exp) > Date.now() / 1000)) return false;
  return crypto.subtle.timingSafeEqual(enc.encode(sig), enc.encode(hex(await hmac(exp))));
}
