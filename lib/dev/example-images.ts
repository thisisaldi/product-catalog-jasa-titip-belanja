/**
 * Development/demo placeholder photography ONLY — these are NOT the
 * client's real product photography. Centralized here so no component or
 * page ever hardcodes an image URL; the only place that reads this module
 * is the "add example images" admin action (lib/admin/actions/images.ts),
 * which downloads and stores them through the existing product_images /
 * Supabase Storage pipeline — the same path real photography uploads
 * through. Real photography replaces these later via the existing
 * upload/replace/delete admin UI, no code change required here.
 *
 * Freely-licensed Unsplash photos, picked for a rough category match and
 * visually spot-checked, not the client's brand.
 */
export const EXAMPLE_PRODUCT_IMAGES_BY_CATEGORY_SLUG: Record<string, string[]> = {
  pakaian: [
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1000&h=1250&fit=crop&q=80",
    "https://images.unsplash.com/photo-1445205170230-053b83016050?w=1000&h=1250&fit=crop&q=80",
    "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=1000&h=1250&fit=crop&q=80",
    "https://images.unsplash.com/photo-1560243563-062bfc001d68?w=1000&h=1250&fit=crop&q=80",
  ],
  tas: [
    "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1000&h=1250&fit=crop&q=80",
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1000&h=1250&fit=crop&q=80",
  ],
  sepatu: [
    "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=1000&h=1250&fit=crop&q=80",
    "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=1000&h=1250&fit=crop&q=80",
    "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=1000&h=1250&fit=crop&q=80",
    "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=1000&h=1250&fit=crop&q=80",
    "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=1000&h=1250&fit=crop&q=80",
  ],
  aksesoris: [
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1000&h=1250&fit=crop&q=80",
    "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=1000&h=1250&fit=crop&q=80",
    "https://images.unsplash.com/photo-1509941943102-10c232535736?w=1000&h=1250&fit=crop&q=80",
  ],
};

const FALLBACK_POOL = Object.values(EXAMPLE_PRODUCT_IMAGES_BY_CATEGORY_SLUG).flat();

/** Deterministic (not random) so repeated calls for the same product are stable. */
export function pickExampleImageUrls(categorySlug: string, count: number, skip: number = 0): string[] {
  const pool = EXAMPLE_PRODUCT_IMAGES_BY_CATEGORY_SLUG[categorySlug] ?? FALLBACK_POOL;
  return pool.slice(skip, skip + count);
}
