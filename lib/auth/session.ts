import "server-only";
import { base64UrlToText, hmacSign, hmacVerify, textToBase64Url } from "./crypto";

export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_TOKEN_ID_HEADER = "x-admin-token-id";

/** 04-system-design.md Section 7.1 / 06-security.md Section 2.6 — fixed 30-day cookie lifetime. */
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

type SessionPayload = {
  tokenId: string;
  issuedAt: number;
};

function getSigningSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not set");
  }
  return secret;
}

/**
 * Signed cookie value: base64url(JSON payload) + "." + HMAC signature, using
 * a server-only secret distinct from any token_hash (06-security.md Section
 * 2.5) — a tampered payload fails verification and is treated as absent.
 */
export async function createSessionCookieValue(tokenId: string): Promise<string> {
  const payload: SessionPayload = { tokenId, issuedAt: Date.now() };
  const encoded = textToBase64Url(JSON.stringify(payload));
  const signature = await hmacSign(encoded, getSigningSecret());
  return `${encoded}.${signature}`;
}

export async function parseSessionCookieValue(value: string): Promise<SessionPayload | null> {
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return null;
  const valid = await hmacVerify(encoded, signature, getSigningSecret());
  if (!valid) return null;
  try {
    const payload = JSON.parse(base64UrlToText(encoded));
    if (typeof payload.tokenId === "string" && typeof payload.issuedAt === "number") {
      return payload;
    }
    return null;
  } catch {
    return null;
  }
}
