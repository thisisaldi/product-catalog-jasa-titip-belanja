"use server";

import { revalidatePath } from "next/cache";
import { requireAdminTokenId } from "@/lib/auth/guard";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "./taxonomy";

export type SaleItemInput = { productId: string; quantity: number };

export type CreateSaleInput = {
  customerName?: string;
  customerPhone?: string;
  note?: string;
  items: SaleItemInput[];
};

export type CreateSaleResult = ActionResult & { saleId?: string; invoiceNumber?: string };

/**
 * Thin wrapper around the create_sale() Postgres function (Milestone 3 —
 * approved additive migration) — all atomicity, consolidation, stock
 * validation, and lock ordering live in that one function (docs/01 Section
 * 12.1, docs/05 Section 6.1b/6.2). This layer only authenticates, does
 * cheap shape validation, and translates DB errors into clean messages —
 * it must never duplicate the transactional logic in application code.
 */
export async function createSale(input: CreateSaleInput): Promise<CreateSaleResult> {
  const tokenId = await requireAdminTokenId();

  if (!input.items || input.items.length === 0) {
    return { error: "Keranjang tidak boleh kosong." };
  }
  for (const item of input.items) {
    if (!item.productId) return { error: "Produk tidak valid." };
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return { error: "Jumlah harus bilangan bulat positif." };
    }
  }

  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase.rpc("create_sale", {
    // Generated RPC arg types don't reflect that these Postgres text params
    // accept NULL (same gap as adjust_stock's p_note, Milestone 2) — null
    // is valid at runtime.
    p_customer_name: (input.customerName?.trim() || null) as string,
    p_customer_phone: (input.customerPhone?.trim() || null) as string,
    p_note: (input.note?.trim() || null) as string,
    p_created_by: tokenId,
    p_items: input.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
  });

  if (error || !data || data.length === 0) {
    if (error?.message.includes("violates check constraint")) {
      return { error: "Stok tidak mencukupi untuk salah satu produk." };
    }
    if (error?.message.includes("product not found")) {
      return { error: "Salah satu produk yang dipilih sudah tidak ada." };
    }
    return { error: "Gagal membuat penjualan. Coba lagi." };
  }

  const sale = data[0];
  revalidatePath("/x7k9m2/penjualan");
  revalidatePath("/x7k9m2/produk");
  revalidatePath("/x7k9m2/inventaris");
  return { success: true, saleId: sale.id, invoiceNumber: sale.invoice_number };
}

/**
 * Thin wrapper around cancel_sale() — the guarded UPDATE + compensating IN
 * transaction (docs/01 Section 12.2, docs/05 Section 6.4) is entirely in
 * the function; this layer only authenticates and translates the single
 * failure mode (not found / already paid / already cancelled) into one
 * clean message, matching the generic-failure posture used elsewhere.
 */
export async function cancelSale(saleId: string): Promise<ActionResult> {
  const tokenId = await requireAdminTokenId();
  if (!saleId) return { error: "Penjualan tidak valid." };

  const supabase = createServiceRoleSupabaseClient();
  const { error } = await supabase.rpc("cancel_sale", {
    p_sale_id: saleId,
    p_cancelled_by: tokenId,
  });
  if (error) {
    return { error: "Penjualan tidak dapat dibatalkan (sudah dibayar, sudah dibatalkan, atau tidak ditemukan)." };
  }

  revalidatePath("/x7k9m2/penjualan");
  revalidatePath(`/x7k9m2/penjualan/${saleId}`);
  revalidatePath("/x7k9m2/produk");
  revalidatePath("/x7k9m2/inventaris");
  return { success: true };
}

/**
 * PENDING -> PAID only, guarded by the WHERE clause (05-database-design.md
 * Section 6.3) — a single UPDATE is already atomic as one statement, no RPC
 * needed. The guard makes a repeated call a safe no-op (0 rows matched)
 * rather than overwriting paid_at/paid_by a second time.
 */
export async function markSalePaid(saleId: string): Promise<ActionResult> {
  const tokenId = await requireAdminTokenId();
  if (!saleId) return { error: "Penjualan tidak valid." };

  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from("sales")
    .update({ payment_status: "PAID", paid_at: new Date().toISOString(), paid_by: tokenId })
    .eq("id", saleId)
    .eq("payment_status", "PENDING")
    .select("id")
    .maybeSingle();

  if (error) return { error: "Gagal menandai lunas. Coba lagi." };
  if (!data) return { error: "Penjualan sudah lunas atau tidak ditemukan." };

  revalidatePath("/x7k9m2/penjualan");
  revalidatePath(`/x7k9m2/penjualan/${saleId}`);
  return { success: true };
}
