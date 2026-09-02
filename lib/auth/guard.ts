import "server-only";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE } from "./session";
import { verifyAdminSession } from "./verify";

/**
 * Every admin Server Action/Route Handler calls this itself rather than
 * trusting a header set upstream by middleware (06-security.md Section 5:
 * "every admin route/action must be verified... individually, as part of
 * any code review or pre-production check" — no shared trust shortcut).
 * Throws if there is no valid session; callers let this propagate as a
 * generic failure, never a distinguishing message.
 */
export async function requireAdminTokenId(): Promise<string> {
  const cookieStore = await cookies();
  const tokenId = await verifyAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  if (!tokenId) {
    throw new Error("UNAUTHORIZED");
  }
  return tokenId;
}
