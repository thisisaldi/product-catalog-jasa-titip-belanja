import { CatalogView } from "@/components/catalog/CatalogView";
import { Container } from "@/components/shared/Container";
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
    <Container className="py-10 sm:py-16">
      <section className="max-w-xl border-b border-border pb-10 sm:pb-12">
        <p className="text-sm font-medium uppercase tracking-wider text-accent">Koleksi Pilihan</p>
        <h1 className="mt-2 text-3xl font-semibold text-text-primary">Katalog Kurasi Kami</h1>
        <p className="mt-3 text-base leading-relaxed text-text-secondary">
          Produk pilihan dari berbagai brand, untuk kamu yang suka belanja tenang tanpa ribet.
          Tambahkan ke keranjang, lalu lanjutkan lewat WhatsApp.
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
    </Container>
  );
}
