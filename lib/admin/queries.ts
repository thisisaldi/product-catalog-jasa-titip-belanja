import "server-only";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { getPublicImageUrl } from "@/lib/supabase/storage";
import type {
  AdminProduct,
  AdminProductImage,
  AdminSettings,
  AdminTaxonomy,
  InventoryTransaction,
  PaymentStatus,
  SaleDetail,
  SaleListItem,
  SaleStatus,
  SellableProduct,
} from "./types";

/**
 * Admin reads always use service_role against the base tables directly —
 * never products_public (that view exists for the public boundary only,
 * 04-system-design.md Section 8.1). Every call here must sit behind
 * requireAdminTokenId() at the call site (Server Action/Route Handler).
 */

export async function listBrands(): Promise<AdminTaxonomy[]> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from("brands")
    .select("id, name, slug, status, created_at")
    .order("name");
  if (error) throw error;
  return data.map((b) => ({ id: b.id, name: b.name, slug: b.slug, status: b.status as "ACTIVE" | "INACTIVE", createdAt: b.created_at }));
}

export async function listCategories(): Promise<AdminTaxonomy[]> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, status, created_at")
    .order("name");
  if (error) throw error;
  return data.map((c) => ({ id: c.id, name: c.name, slug: c.slug, status: c.status as "ACTIVE" | "INACTIVE", createdAt: c.created_at }));
}

export async function listActiveBrandsForSelect(): Promise<Pick<AdminTaxonomy, "id" | "name">[]> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from("brands")
    .select("id, name")
    .eq("status", "ACTIVE")
    .order("name");
  if (error) throw error;
  return data;
}

export async function listActiveCategoriesForSelect(): Promise<Pick<AdminTaxonomy, "id" | "name">[]> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .eq("status", "ACTIVE")
    .order("name");
  if (error) throw error;
  return data;
}

function mapProductRow(row: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  status: string;
  is_manually_unavailable: boolean;
  cached_stock: number;
  created_at: string;
  updated_at: string;
  brand: { id: string; name: string; slug: string } | null;
  category: { id: string; name: string; slug: string } | null;
}): AdminProduct | null {
  if (!row.brand || !row.category) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: Number(row.price),
    status: row.status as "ACTIVE" | "INACTIVE",
    isManuallyUnavailable: row.is_manually_unavailable,
    cachedStock: row.cached_stock,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    brand: row.brand,
    category: row.category,
  };
}

/** products is a real table (unlike products_public), so FK-relationship embedding works. */
const PRODUCT_SELECT =
  "id, name, slug, description, price, status, is_manually_unavailable, cached_stock, created_at, updated_at, brand:brands(id, name, slug), category:categories(id, name, slug)";

export async function listProducts(): Promise<AdminProduct[]> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data
    .map((row) => mapProductRow(row as unknown as Parameters<typeof mapProductRow>[0]))
    .filter((p): p is AdminProduct => p !== null);
}

export async function getProductById(id: string): Promise<AdminProduct | null> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapProductRow(data as unknown as Parameters<typeof mapProductRow>[0]);
}

export async function listProductImages(productId: string): Promise<AdminProductImage[]> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from("product_images")
    .select("id, url, alt_text, sort_order, is_primary")
    .eq("product_id", productId)
    .order("sort_order");
  if (error) throw error;
  return data.map((img) => ({
    id: img.id,
    url: getPublicImageUrl(img.url),
    altText: img.alt_text,
    sortOrder: img.sort_order,
    isPrimary: img.is_primary,
  }));
}

export async function listProductsForInventoryPicker(): Promise<
  { id: string; name: string; cachedStock: number }[]
> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, cached_stock")
    .order("name");
  if (error) throw error;
  return data.map((p) => ({ id: p.id, name: p.name, cachedStock: p.cached_stock }));
}

export async function listInventoryHistory(productId?: string): Promise<InventoryTransaction[]> {
  const supabase = createServiceRoleSupabaseClient();
  let builder = supabase
    .from("inventory_transactions")
    .select("id, product_id, type, quantity, note, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (productId) builder = builder.eq("product_id", productId);
  const { data, error } = await builder;
  if (error) throw error;
  return data.map((t) => ({
    id: t.id,
    productId: t.product_id,
    type: t.type as "IN" | "OUT",
    quantity: t.quantity,
    note: t.note,
    createdAt: t.created_at,
  }));
}

export async function getSettings(): Promise<AdminSettings | null> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from("settings")
    .select(
      "whatsapp_number, order_message_template, availability_message_template, invoice_message_template, updated_at",
    )
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    whatsappNumber: data.whatsapp_number,
    orderMessageTemplate: data.order_message_template,
    availabilityMessageTemplate: data.availability_message_template,
    invoiceMessageTemplate: data.invoice_message_template,
    updatedAt: data.updated_at,
  };
}

