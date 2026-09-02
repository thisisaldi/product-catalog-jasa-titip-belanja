"use server";

import { getCatalogPage } from "./queries";
import type { Availability, Product } from "./types";

/**
 * Thin Server Action wrapper so the client-side filter/search/Load More UI
 * can re-fetch a page without duplicating the search/filter query-building
 * logic in queries.ts on the client (that logic depends on server-only
 * Supabase clients — CLAUDE.md Section 3's reuse principle over the
 * frontend plan's alternative suggestion of a direct client-side anon call).
 */
export async function fetchCatalogPage(params: {
  query?: string;
  categorySlugs?: string[];
  brandSlugs?: string[];
  availability?: Availability;
  cursor?: string;
}): Promise<{ products: Product[]; nextCursor: string | null }> {
  return getCatalogPage(params);
}
