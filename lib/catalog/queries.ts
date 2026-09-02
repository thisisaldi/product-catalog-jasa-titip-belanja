import "server-only";
import { createAnonSupabaseClient } from "@/lib/supabase/server";
import { getPublicImageUrl } from "@/lib/supabase/storage";
import type { Database } from "@/types/database";
import type { Availability, Brand, Category, Cursor, Product, Settings } from "./types";

const PAGE_SIZE = 8;

type ProductPublicRow = Database["public"]["Views"]["products_public"]["Row"];

/**
 * `supabase gen types` marks every view column nullable regardless of the
 * underlying NOT NULL constraints, since Postgres doesn't expose per-column
 * nullability metadata for views. products_public (05 Section 11.1a) is a
 * plain filtered SELECT over products' NOT NULL columns, so these are never
 * actually null in practice — this narrows the type once instead of an
 * assertion at every call site.
 */
function assertProductPublicRow(row: ProductPublicRow) {
  if (
    row.id == null ||
    row.slug == null ||
    row.name == null ||
    row.brand_id == null ||
    row.category_id == null ||
    row.price == null ||
    row.created_at == null ||
    row.is_available == null
  ) {
    throw new Error("products_public returned an unexpectedly null column");
  }
  return row as ProductPublicRow & {
    id: string;
    slug: string;
    name: string;
    brand_id: string;
    category_id: string;
    price: number;
    created_at: string;
    is_available: boolean;
  };
}

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeCursor(raw: string): Cursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (typeof parsed.createdAt === "string" && typeof parsed.id === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getActiveCategories(): Promise<Category[]> {
  const supabase = createAnonSupabaseClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("status", "ACTIVE")
    .order("name");
  if (error) throw error;
  return data;
}

export async function getActiveBrands(): Promise<Brand[]> {
  const supabase = createAnonSupabaseClient();
  const { data, error } = await supabase
    .from("brands")
    .select("id, name, slug")
    .eq("status", "ACTIVE")
    .order("name");
  if (error) throw error;
  return data;
}

type CatalogPageParams = {
  query?: string;
  categorySlugs?: string[];
  brandSlugs?: string[];
  availability?: Availability;
  cursor?: string;
};

type CatalogPageResult = {
  products: Product[];
  nextCursor: string | null;
};

/**
 * Public catalog listing, against products_public only (04-system-design.md
 * Section 8.1) — never the base products table. Search/filter matching runs
 * as composed queries in application code rather than one SQL join (05
 * Section 9.1's sketch), because products_public is a view: PostgREST cannot
 * embed brands/categories through it via FK-relationship inference the way it
 * can on a real table, and the view intentionally has no brand/category name
 * columns to join against directly.
 */
export async function getCatalogPage({
  query,
  categorySlugs = [],
  brandSlugs = [],
  availability = "all",
  cursor,
}: CatalogPageParams): Promise<CatalogPageResult> {
  const supabase = createAnonSupabaseClient();

  const [categories, brands] = await Promise.all([getActiveCategories(), getActiveBrands()]);
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
  const brandBySlug = new Map(brands.map((b) => [b.slug, b]));

  const categoryIds = categorySlugs
    .map((slug) => categoryBySlug.get(slug)?.id)
    .filter((id): id is string => Boolean(id));
  const brandIds = brandSlugs
    .map((slug) => brandBySlug.get(slug)?.id)
    .filter((id): id is string => Boolean(id));

  let builder = supabase.from("products_public").select("*");

  if (categoryIds.length > 0) builder = builder.in("category_id", categoryIds);
  if (brandIds.length > 0) builder = builder.in("brand_id", brandIds);
  if (availability !== "all") builder = builder.eq("is_available", availability === "available");

  const trimmedQuery = query?.trim();
  if (trimmedQuery) {
    const escaped = trimmedQuery.replace(/[%,()]/g, "");
    const [{ data: matchCategories }, { data: matchBrands }] = await Promise.all([
      supabase.from("categories").select("id").ilike("name", `%${escaped}%`),
      supabase.from("brands").select("id").ilike("name", `%${escaped}%`),
    ]);
    const orClauses = [`name.ilike.%${escaped}%`];
    if (matchCategories && matchCategories.length > 0) {
      orClauses.push(`category_id.in.(${matchCategories.map((c) => c.id).join(",")})`);
    }
    if (matchBrands && matchBrands.length > 0) {
      orClauses.push(`brand_id.in.(${matchBrands.map((b) => b.id).join(",")})`);
    }
    builder = builder.or(orClauses.join(","));
  }

  const decodedCursor = cursor ? decodeCursor(cursor) : null;
  if (decodedCursor) {
    builder = builder.or(
      `created_at.lt.${decodedCursor.createdAt},and(created_at.eq.${decodedCursor.createdAt},id.lt.${decodedCursor.id})`,
    );
  }

  const { data: rows, error } = await builder
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (error) throw error;

  const hasMore = rows.length > PAGE_SIZE;
  const page = rows.slice(0, PAGE_SIZE).map(assertProductPublicRow);

  // A product may reference an archived brand/category (05 Section 3.3 —
  // archiving a taxonomy entry never hides products that still reference it).
  // getActiveCategories/getActiveBrands above only return ACTIVE rows, so
  // resolve any remaining ids directly — the anon two-branch RLS policy (05
  // Section 11.1) still allows this since each product here is ACTIVE.
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const brandById = new Map(brands.map((b) => [b.id, b]));
  const missingCategoryIds = [...new Set(page.map((r) => r.category_id))].filter(
    (id) => !categoryById.has(id),
  );
  const missingBrandIds = [...new Set(page.map((r) => r.brand_id))].filter((id) => !brandById.has(id));

  const [{ data: extraCategories }, { data: extraBrands }, imagesByProduct] = await Promise.all([
    missingCategoryIds.length > 0
      ? supabase.from("categories").select("id, name, slug").in("id", missingCategoryIds)
      : Promise.resolve({ data: [] as Category[] }),
    missingBrandIds.length > 0
      ? supabase.from("brands").select("id, name, slug").in("id", missingBrandIds)
      : Promise.resolve({ data: [] as Brand[] }),
    getPrimaryImagesFor(page.map((r) => r.id)),
  ]);
  for (const c of extraCategories ?? []) categoryById.set(c.id, c);
  for (const b of extraBrands ?? []) brandById.set(b.id, b);

  const products: Product[] = page.flatMap((row) => {
    const brand = brandById.get(row.brand_id);
    const category = categoryById.get(row.category_id);
    if (!brand || !category) return [];
    return [
      {
        id: row.id,
        slug: row.slug,
        name: row.name,
        brand,
        category,
        price: Number(row.price),
        description: row.description,
        images: imagesByProduct.get(row.id) ?? [],
        available: row.is_available,
      },
    ];
  });

  const last = page[page.length - 1];
  const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.created_at, id: last.id }) : null;

  return { products, nextCursor };
}