export async function getDashboardStats() {
  const supabase = createServiceRoleSupabaseClient();
  const [{ count: activeProducts }, { count: lowStockCount }, { count: outOfStockCount }] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("status", "ACTIVE")
      .gt("cached_stock", 0)
      .lte("cached_stock", 5),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("status", "ACTIVE")
      .eq("cached_stock", 0),
  ]);
  return {
    activeProducts: activeProducts ?? 0,
    lowStockCount: lowStockCount ?? 0,
    outOfStockCount: outOfStockCount ?? 0,
  };
}

/**
 * Products the admin can pick when composing a sale. Only ACTIVE products
 * are surfaced here — a UI-layer choice for a sensible picker list, not a
 * DB constraint (01/04/05 don't gate sale eligibility on products.status;
 * see create_sale()'s own comment). An archived product already on an
 * existing sale still displays correctly there via the persisted snapshot.
 */
export async function listSellableProducts(): Promise<SellableProduct[]> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, price, cached_stock, product_images(url, is_primary)")
    .eq("status", "ACTIVE")
    .order("name");
  if (error) throw error;
  return data.map((p) => {
    const images = p.product_images as { url: string; is_primary: boolean }[];
    const primary = images.find((img) => img.is_primary) ?? images[0];
    return {
      id: p.id,
      name: p.name,
      price: Number(p.price),
      cachedStock: p.cached_stock,
      primaryImageUrl: primary ? getPublicImageUrl(primary.url) : null,
    };
  });
}

type SaleListFilters = {
  query?: string;
  paymentStatus?: PaymentStatus | "all";
  saleStatus?: SaleStatus | "all";
};

export async function listSales(filters: SaleListFilters = {}): Promise<SaleListItem[]> {
  const supabase = createServiceRoleSupabaseClient();
  let builder = supabase
    .from("sales")
    .select("id, invoice_number, customer_name, created_at, payment_status, sale_status, sale_items(subtotal)")
    .order("created_at", { ascending: false });

  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    builder = builder.eq("payment_status", filters.paymentStatus);
  }
  if (filters.saleStatus && filters.saleStatus !== "all") {
    builder = builder.eq("sale_status", filters.saleStatus);
  }
  const trimmedQuery = filters.query?.trim();
  if (trimmedQuery) {
    const escaped = trimmedQuery.replace(/[%,()]/g, "");
    builder = builder.or(`invoice_number.ilike.%${escaped}%,customer_name.ilike.%${escaped}%`);
  }

  const { data, error } = await builder;
  if (error) throw error;

  return data.map((s) => {
    const items = s.sale_items as { subtotal: number }[];
    const total = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
    return {
      id: s.id,
      invoiceNumber: s.invoice_number,
      customerName: s.customer_name,
      createdAt: s.created_at,
      total,
      paymentStatus: s.payment_status as PaymentStatus,
      saleStatus: s.sale_status as SaleStatus,
    };
  });
}

export async function getSaleDetail(id: string): Promise<SaleDetail | null> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from("sales")
    .select(
      "id, invoice_number, customer_name, customer_phone, note, payment_status, paid_at, paid_by, sale_status, cancelled_at, cancelled_by, created_by, created_at, sale_items(id, product_id, quantity, unit_price, subtotal, products(name))",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const rawItems = data.sale_items as {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    products: { name: string } | null;
  }[];
  const items: SaleDetail["items"] = rawItems.map((item) => ({
    id: item.id,
    productId: item.product_id,
    productName: item.products?.name ?? "(produk dihapus)",
    quantity: item.quantity,
    unitPrice: Number(item.unit_price),
    subtotal: Number(item.subtotal),
  }));
  const total = items.reduce((sum, item) => sum + item.subtotal, 0);

  return {
    id: data.id,
    invoiceNumber: data.invoice_number,
    customerName: data.customer_name,
    customerPhone: data.customer_phone,
    note: data.note,
    paymentStatus: data.payment_status as PaymentStatus,
    paidAt: data.paid_at,
    paidBy: data.paid_by,
    saleStatus: data.sale_status as SaleStatus,
    cancelledAt: data.cancelled_at,
    cancelledBy: data.cancelled_by,
    createdBy: data.created_by,
    createdAt: data.created_at,
    items,
    total,
  };
}
