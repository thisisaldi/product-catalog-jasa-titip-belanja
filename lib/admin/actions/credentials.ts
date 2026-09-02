"use server";

import { revalidatePath } from "next/cache";
import { requireAdminTokenId } from "@/lib/auth/guard";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { generateBootstrapSecret, hashSecret } from "@/lib/auth/crypto";
import type { ActionResult } from "./taxonomy";

export type Credential = {
  id: string;
  label: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  isExpired: boolean;
};

export async function listCredentials(): Promise<Credential[]> {
  await requireAdminTokenId();
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from("admin_access_tokens")
    .select("id, label, created_at, expires_at, revoked_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const now = Date.now();
  return data.map((t) => ({
    id: t.id,
    label: t.label,
    createdAt: t.created_at,
    expiresAt: t.expires_at,
    revokedAt: t.revoked_at,
    isExpired: new Date(t.expires_at).getTime() <= now,
  }));
}

/** Returns the one-time bootstrap secret — shown once, never stored (05 Section 2.1). */
export async function issueCredential(
  _prev: ActionResult & { secret?: string },
  formData: FormData,
): Promise<ActionResult & { secret?: string }> {
  await requireAdminTokenId();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { error: "Label wajib diisi." };
  if (label.length > 200) return { error: "Label maksimal 200 karakter." };

  const secret = generateBootstrapSecret();
  const tokenHash = await hashSecret(secret);

  const supabase = createServiceRoleSupabaseClient();
  const { error } = await supabase.from("admin_access_tokens").insert({
    label,
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (error) return { error: "Gagal membuat kredensial. Coba lagi." };

  revalidatePath("/admin/kredensial");
  return { success: true, secret };
}

export async function revokeCredential(id: string): Promise<ActionResult> {
  await requireAdminTokenId();
  const supabase = createServiceRoleSupabaseClient();
  const { error } = await supabase
    .from("admin_access_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: "Gagal mencabut kredensial. Coba lagi." };
  revalidatePath("/admin/kredensial");
  return { success: true };
}