async function getPrimaryImagesFor(productIds: string[]) {
  const map = new Map<string, Product["images"]>();
  if (productIds.length === 0) return map;

  const supabase = createAnonSupabaseClient();
  const { data, error } = await supabase
    .from("product_images")
    .select("product_id, url, alt_text, sort_order, is_primary")
    .in("product_id", productIds)
    .order("sort_order");
  if (error) throw error;

  for (const row of data) {
    const list = map.get(row.product_id) ?? [];
    list.push({ url: getPublicImageUrl(row.url), altText: row.alt_text, isPrimary: row.is_primary });
    map.set(row.product_id, list);
  }
  return map;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = createAnonSupabaseClient();
  const { data: rawRow, error } = await supabase
    .from("products_public")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!rawRow) return null;
  const row = assertProductPublicRow(rawRow);

  const [{ data: brand }, { data: category }, imagesByProduct] = await Promise.all([
    supabase.from("brands").select("id, name, slug").eq("id", row.brand_id).maybeSingle(),
    supabase.from("categories").select("id, name, slug").eq("id", row.category_id).maybeSingle(),
    getPrimaryImagesFor([row.id]),
  ]);
  if (!brand || !category) return null;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand,
    category,
    price: Number(row.price),
    description: row.description,
    images: imagesByProduct.get(row.id) ?? [],
    available: row.is_available,
  };
}

export async function getPublicSettings(): Promise<Pick<
  Settings,
  "whatsappNumber" | "orderMessageTemplate" | "availabilityMessageTemplate"
> | null> {
  // settings has no anon RLS policy at all (05 Section 11.1) — this must run
  // with service_role, exposing only the fields the public CTA needs, never
  // the raw settings row as queryable public data (06-security.md Section 8).
  const { createServiceRoleSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from("settings")
    .select("whatsapp_number, order_message_template, availability_message_template")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    whatsappNumber: data.whatsapp_number,
    orderMessageTemplate: data.order_message_template,
    availabilityMessageTemplate: data.availability_message_template,
  };
}
