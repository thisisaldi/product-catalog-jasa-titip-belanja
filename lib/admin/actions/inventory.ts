"use server";

import { revalidatePath } from "next/cache";
import { requireAdminTokenId } from "@/lib/auth/guard";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "./taxonomy";

/**
 * Manual Stock In/Out only — this is not a sale (Milestone 3 scope). Calls
 * the adjust_stock() Postgres function so the cached_stock update and the
 * inventory_transactions insert commit atomically in one call
 * (05-database-design.md Section 5.3/5.4) — the only way to get real
 * transactional atomicity over the Data API (no direct Postgres connection
 * is available to this app).
 */
export async function adjustStock(formData: FormData): Promise<ActionResult> {
  const tokenId = await requireAdminTokenId();

  const productId = String(formData.get("productId") ?? "");
  const type = String(formData.get("type") ?? "");
  const quantityRaw = String(formData.get("quantity") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!productId) return { error: "Produk wajib dipilih." };
  if (type !== "IN" && type !== "OUT") return { error: "Jenis transaksi tidak valid." };

  const quantity = Number(quantityRaw);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { error: "Jumlah harus berupa bilangan bulat positif." };
  }

  const supabase = createServiceRoleSupabaseClient();

  if (type === "OUT") {
    // Fast client-facing feedback before the round trip — the RPC's own
    // CHECK(cached_stock >= 0) is the real, race-safe guarantee (Section 5.3).
    const { data: product } = await supabase
      .from("products")
      .select("cached_stock")
      .eq("id", productId)
      .maybeSingle();
    if (product && product.cached_stock < quantity) {
      return { error: `Stok tidak mencukupi (tersedia: ${product.cached_stock}).` };
    }
  }

  const { error } = await supabase.rpc("adjust_stock", {
    p_product_id: productId,
    p_type: type,
    p_quantity: quantity,
    // Generated RPC arg types don't reflect that this Postgres text param
    // accepts NULL (no DEFAULT/nullability metadata surfaces through
    // `supabase gen types` for function args) — null is valid at runtime.
    p_note: (note || null) as string,
    p_created_by: tokenId,
  });

  if (error) {
    // The RPC's CHECK(cached_stock >= 0) failure surfaces here as a Postgres
    // error under real concurrent writes — a clean message, not a raw one.
    if (error.message.includes("violates check constraint")) {
      return { error: "Stok tidak mencukupi untuk transaksi ini." };
    }
    return { error: "Gagal menyimpan transaksi stok. Coba lagi." };
  }

  revalidatePath("/admin/inventaris");
  revalidatePath("/admin/produk");
  return { success: true };
}
