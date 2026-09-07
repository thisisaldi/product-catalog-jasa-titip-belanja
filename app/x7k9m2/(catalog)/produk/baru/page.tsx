import { ProductForm } from "@/components/admin/ProductForm";
import { listActiveBrandsForSelect, listActiveCategoriesForSelect } from "@/lib/admin/queries";
import { createProduct } from "@/lib/admin/actions/products";

export default async function NewProductPage() {
  const [brands, categories] = await Promise.all([
    listActiveBrandsForSelect(),
    listActiveCategoriesForSelect(),
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold">Tambah Produk</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Simpan produk dahulu, lalu tambahkan gambar pada halaman kelola produk.
      </p>
      <div className="mt-6">
        <ProductForm action={createProduct} brands={brands} categories={categories} />
      </div>
    </div>
  );
}
