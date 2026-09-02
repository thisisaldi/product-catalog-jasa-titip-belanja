import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth/session";
import { verifyAdminSession } from "@/lib/auth/verify";

/**
 * One app, one deployment. Admin surface is reached via the `admin.` hostname
 * prefix (04-system-design.md Section 7.1: separate subdomain, never /admin on
 * the public domain) and rewritten internally to the /admin route segment.
 * Works for both `admin.example.com` (production) and `admin.localhost:PORT`
 * (local dev) with no per-domain configuration needed.
 *
 * This is also the Section 18 access-control gate: every admin path except
 * the bootstrap route requires a valid, unrevoked, unexpired session cookie,
 * re-checked against the database on every request (06-security.md Section
 * 2.4) — not just trusted from the signed cookie payload.
 */
const ADMIN_HOSTNAME_PREFIX = "admin.";

export async function middleware(request: NextRequest) {
  const hostname = (request.headers.get("host") ?? "").split(":")[0];
  const { pathname } = request.nextUrl;
  const isAdminHost = hostname.startsWith(ADMIN_HOSTNAME_PREFIX);

  if (!isAdminHost) {
    // /admin is an internal route segment, not a public URL — never
    // reachable on the public hostname (04-system-design.md Section 7.1).
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      return new NextResponse(null, { status: 404 });
    }
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/admin${pathname === "/" ? "" : pathname}`;

  // The bootstrap route is the one admin path reachable without a session —
  // it establishes one. No form is ever shown here (04 Section 7.1).
  if (pathname === "/access" || pathname.startsWith("/access/")) {
    return NextResponse.rewrite(url);
  }

  const cookieValue = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const tokenId = await verifyAdminSession(cookieValue);
  if (!tokenId) {
    // Generic 404, never 401/403 (06-security.md Section 2.7) — an invalid
    // guess learns nothing about whether the admin surface even exists.
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
