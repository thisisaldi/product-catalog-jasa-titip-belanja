import "server-only";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { parseSessionCookieValue } from "./session";

/**
 * Full validation of a session cookie value: signature, then a fresh DB
 * check of revoked_at/expires_at (06-security.md Section 2.4 — re-checked on
 * every request, not cached from bootstrap). Returns the token id on
 * success, never partial/assumed validity.
 */
export async function verifyAdminSession(cookieValue: string | undefined): Promise<string | null> {
  if (!cookieValue) return null;
  const session = await parseSessionCookieValue(cookieValue);
  if (!session) return null;

  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from("admin_access_tokens")
    .select("id")
    .eq("id", session.tokenId)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) return null;
  return session.tokenId;
}
