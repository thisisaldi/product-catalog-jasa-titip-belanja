function ProductCardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="aspect-[4/5] animate-pulse rounded-lg bg-border" />
      <div className="mt-3 flex flex-col gap-2">
        <div className="h-3 w-1/2 animate-pulse rounded-full bg-border" />
        <div className="h-4 w-3/4 animate-pulse rounded-full bg-border" />
        <div className="h-4 w-1/3 animate-pulse rounded-full bg-border" />
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
