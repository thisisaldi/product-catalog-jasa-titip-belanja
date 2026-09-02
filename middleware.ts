import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth/session";
import { verifyAdminSession } from "@/lib/auth/verify";

/**
 * One app, one deployment, one hostname. Admin surface lives at the obscure
 * static path `/x7k9m2/*` (04-system-design.md Section 7.1, migrated
 * 2026-09-04 off the earlier separate `admin.` subdomain) — a plain
 * filesystem route under `app/x7k9m2/*`, no hostname rewrite needed.
 *
 * The obscure path is defense-in-depth only, never an authentication
 * boundary: this is also the Section 18 access-control gate, and every path
 * under it except the bootstrap route requires a valid, unrevoked,
 * unexpired session cookie, re-checked against the database on every
 * request (06-security.md Section 2.4) — not just trusted from the signed
 * cookie payload, and not granted by knowledge of the path itself.
 */
const ADMIN_PATH_PREFIX = "/x7k9m2";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /admin is retired — it must never become an alternate, unprotected
  // admin entry point. Same generic 404 as any other invalid admin guess.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return new NextResponse(null, { status: 404 });
  }

  const isAdminPath = pathname === ADMIN_PATH_PREFIX || pathname.startsWith(`${ADMIN_PATH_PREFIX}/`);
  if (!isAdminPath) {
    return NextResponse.next();
  }

  // The bootstrap route is the one admin path reachable without a session —
  // it establishes one. No form is ever shown here (04 Section 7.1).
  const bootstrapPrefix = `${ADMIN_PATH_PREFIX}/access`;
  if (pathname === bootstrapPrefix || pathname.startsWith(`${bootstrapPrefix}/`)) {
    return NextResponse.next();
  }

  const cookieValue = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const tokenId = await verifyAdminSession(cookieValue);
  if (!tokenId) {
    // Generic 404, never 401/403 (06-security.md Section 2.7) — an invalid
    // guess learns nothing about whether the admin surface even exists.
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
