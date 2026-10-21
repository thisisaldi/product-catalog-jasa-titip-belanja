import Link from "next/link";
import type { Product } from "@/lib/catalog/types";
import { formatPrice } from "@/lib/format";
import { ProductImagePlaceholder } from "@/components/shared/ProductImagePlaceholder";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { AvailabilityBadge } from "./AvailabilityBadge";

export function ProductCard({ product }: { product: Product }) {
  const thumbnail = product.images.find((img) => img.isPrimary) ?? product.images[0];

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface transition-[box-shadow,border-color] duration-300 hover:border-text-secondary/25 hover:shadow-card">
      <Link
        href={`/produk/${product.slug}`}
        tabIndex={-1}
        aria-hidden="true"
        className={`block overflow-hidden bg-surface-muted outline-none ${product.available ? "" : "opacity-70"}`}
      >
        {thumbnail ? (
          // Plain <img> with lazy loading
          <img
            src={thumbnail.url}
            alt={thumbnail.altText ?? `${product.brand.name} ${product.name}`}
            loading="lazy"
            decoding="async"
            className="aspect-[4/5] w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <ProductImagePlaceholder
            seed={product.id}
            className="aspect-[4/5] w-full transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
          {product.brand.name}
        </span>
        <Link
          href={`/produk/${product.slug}`}
          className="rounded-sm text-text-primary outline-none transition-colors hover:text-accent focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span className="line-clamp-2 text-[15px] font-medium leading-snug">
            {product.name}
          </span>
        </Link>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-1">
          <span className="text-base font-semibold tabular-nums text-text-primary">
            {formatPrice(product.price)}
          </span>
          <AvailabilityBadge available={product.available} />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Link
            href={`/produk/${product.slug}`}
            className="flex h-10 flex-1 items-center justify-center rounded-lg border border-border text-sm font-medium text-text-primary transition-colors hover:border-accent hover:text-accent active:scale-[0.98] active:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Lihat Detail
          </Link>
          {product.available && <AddToCartButton product={product} iconOnly />}
        </div>
      </div>
    </div>
  );
}
