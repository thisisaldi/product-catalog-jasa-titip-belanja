"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminTokenId } from "@/lib/auth/guard";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "./taxonomy";

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type ProductInput = {
  name: string;
  brandId: string;
  categoryId: string;
  description: string;
  price: string;
  isManuallyUnavailable: boolean;
};

function readProductInput(formData: FormData): ProductInput {
  return {
    name: String(formData.get("name") ?? "").trim(),
    brandId: String(formData.get("brandId") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    description: String(formData.get("description") ?? "").trim(),
    price: String(formData.get("price") ?? ""),
    isManuallyUnavailable: formData.get("isManuallyUnavailable") === "on",
  };
}

async function validateProductInput(input: ProductInput): Promise<string | null> {
  if (!input.name) return "Nama produk wajib diisi.";
  if (input.name.length > 200) return "Nama produk maksimal 200 karakter.";
  if (!input.brandId) return "Merek wajib dipilih.";
  if (!input.categoryId) return "Kategori wajib dipilih.";

  const price = Number(input.price);
  if (!Number.isFinite(price) || price < 0) return "Harga harus angka dan tidak boleh negatif.";
  if (price > 9_999_999_999) return "Harga terlalu besar.";

  // 06-security.md Section 10: category/brand references must exist and be
  // ACTIVE for a new product assignment — guards a stale/tampered client
  // request naming an archived or nonexistent id.
  const supabase = createServiceRoleSupabaseClient();
  const [{ data: brand }, { data: category }] = await Promise.all([
    supabase.from("brands").select("id").eq("id", input.brandId).eq("status", "ACTIVE").maybeSingle(),
    supabase.from("categories").select("id").eq("id", input.categoryId).eq("status", "ACTIVE").maybeSingle(),
  ]);
  if (!brand) return "Merek tidak ditemukan atau sudah diarsipkan.";
  if (!category) return "Kategori tidak ditemukan atau sudah diarsipkan.";

  return null;
}

export async function createProduct(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdminTokenId();
  const input = readProductInput(formData);
  const validationError = await validateProductInput(input);
  if (validationError) return { error: validationError };

  const slug = slugify(input.name);
  if (!slug) return { error: "Nama harus mengandung huruf atau angka." };

  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .insert({
      name: input.name,
      slug,
      brand_id: input.brandId,
      category_id: input.categoryId,
      description: input.description || null,
      price: Number(input.price),
      is_manually_unavailable: input.isManuallyUnavailable,
    })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.code === "23505") return { error: "Slug produk sudah digunakan — coba nama lain." };
    return { error: "Gagal menyimpan produk. Coba lagi." };
  }
  revalidatePath("/x7k9m2/produk");
  // Creation is two steps (05-database-design.md Section 4): save the
  // product row, then manage images — send the admin straight to the image
  // manager rather than leaving them on a form with no visible outcome.
  redirect(`/x7k9m2/produk/${data.id}`);
}

export async function updateProduct(
  id: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdminTokenId();
  const input = readProductInput(formData);
  const validationError = await validateProductInput(input);
  if (validationError) return { error: validationError };

  const slug = slugify(input.name);
  if (!slug) return { error: "Nama harus mengandung huruf atau angka." };

  const supabase = createServiceRoleSupabaseClient();
  const { error } = await supabase
    .from("products")
    .update({
      name: input.name,
      slug,
      brand_id: input.brandId,
      category_id: input.categoryId,
      description: input.description || null,
      price: Number(input.price),
      is_manually_unavailable: input.isManuallyUnavailable,
    })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") return { error: "Slug produk sudah digunakan — coba nama lain." };
    return { error: "Gagal menyimpan produk. Coba lagi." };
  }
  revalidatePath("/x7k9m2/produk");
  revalidatePath(`/x7k9m2/produk/${id}`);
  return { success: true };
}

export async function setProductStatus(id: string, status: "ACTIVE" | "INACTIVE"): Promise<ActionResult> {
  await requireAdminTokenId();
  const supabase = createServiceRoleSupabaseClient();
  // Never a DELETE — archive/restore only (05-database-design.md Section 12).
  const { error } = await supabase.from("products").update({ status }).eq("id", id);
  if (error) return { error: "Gagal mengubah status. Coba lagi." };
  revalidatePath("/x7k9m2/produk");
  revalidatePath(`/x7k9m2/produk/${id}`);
  return { success: true };
}
