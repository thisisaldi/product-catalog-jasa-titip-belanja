import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Server-side anon (publishable-key) client — RLS-scoped, used by public
 * route handlers/Server Components for catalog reads (06-security.md Section 1).
 */
export function createAnonSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

/**
 * Server-only, service-role client. Bypasses RLS entirely — only ever call this
 * from code that already sits behind the admin access-control middleware
 * (06-security.md Section 5: RLS is not a safety net for a forgotten check here).
 * The `server-only` import above makes accidentally bundling this file into a
 * client component a build-time error, not a runtime leak.
 */
export function createServiceRoleSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
