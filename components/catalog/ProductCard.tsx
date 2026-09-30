import Link from "next/link";
import type { Product } from "@/lib/catalog/types";
import { formatPrice } from "@/lib/format";
import { ProductImagePlaceholder } from "@/components/shared/ProductImagePlaceholder";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { AvailabilityBadge } from "./AvailabilityBadge";

export function ProductCard({ product }: { product: Product }) {
  const thumbnail = product.images.find((img) => img.isPrimary) ?? product.images[0];

  return (
    <div className="group flex flex-col rounded-lg">
      <Link
        href={`/produk/${product.slug}`}
        className="block overflow-hidden rounded-lg bg-border shadow-sm outline-none transition-shadow duration-300 hover:shadow-card focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        aria-label={`${product.brand.name} ${product.name}`}
      >
        {thumbnail ? (
          // Plain <img>, not next/image: Storage host varies per environment.
          <img
            src={thumbnail.url}
            alt={thumbnail.altText ?? `${product.brand.name} ${product.name}`}
            className="aspect-[4/5] w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <ProductImagePlaceholder
            seed={product.id}
            className="aspect-[4/5] w-full transition-transform duration-300 ease-out group-hover:scale-[1.04]"
          />
        )}
      </Link>
      <div className="flex flex-col gap-1 pt-3.5">
        <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
          {product.brand.name}
        </span>
        <Link href={`/produk/${product.slug}`} className="outline-none focus-visible:underline">
          <span className="line-clamp-2 text-[15px] font-medium leading-snug text-text-primary">
            {product.name}
          </span>
        </Link>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className="text-base font-semibold text-text-primary">
            {formatPrice(product.price)}
          </span>
          <AvailabilityBadge available={product.available} />
        </div>
        <div className="mt-2.5 flex items-center gap-2.5">
          <Link
            href={`/produk/${product.slug}`}
            className="flex h-10 flex-1 items-center justify-center rounded-lg border border-border text-sm font-medium text-text-primary transition-colors hover:bg-accent-soft/60 active:bg-border/60"
          >
            Lihat Detail
          </Link>
          {product.available && <AddToCartButton product={product} iconOnly />}
        </div>
      </div>
    </div>
  );
}
