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
    <Container className="pt-8 sm:pt-12 lg:pt-16">
      <section className="max-w-xl">
        <p className="text-sm font-medium uppercase tracking-wider text-accent">Koleksi Pilihan</p>
        <h1 className="mt-2 text-2xl font-semibold leading-snug tracking-tight text-text-primary sm:text-3xl">
          Katalog Kurasi Kami
        </h1>
        <p className="mt-3 max-w-[52ch] text-base leading-relaxed text-text-secondary">
          Produk pilihan dari berbagai brand. Tambahkan ke keranjang, lalu lanjutkan pesanan lewat
          WhatsApp.
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
