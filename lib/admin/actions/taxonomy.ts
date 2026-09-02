"use server";

import { revalidatePath } from "next/cache";
import { requireAdminTokenId } from "@/lib/auth/guard";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

export type ActionResult = { error?: string; success?: true };

type Table = "brands" | "categories";

const PATH_BY_TABLE: Record<Table, string> = {
  brands: "/admin/merek",
  categories: "/admin/kategori",
};

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function validateName(name: string): string | null {
  if (!name) return "Nama wajib diisi.";
  if (name.length > 200) return "Nama maksimal 200 karakter.";
  return null;
}

async function createEntry(table: Table, formData: FormData): Promise<ActionResult> {
  await requireAdminTokenId();
  const name = String(formData.get("name") ?? "").trim();
  const nameError = validateName(name);
  if (nameError) return { error: nameError };

  const slug = slugify(name);
  if (!slug) return { error: "Nama harus mengandung huruf atau angka." };

  const supabase = createServiceRoleSupabaseClient();
  const { error } = await supabase.from(table).insert({ name, slug });
  if (error) {
    if (error.code === "23505") return { error: "Nama atau slug sudah digunakan." };
    return { error: "Gagal menyimpan. Coba lagi." };
  }
  revalidatePath(PATH_BY_TABLE[table]);
  return { success: true };
}

async function updateEntry(table: Table, id: string, formData: FormData): Promise<ActionResult> {
  await requireAdminTokenId();
  const name = String(formData.get("name") ?? "").trim();
  const nameError = validateName(name);
  if (nameError) return { error: nameError };

  const slug = slugify(name);
  if (!slug) return { error: "Nama harus mengandung huruf atau angka." };

  const supabase = createServiceRoleSupabaseClient();
  const { error } = await supabase.from(table).update({ name, slug }).eq("id", id);
  if (error) {
    if (error.code === "23505") return { error: "Nama atau slug sudah digunakan." };
    return { error: "Gagal menyimpan. Coba lagi." };
  }
  revalidatePath(PATH_BY_TABLE[table]);
  return { success: true };
}

async function setStatus(table: Table, id: string, status: "ACTIVE" | "INACTIVE"): Promise<ActionResult> {
  await requireAdminTokenId();
  const supabase = createServiceRoleSupabaseClient();
  // Never a DELETE — archive/restore is the only lifecycle operation
  // (05-database-design.md Section 3.3).
  const { error } = await supabase.from(table).update({ status }).eq("id", id);
  if (error) return { error: "Gagal mengubah status. Coba lagi." };
  revalidatePath(PATH_BY_TABLE[table]);
  return { success: true };
}

export async function createBrand(_prev: ActionResult, formData: FormData) {
  return createEntry("brands", formData);
}
export async function updateBrand(id: string, _prev: ActionResult, formData: FormData) {
  return updateEntry("brands", id, formData);
}
export async function archiveBrand(id: string) {
  return setStatus("brands", id, "INACTIVE");
}
export async function restoreBrand(id: string) {
  return setStatus("brands", id, "ACTIVE");
}

export async function createCategory(_prev: ActionResult, formData: FormData) {
  return createEntry("categories", formData);
}
export async function updateCategory(id: string, _prev: ActionResult, formData: FormData) {
  return updateEntry("categories", id, formData);
}
export async function archiveCategory(id: string) {
  return setStatus("categories", id, "INACTIVE");
}
export async function restoreCategory(id: string) {
  return setStatus("categories", id, "ACTIVE");
}
