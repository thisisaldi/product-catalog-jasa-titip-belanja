"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import type { Brand, Category, Product } from "@/lib/catalog/types";
import { fetchCatalogPage } from "@/lib/catalog/actions";
import { useRegisterSearchHandler } from "@/lib/catalog/SearchBridge";
import { FilterBar, type Availability } from "./FilterBar";
import { ProductGrid } from "./ProductGrid";
import { ProductGridSkeleton } from "./Skeleton";
import { LoadMoreSentinel } from "./LoadMoreSentinel";
import { EmptyState } from "./EmptyState";

export function CatalogView({
  initialProducts,
  initialNextCursor,
  categories,
  brands,
  initialQuery,
}: {
  initialProducts: Product[];
  initialNextCursor: string | null;
  categories: Category[];
  brands: Brand[];
  initialQuery: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [availability, setAvailability] = useState<Availability>("all");

  const [products, setProducts] = useState(initialProducts);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [isLoadingMore, startLoadMore] = useTransition();
  const [isRefetching, startRefetch] = useTransition();
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  // Only cards appended after the server-rendered first batch fade in
  // (03 Section 2.2), so the initial paint/LCP is never delayed.
  const [animateFrom, setAnimateFrom] = useState(initialProducts.length);

  const hasActiveFilters =
    query.trim() !== "" ||
    selectedCategories.length > 0 ||
    selectedBrands.length > 0 ||
    availability !== "all";

  // URL sync helper (uses replaceState to avoid Next.js stream navigation bug)
  const syncUrl = useCallback(
    (q: string, cats: string[], brs: string[], avail: Availability) => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (cats.length > 0) params.set("kategori", cats.join(","));
      if (brs.length > 0) params.set("merek", brs.join(","));
      if (avail !== "all") params.set("ketersediaan", avail);
      const qs = params.toString();
      const nextUrl = qs ? `/?${qs}` : "/";
      window.history.replaceState(null, "", nextUrl);
    },
    [],
  );

  function refetch(next: {
    query?: string;
    categories?: string[];
    brands?: string[];
    availability?: Availability;
  }) {
    const targetQuery = next.query ?? query;
    const targetCats = next.categories ?? selectedCategories;
    const targetBrands = next.brands ?? selectedBrands;
    const targetAvail = next.availability ?? availability;

    syncUrl(targetQuery, targetCats, targetBrands, targetAvail);

    const params = {
      query: targetQuery,
      categorySlugs: targetCats,
      brandSlugs: targetBrands,
      availability: targetAvail,
    };

    setLoadError(null);
    const currentReqId = ++requestIdRef.current;

    startRefetch(async () => {
      try {
        const result = await fetchCatalogPage(params);
        if (currentReqId !== requestIdRef.current) return;
        setProducts(result.products);
        setNextCursor(result.nextCursor);
        setAnimateFrom(0);
      } catch {
        if (currentReqId !== requestIdRef.current) return;
        setLoadError("Gagal memuat produk. Coba lagi.");
      }
    });
  }

  function toggleCategory(slug: string) {
    const next = selectedCategories.includes(slug)
      ? selectedCategories.filter((s) => s !== slug)
      : [...selectedCategories, slug];
    setSelectedCategories(next);
    refetch({ categories: next });
  }

  function toggleBrand(slug: string) {
    const next = selectedBrands.includes(slug)
      ? selectedBrands.filter((s) => s !== slug)
      : [...selectedBrands, slug];
    setSelectedBrands(next);
    refetch({ brands: next });
  }

  function changeAvailability(value: Availability) {
    setAvailability(value);
    refetch({ availability: value });
  }

  function changeQuery(value: string) {
    setQuery(value);
    refetch({ query: value });
  }

  useRegisterSearchHandler(changeQuery);

  function clearAll() {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setAvailability("all");
    refetch({ categories: [], brands: [], availability: "all" });
  }

  const loadMore = useCallback(() => {
    if (!nextCursor) return;
    setLoadError(null);
    const currentReqId = requestIdRef.current;

    startLoadMore(async () => {
      try {
        const result = await fetchCatalogPage({
          query,
          categorySlugs: selectedCategories,
          brandSlugs: selectedBrands,
          availability,
          cursor: nextCursor,
        });
        if (currentReqId !== requestIdRef.current) return;
        setProducts((prev) => [...prev, ...result.products]);
        setNextCursor(result.nextCursor);
      } catch {
        if (currentReqId !== requestIdRef.current) return;
        setLoadError("Gagal memuat produk berikutnya. Coba lagi.");
      }
    });
  }, [nextCursor, query, selectedCategories, selectedBrands, availability]);

  return (
    <div className="mt-6 sm:mt-8">
      <FilterBar
        categories={categories}
        brands={brands}
        selectedCategories={selectedCategories}
        selectedBrands={selectedBrands}
        availability={availability}
        onToggleCategory={toggleCategory}
        onToggleBrand={toggleBrand}
        onAvailabilityChange={changeAvailability}
        onClearAll={clearAll}
      />

      <p aria-live="polite" className="pt-4 text-sm text-text-secondary tabular-nums">
        {isRefetching ? "Memuat..." : `${products.length}${nextCursor ? "+" : ""} produk`}
      </p>

      <div className="pt-2 pb-16">
        {loadError && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 text-sm font-medium text-accent-strong"
          >
            {loadError}
          </div>
        )}
        {isRefetching ? (
          <ProductGridSkeleton count={8} />
        ) : products.length === 0 ? (
          <EmptyState
            variant={hasActiveFilters ? "no-results" : "empty-category"}
            onReset={hasActiveFilters ? clearAll : undefined}
          />
        ) : (
          <>
            <ProductGrid products={products} animateFrom={animateFrom} />
            {isLoadingMore && (
              <div className="mt-4 md:mt-5 lg:mt-6">
                <ProductGridSkeleton count={4} />
              </div>
            )}
          </>
        )}
        {nextCursor && !isRefetching && (
          <LoadMoreSentinel
            onVisible={loadMore}
            loading={isLoadingMore}
            hasError={Boolean(loadError)}
            onRetry={loadMore}
          />
        )}
      </div>
    </div>
  );
}
