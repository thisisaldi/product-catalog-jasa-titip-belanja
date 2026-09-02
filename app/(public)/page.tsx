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
      <section className="flex flex-col gap-6 border-b border-border pb-10 sm:pb-12 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        <div className="max-w-xl">
          <p className="font-serif text-sm italic text-accent">Koleksi Pilihan</p>
          <h1 className="mt-2 font-serif text-3xl text-text-primary sm:text-4xl lg:text-5xl">
            Katalog Kurasi Kami
          </h1>
          <p className="mt-3 text-base leading-relaxed text-text-secondary">
            Produk pilihan dari berbagai brand, untuk kamu yang suka belanja tenang tanpa ribet.
            Tambahkan ke keranjang, lalu lanjutkan lewat WhatsApp.
          </p>
        </div>
        <p className="hidden max-w-[15rem] shrink-0 border-l border-accent/40 pl-5 font-serif text-base italic leading-relaxed text-text-secondary lg:block">
          &ldquo;Browse independently, purchase personally.&rdquo;
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
