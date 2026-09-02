"use server";

import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { getSaleDetail, getSettings } from "@/lib/admin/queries";
import { buildInvoiceText } from "@/lib/sales/invoice";

export type PublicCheckoutItem = { productId: string; quantity: number };

export type PublicCheckoutInput = {
  customerName: string;
  customerPhone: string;
  note?: string;
  items: PublicCheckoutItem[];
};

export type PublicCheckoutResult =
  | { success: true; invoiceNumber: string; invoiceText: string; whatsappNumber: string | null }
  | { error: string };

/**
 * Public counterpart to lib/admin/actions/sales.ts's createSale() — same
 * create_sale() RPC (05-database-design.md Section 6), same atomicity,
 * consolidation, and stock-check guarantees. Skips requireAdminTokenId()
 * because there is no admin session on the public site; attributes
 * created_by to a sentinel, permanently-revoked admin_access_tokens row
 * that exists solely as that column's required FK target (06-security.md
 * Section 4, Milestone 4 decision) — it authenticates nothing.
 *
 * Never trusts client-supplied price/stock/invoice-number/attribution —
 * only product_id/quantity/customer_name/customer_phone/note, identical to
 * the admin path's input surface.
 */
export async function createPublicSale(input: PublicCheckoutInput): Promise<PublicCheckoutResult> {
  if (!input.items || input.items.length === 0) {
    return { error: "Keranjang kosong." };
  }
  for (const item of input.items) {
    if (!item.productId) return { error: "Produk tidak valid." };
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return { error: "Jumlah harus bilangan bulat positif." };
    }
  }

  const customerName = input.customerName.trim();
  const customerPhone = input.customerPhone.trim();
  if (!customerName) return { error: "Nama wajib diisi." };
  if (customerName.length > 200) return { error: "Nama terlalu panjang." };
  if (!customerPhone) return { error: "Nomor WhatsApp wajib diisi." };
  if (customerPhone.length > 30) return { error: "Nomor WhatsApp tidak valid." };

  const attributionTokenId = process.env.PUBLIC_SALE_ATTRIBUTION_TOKEN_ID;
  if (!attributionTokenId) {
    return { error: "Pemesanan sedang tidak tersedia. Silakan hubungi kami langsung via WhatsApp." };
  }

  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase.rpc("create_sale", {
    p_customer_name: customerName,
    p_customer_phone: customerPhone,
    // Generated RPC arg types don't reflect that this Postgres text param
    // accepts NULL (same gap noted for adjust_stock/create_sale in the
    // admin actions) — null is valid at runtime.
    p_note: (input.note?.trim() || null) as string,
    p_created_by: attributionTokenId,
    p_items: input.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
  });

  if (error || !data || data.length === 0) {
    if (error?.message.includes("violates check constraint")) {
      return { error: "Maaf, stok salah satu produk tidak mencukupi. Silakan sesuaikan jumlah." };
    }
    if (error?.message.includes("product not found")) {
      return { error: "Salah satu produk sudah tidak tersedia." };
    }
    return { error: "Gagal membuat pesanan. Coba lagi." };
  }

  const saleId = data[0].id;
  const [sale, settings] = await Promise.all([getSaleDetail(saleId), getSettings()]);
  if (!sale || !settings) {
    return {
      error: "Pesanan berhasil dibuat, tetapi gagal memuat invoice. Silakan hubungi kami via WhatsApp.",
    };
  }

  const invoiceText = buildInvoiceText(sale, settings.invoiceMessageTemplate);
  return {
    success: true,
    invoiceNumber: sale.invoiceNumber,
    invoiceText,
    whatsappNumber: settings.whatsappNumber,
  };
}
