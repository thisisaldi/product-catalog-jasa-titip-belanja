// Mirrors ProductCard's frame exactly (border, image, p-3 text block, button
// row) so swapping skeleton for content causes no layout shift (03 Section 2.9).
function ProductCardSkeleton() {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="aspect-[4/5] animate-pulse bg-surface-muted" />
      <div className="flex flex-col gap-2 p-3">
        <div className="h-3 w-1/2 animate-pulse rounded-full bg-surface-muted" />
        <div className="h-4 w-3/4 animate-pulse rounded-full bg-surface-muted" />
        <div className="h-4 w-1/3 animate-pulse rounded-full bg-surface-muted" />
        <div className="mt-2 h-10 animate-pulse rounded-lg bg-surface-muted" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count }: { count: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Memuat produk"
      className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4 lg:gap-6"
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
