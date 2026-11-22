/** Back-office sign-in: one password (ADMIN_PASSWORD) and a signed, expiring cookie. Web Crypto only, so the proxy can use it too. */

export const SESSION_COOKIE = "diwan-admin";
export const SESSION_DAYS = 7;

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function hmacKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) return null;
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export const authConfigured = () => !!process.env.ADMIN_PASSWORD && (process.env.AUTH_SECRET?.length ?? 0) >= 16;

/** Compare two strings without leaking where they differ. */
export async function safeEqual(a: string, b: string) {
  const [x, y] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(a)), crypto.subtle.digest("SHA-256", enc.encode(b))]);
  const xa = new Uint8Array(x), ya = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < xa.length; i++) diff |= xa[i] ^ ya[i];
  return diff === 0;
}

export async function checkPassword(given: string) {
  const real = process.env.ADMIN_PASSWORD;
  if (!real || !authConfigured()) return false;
  return safeEqual(given, real);
}

export async function createSession() {
  const key = await hmacKey();
  if (!key) throw new Error("AUTH_SECRET is not set");
  const exp = Date.now() + SESSION_DAYS * 86_400_000;
  const body = b64url(enc.encode(JSON.stringify({ exp })));
  const sig = b64url(await crypto.subtle.sign("HMAC", key, enc.encode(body)));
  return { token: `${body}.${sig}`, maxAge: SESSION_DAYS * 86_400 };
}

export async function verifySession(token: string | undefined | null) {
  if (!token) return false;
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;
  const key = await hmacKey();
  if (!key) return false;
  try {
    const ok = await crypto.subtle.verify("HMAC", key, fromB64url(sig), enc.encode(body));
    if (!ok) return false;
    const { exp } = JSON.parse(new TextDecoder().decode(fromB64url(body))) as { exp: number };
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

export const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge,
});
