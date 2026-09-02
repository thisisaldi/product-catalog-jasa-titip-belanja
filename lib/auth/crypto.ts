/**
 * Web Crypto only (no `node:crypto`) — this module is shared by middleware
 * (Edge runtime) and Server Actions/Route Handlers (Node runtime). Both
 * expose `globalThis.crypto.subtle`.
 */

export function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

export function textToBase64Url(text: string): string {
  return toBase64Url(new TextEncoder().encode(text));
}

export function base64UrlToText(value: string): string {
  return new TextDecoder().decode(fromBase64Url(value));
}

/** 06-security.md Section 2.1 — 256-bit bootstrap secret. */
export function generateBootstrapSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

/** 05-database-design.md Section 2.1 — SHA-256 hash of the bootstrap secret. */
export async function hashSecret(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return toBase64Url(new Uint8Array(digest));
}

/** Constant-time comparison for two same-purpose strings (hash equality). */
export function timingSafeEqualString(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function hmacSign(payload: string, secret: string): Promise<string> {
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

export async function hmacVerify(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const key = await hmacKey(secret);
    return await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signature) as BufferSource,
      new TextEncoder().encode(payload),
    );
  } catch {
    return false;
  }
}
