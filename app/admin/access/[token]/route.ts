import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { hashSecret } from "@/lib/auth/crypto";
import { ADMIN_SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, createSessionCookieValue } from "@/lib/auth/session";

/**
 * One-time bootstrap: hash the presented secret, look it up, issue a signed
 * cookie on success. Any failure (no match / revoked / expired / malformed)
 * returns the same generic 404 (06-security.md Section 2.7) — never a
 * distinguishing 401/403 that would confirm this surface exists.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;

  const hash = await hashSecret(token);
  const supabase = createServiceRoleSupabaseClient();
  const { data: tokenRow } = await supabase
    .from("admin_access_tokens")
    .select("id, expires_at, revoked_at")
    .eq("token_hash", hash)
    .maybeSingle();

  const now = Date.now();
  const isValid = Boolean(
    tokenRow &&
      !tokenRow.revoked_at &&
      (tokenRow.expires_at === null || new Date(tokenRow.expires_at).getTime() > now),
  );
  if (!tokenRow || !isValid) {
    return new NextResponse(null, { status: 404 });
  }

  const maxAge =
    tokenRow.expires_at === null
      ? SESSION_MAX_AGE_SECONDS
      : Math.min(SESSION_MAX_AGE_SECONDS, Math.floor((new Date(tokenRow.expires_at).getTime() - now) / 1000));

  const cookieValue = await createSessionCookieValue(tokenRow.id);
  // Build the redirect from the actual Host header, not request.url/nextUrl —
  // those reflect the internally rewritten /admin/... URL (middleware
  // rewrites admin.<domain> to /admin/*, Section 7.1), which resolves back
  // to the server's own bind address rather than the admin hostname the
  // client actually requested.
  const host = request.headers.get("host") ?? request.nextUrl.host;
  const protocol = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const response = NextResponse.redirect(new URL("/", `${protocol}://${host}`));
  response.cookies.set(ADMIN_SESSION_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge,
    path: "/",
  });
  return response;
}
