import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Browser-safe client — publishable key only, RLS-scoped. Never import
 * service-role here. Used by client components that need to re-fetch public
 * catalog data (e.g. Load More).
 */
export function createBrowserSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
