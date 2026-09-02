import { CatalogView } from "@/components/catalog/CatalogView";
import { getActiveBrands, getActiveCategories, getCatalogPage } from "@/lib/catalog/queries";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const initialQuery = sp.q ?? "";

  const [categories, brands, page] = await Promise.all([
    getActiveCategories(),
    getActiveBrands(),
    getCatalogPage({ query: initialQuery }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <section className="max-w-2xl">
        <h1 className="text-2xl font-semibold text-text-primary">Katalog Kurasi Kami</h1>
        <p className="mt-2 text-text-secondary">
          Produk pilihan dari berbagai brand, untuk kamu yang suka belanja tenang tanpa ribet.
          Cek ketersediaan, lalu lanjutkan obrolan lewat WhatsApp.
        </p>
      </section>

      <CatalogView
        key={initialQuery}
        initialProducts={page.products}
        initialNextCursor={page.nextCursor}
        categories={categories}
        brands={brands}
        initialQuery={initialQuery}
      />
    </div>
  );
}
