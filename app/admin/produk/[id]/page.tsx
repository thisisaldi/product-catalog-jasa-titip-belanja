import { notFound } from "next/navigation";
import Link from "next/link";
import { ProductForm } from "@/components/admin/ProductForm";
import { ProductImageManager } from "@/components/admin/ProductImageManager";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  getProductById,
  listActiveBrandsForSelect,
  listActiveCategoriesForSelect,
  listProductImages,
} from "@/lib/admin/queries";
import { setProductStatus, updateProduct } from "@/lib/admin/actions/products";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  const [brands, categories, images] = await Promise.all([
    listActiveBrandsForSelect(),
    listActiveCategoriesForSelect(),
    listProductImages(id),
  ]);

  // The product's current brand/category must still appear even if archived
  // since it can be viewed (not just active ones) — 05-database-design.md
  // Section 3.3: an existing product keeps displaying an archived reference.
  const brandOptions = brands.some((b) => b.id === product.brand.id)
    ? brands
    : [...brands, { id: product.brand.id, name: `${product.brand.name} (diarsipkan)` }];
  const categoryOptions = categories.some((c) => c.id === product.category.id)
    ? categories
    : [...categories, { id: product.category.id, name: `${product.category.name} (diarsipkan)` }];

  const nextStatus = product.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  async function archiveOrRestore() {
    "use server";
    await setProductStatus(id, nextStatus);
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{product.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={product.status} />
            <span className="text-sm text-text-secondary">Stok: {product.cachedStock}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/inventaris?produk=${id}`} className="text-sm text-accent hover:underline">
            Riwayat Stok
          </Link>
          <form action={archiveOrRestore}>
            <button
              type="submit"
              className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                product.status === "ACTIVE" ? "border-sold-out text-sold-out" : "border-accent text-accent"
              }`}
            >
              {product.status === "ACTIVE" ? "Arsipkan" : "Aktifkan"}
            </button>
          </form>
        </div>
      </div>

      <div className="mt-8">
        <ProductForm
          action={updateProduct.bind(null, id)}
          brands={brandOptions}
          categories={categoryOptions}
          initial={{
            name: product.name,
            brandId: product.brand.id,
            categoryId: product.category.id,
            description: product.description ?? "",
            price: product.price,
            isManuallyUnavailable: product.isManuallyUnavailable,
          }}
        />
      </div>

      <div className="mt-10 border-t border-border pt-8">
        <ProductImageManager
          productId={id}
          categorySlug={product.category.slug}
          initialImages={images}
        />
      </div>
    </div>
  );
}
