"use server";

import { revalidatePath } from "next/cache";
import { requireAdminTokenId } from "@/lib/auth/guard";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { PRODUCT_IMAGES_BUCKET } from "@/lib/supabase/storage";
import { pickExampleImageUrls } from "@/lib/dev/example-images";
import type { ActionResult } from "./taxonomy";

const MAX_IMAGES_PER_PRODUCT = 5;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Server-side allow-list validated against the file's actual bytes
 * (05-database-design.md Section 4a.5) — never the client-supplied
 * Content-Type header alone.
 */
function sniffImageType(bytes: Uint8Array): { mime: string; ext: string } | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a
  ) {
    return { mime: "image/png", ext: "png" };
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

export async function uploadProductImage(productId: string, formData: FormData): Promise<ActionResult> {
  await requireAdminTokenId();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Pilih file gambar." };
  if (file.size > MAX_FILE_SIZE_BYTES) return { error: "Ukuran file maksimal 5MB." };

  const buffer = new Uint8Array(await file.arrayBuffer());
  const detected = sniffImageType(buffer);
  if (!detected) return { error: "Format file tidak didukung (hanya JPEG, PNG, WEBP)." };

  const supabase = createServiceRoleSupabaseClient();

  const { count, error: countError } = await supabase
    .from("product_images")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);
  if (countError) return { error: "Gagal memeriksa jumlah gambar. Coba lagi." };
  if ((count ?? 0) >= MAX_IMAGES_PER_PRODUCT) {
    return { error: `Maksimal ${MAX_IMAGES_PER_PRODUCT} gambar per produk.` };
  }

  // Server-generated path, never the client's filename (05 Section 4a.2) —
  // closes path-traversal and filename-collision/overwrite risk structurally.
  const objectPath = `${productId}/${crypto.randomUUID()}.${detected.ext}`;
  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(objectPath, buffer, { contentType: detected.mime });
  if (uploadError) return { error: "Gagal mengunggah gambar. Coba lagi." };

  const { data: maxSortRow } = await supabase
    .from("product_images")
    .select("sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = maxSortRow ? maxSortRow.sort_order + 1 : 0;

  const { error: insertError } = await supabase.from("product_images").insert({
    product_id: productId,
    url: objectPath,
    sort_order: nextSortOrder,
    is_primary: (count ?? 0) === 0,
  });
  if (insertError) {
    // Roll back the just-uploaded object so we don't leave an unreferenced
    // file if the DB insert failed after the upload succeeded.
    await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([objectPath]);
    return { error: "Gagal menyimpan data gambar. Coba lagi." };
  }

  revalidatePath(`/x7k9m2/produk/${productId}`);
  return { success: true };
}

export async function replaceProductImage(
  imageId: string,
  productId: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdminTokenId();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Pilih file gambar." };
  if (file.size > MAX_FILE_SIZE_BYTES) return { error: "Ukuran file maksimal 5MB." };

  const buffer = new Uint8Array(await file.arrayBuffer());
  const detected = sniffImageType(buffer);
  if (!detected) return { error: "Format file tidak didukung (hanya JPEG, PNG, WEBP)." };

  const supabase = createServiceRoleSupabaseClient();
  const { data: existing, error: existingError } = await supabase
    .from("product_images")
    .select("url")
    .eq("id", imageId)
    .eq("product_id", productId)
    .maybeSingle();
  if (existingError || !existing) return { error: "Gambar tidak ditemukan." };

  // Upload-then-update-then-delete-old, in that order (05 Section 4a.7) — a
  // mid-operation failure never leaves product_images.url pointing at nothing.
  const newPath = `${productId}/${crypto.randomUUID()}.${detected.ext}`;
  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(newPath, buffer, { contentType: detected.mime });
  if (uploadError) return { error: "Gagal mengunggah gambar. Coba lagi." };

  const { error: updateError } = await supabase
    .from("product_images")
    .update({ url: newPath })
    .eq("id", imageId);
  if (updateError) {
    await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([newPath]);
    return { error: "Gagal memperbarui gambar. Coba lagi." };
  }

  // Old object cleanup is best-effort — a failure here is a logged stray
  // file, not a request failure (05 Section 4a.7's explicit tradeoff).
  await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([existing.url]);

  revalidatePath(`/x7k9m2/produk/${productId}`);
  return { success: true };
}

export async function deleteProductImage(imageId: string, productId: string): Promise<ActionResult> {
  await requireAdminTokenId();
  const supabase = createServiceRoleSupabaseClient();
  const { data: existing } = await supabase
    .from("product_images")
    .select("url, is_primary")
    .eq("id", imageId)
    .eq("product_id", productId)
    .maybeSingle();
  if (!existing) return { error: "Gambar tidak ditemukan." };

  // Delete the DB row first, storage object after — a failed storage delete
  // leaves a harmless orphaned file, never a DB row pointing at nothing.
  const { error: deleteError } = await supabase.from("product_images").delete().eq("id", imageId);
  if (deleteError) return { error: "Gagal menghapus gambar. Coba lagi." };
  await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([existing.url]);

  if (existing.is_primary) {
    const { data: next } = await supabase
      .from("product_images")
      .select("id")
      .eq("product_id", productId)
      .order("sort_order")
      .limit(1)
      .maybeSingle();
    if (next) {
      await supabase.from("product_images").update({ is_primary: true }).eq("id", next.id);
    }
  }

  revalidatePath(`/x7k9m2/produk/${productId}`);
  return { success: true };
}

export async function setPrimaryImage(imageId: string, productId: string): Promise<ActionResult> {
  await requireAdminTokenId();
  const supabase = createServiceRoleSupabaseClient();
  // Unset the current primary first — the partial unique index allows zero
  // primaries transiently but never two, so old-off-then-new-on is the only
  // safe order for two separate statements.
  await supabase.from("product_images").update({ is_primary: false }).eq("product_id", productId).eq("is_primary", true);
  const { error } = await supabase.from("product_images").update({ is_primary: true }).eq("id", imageId);
  if (error) return { error: "Gagal mengatur gambar utama. Coba lagi." };
  revalidatePath(`/x7k9m2/produk/${productId}`);
  return { success: true };
}

export async function reorderProductImages(
  productId: string,
  orderedImageIds: string[],
): Promise<ActionResult> {
  await requireAdminTokenId();
  const supabase = createServiceRoleSupabaseClient();
  for (let i = 0; i < orderedImageIds.length; i++) {
    const { error } = await supabase
      .from("product_images")
      .update({ sort_order: i })
      .eq("id", orderedImageIds[i])
      .eq("product_id", productId);
    if (error) return { error: "Gagal mengubah urutan gambar. Coba lagi." };
  }
  revalidatePath(`/x7k9m2/produk/${productId}`);
  return { success: true };
}

/**
 * Development-only helper: fills empty image slots with example/placeholder
 * photography (lib/dev/example-images.ts) through the exact same
 * upload/validate/insert path as a real admin upload — never the client's
 * real photography, and fully replaceable later through the ordinary
 * upload/replace/delete actions above. Not exposed anywhere on the public
 * site; only reachable from the admin image manager.
 */
export async function addExampleImages(productId: string, categorySlug: string): Promise<ActionResult> {
  await requireAdminTokenId();
  const supabase = createServiceRoleSupabaseClient();

  const { count, error: countError } = await supabase
    .from("product_images")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);
  if (countError) return { error: "Gagal memeriksa jumlah gambar. Coba lagi." };
  const existing = count ?? 0;
  if (existing >= MAX_IMAGES_PER_PRODUCT) {
    return { error: `Maksimal ${MAX_IMAGES_PER_PRODUCT} gambar per produk.` };
  }

  const urls = pickExampleImageUrls(categorySlug, Math.min(2, MAX_IMAGES_PER_PRODUCT - existing));
  if (urls.length === 0) return { error: "Tidak ada gambar contoh untuk kategori ini." };

  let added = 0;
  for (const url of urls) {
    const response = await fetch(url);
    if (!response.ok) continue;
    const buffer = new Uint8Array(await response.arrayBuffer());
    const detected = sniffImageType(buffer);
    if (!detected) continue;

    const objectPath = `${productId}/${crypto.randomUUID()}.${detected.ext}`;
    const { error: uploadError } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(objectPath, buffer, { contentType: detected.mime });
    if (uploadError) continue;

    const { error: insertError } = await supabase.from("product_images").insert({
      product_id: productId,
      url: objectPath,
      sort_order: existing + added,
      is_primary: existing + added === 0,
    });
    if (insertError) {
      await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([objectPath]);
      continue;
    }
    added += 1;
  }

  if (added === 0) return { error: "Gagal mengambil gambar contoh. Coba lagi." };

  revalidatePath(`/x7k9m2/produk/${productId}`);
  return { success: true };
}
