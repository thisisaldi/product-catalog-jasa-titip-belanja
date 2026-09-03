"use client";

import { useState, useTransition } from "react";
import type { Brand, Category, Product } from "@/lib/catalog/types";
import { fetchCatalogPage } from "@/lib/catalog/actions";
import { useRegisterSearchHandler } from "@/lib/catalog/SearchBridge";
import { FilterBar, type Availability } from "./FilterBar";
import { ProductGrid } from "./ProductGrid";
import { ProductGridSkeleton } from "./Skeleton";
import { LoadMoreButton } from "./LoadMoreButton";
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

  const hasActiveFilters =
    query.trim() !== "" ||
    selectedCategories.length > 0 ||
    selectedBrands.length > 0 ||
    availability !== "all";

  function refetch(next: {
    query?: string;
    categories?: string[];
    brands?: string[];
    availability?: Availability;
  }) {
    const params = {
      query: next.query ?? query,
      categorySlugs: next.categories ?? selectedCategories,
      brandSlugs: next.brands ?? selectedBrands,
      availability: next.availability ?? availability,
    };
    setLoadError(null);
    startRefetch(async () => {
      try {
        const result = await fetchCatalogPage(params);
        setProducts(result.products);
        setNextCursor(result.nextCursor);
      } catch {
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

  function loadMore() {
    if (!nextCursor) return;
    setLoadError(null);
    startLoadMore(async () => {
      try {
        const result = await fetchCatalogPage({
          query,
          categorySlugs: selectedCategories,
          brandSlugs: selectedBrands,
          availability,
          cursor: nextCursor,
        });
        setProducts((prev) => [...prev, ...result.products]);
        setNextCursor(result.nextCursor);
      } catch {
        setLoadError("Gagal memuat produk berikutnya. Coba lagi.");
      }
    });
  }

  return (
    <div className="mt-8 sm:mt-10">
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

      <p aria-live="polite" className="pt-4 text-sm text-text-secondary">
        {isRefetching ? "Memuat..." : `${products.length}${nextCursor ? "+" : ""} produk`}
      </p>

      <div className="pt-2 pb-16">
        {loadError && (
          <div className="mb-4 rounded-lg border border-sold-out bg-accent-soft px-4 py-3 text-sm text-text-primary">
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
            <ProductGrid products={products} />
            {isLoadingMore && (
              <div className="mt-4 md:mt-5 lg:mt-6">
                <ProductGridSkeleton count={4} />
              </div>
            )}
          </>
        )}
        {nextCursor && !isRefetching && <LoadMoreButton onClick={loadMore} loading={isLoadingMore} />}
      </div>
    </div>
  );
}
