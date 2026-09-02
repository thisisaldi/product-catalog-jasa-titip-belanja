export const PRODUCT_IMAGES_BUCKET = "product-images";

/**
 * product_images.url stores the Storage object path (05-database-design.md
 * Section 2.5/4a.2), not a full URL. The bucket is public-read (4a.1), so the
 * public URL is a plain deterministic join — no signed URL, no privileged call.
 */
export function getPublicImageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${path}`;
}
