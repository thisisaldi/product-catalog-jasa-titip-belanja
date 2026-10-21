"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { getSaleDetail, getSettings } from "@/lib/admin/queries";
import { buildInvoiceText } from "@/lib/sales/invoice";
import { checkRateLimit } from "@/lib/rate-limit";

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

const MAX_ITEMS_COUNT = 20;
const MAX_ITEM_QUANTITY = 20;
const MAX_TOTAL_QUANTITY = 50;

/**
 * Public counterpart to lib/admin/actions/sales.ts's createSale() — same
 * create_sale() RPC (05-database-design.md Section 6), same atomicity,
 * consolidation, and stock-check guarantees. Skips requireAdminTokenId()
 * because there is no admin session on the public site; attributes
 * created_by to a sentinel, permanently-revoked admin_access_tokens row
 * that exists solely as that column's required FK target (06-security.md
 * Section 4, Milestone 4 decision) — it authenticates nothing.
 *
 * Enforces rate limiting (06-security.md Section 13), product availability
 * verification against products_public view, and sanity caps on inputs.
 */
export async function createPublicSale(input: PublicCheckoutInput): Promise<PublicCheckoutResult> {
  // Rate limiting per client IP: max 5 requests per minute (06-security.md Section 13)
  const headerList = await headers();
  const clientIp =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    "unknown";

  if (!checkRateLimit(`checkout:${clientIp}`, 5, 60_000)) {
    return {
      error: "Terlalu banyak permintaan pemesanan. Silakan tunggu 1 menit lalu coba lagi.",
    };
  }

  if (!input.items || input.items.length === 0) {
    return { error: "Keranjang kosong." };
  }
  if (input.items.length > MAX_ITEMS_COUNT) {
    return { error: `Maksimal ${MAX_ITEMS_COUNT} jenis produk dalam satu pesanan.` };
  }

  let totalQty = 0;
  for (const item of input.items) {
    if (!item.productId) return { error: "Produk tidak valid." };
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return { error: "Jumlah harus bilangan bulat positif." };
    }
    if (item.quantity > MAX_ITEM_QUANTITY) {
      return { error: `Maksimal ${MAX_ITEM_QUANTITY} unit per produk.` };
    }
    totalQty += item.quantity;
  }

  if (totalQty > MAX_TOTAL_QUANTITY) {
    return { error: `Maksimal total ${MAX_TOTAL_QUANTITY} produk dalam satu pesanan.` };
  }

  const customerName = input.customerName.trim();
  const customerPhone = input.customerPhone.trim();
  if (!customerName || customerName.length < 2) {
    return { error: "Nama minimal 2 karakter." };
  }
  if (customerName.length > 100) {
    return { error: "Nama terlalu panjang (maksimal 100 karakter)." };
  }

  const normalizedPhone = customerPhone.replace(/[\s-]/g, "");
  if (!/^\+?[0-9]{8,20}$/.test(normalizedPhone)) {
    return {
      error: "Nomor WhatsApp tidak valid (contoh: 08123456789 atau +628123456789).",
    };
  }

  if (input.note && input.note.trim().length > 500) {
    return { error: "Catatan terlalu panjang (maksimal 500 karakter)." };
  }

  const attributionTokenId = process.env.PUBLIC_SALE_ATTRIBUTION_TOKEN_ID;
  if (!attributionTokenId) {
    return { error: "Pemesanan sedang tidak tersedia. Silakan hubungi kami langsung via WhatsApp." };
  }

  const supabase = createServiceRoleSupabaseClient();

  // Verification against products_public view (Fix A1):
  // Verifies products are ACTIVE and currently available (stock > 0 and not is_manually_unavailable)
  const productIds = input.items.map((i) => i.productId);
  const { data: publicProducts, error: prodError } = await supabase
    .from("products_public")
    .select("id, name, slug, is_available")
    .in("id", productIds);

  if (prodError || !publicProducts) {
    return { error: "Gagal memeriksa ketersediaan produk. Silakan coba lagi." };
  }

  const publicMap = new Map(publicProducts.map((p) => [p.id, p]));
  for (const item of input.items) {
    const prod = publicMap.get(item.productId);
    if (!prod) {
      return {
        error: "Salah satu produk di keranjang sudah tidak aktif atau diarsipkan.",
      };
    }
    if (!prod.is_available) {
      return {
        error: `Produk "${prod.name}" saat ini stok habis atau sedang tidak tersedia.`,
      };
    }
  }

  const { data, error } = await supabase.rpc("create_sale", {
    p_customer_name: customerName,
    p_customer_phone: customerPhone,
    p_note: (input.note?.trim() || null) as string,
    p_created_by: attributionTokenId,
    p_items: input.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
  });

  if (error || !data || data.length === 0) {
    if (error?.message.includes("violates check constraint")) {
      return {
        error: "Maaf, stok salah satu produk tidak mencukupi untuk jumlah yang diminta. Silakan kurangi jumlah di keranjang.",
      };
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

  // Revalidate public catalog and admin dashboard so stock numbers reflect immediately
  revalidatePath("/");
  for (const p of publicProducts) {
    revalidatePath(`/produk/${p.slug}`);
  }
  revalidatePath("/x7k9m2/penjualan");
  revalidatePath("/x7k9m2/inventaris");
  revalidatePath("/x7k9m2/produk");

  const invoiceText = buildInvoiceText(sale, settings.invoiceMessageTemplate);
  return {
    success: true,
    invoiceNumber: sale.invoiceNumber,
    invoiceText,
    whatsappNumber: settings.whatsappNumber,
  };
}
