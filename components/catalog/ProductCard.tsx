import Link from "next/link";
import type { Product } from "@/lib/catalog/types";
import { formatPrice } from "@/lib/format";
import { ProductImagePlaceholder } from "@/components/shared/ProductImagePlaceholder";
import { AvailabilityBadge } from "./AvailabilityBadge";

export function ProductCard({ product }: { product: Product }) {
  const thumbnail = product.images.find((img) => img.isPrimary) ?? product.images[0];

  return (
    <Link
      href={`/produk/${product.slug}`}
      className="group block rounded-lg outline-none transition-transform active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      aria-label={`${product.brand.name} ${product.name}`}
    >
      <div className="overflow-hidden rounded-lg">
        {thumbnail ? (
          // Plain <img>, not next/image: Storage host varies per environment.
          <img
            src={thumbnail.url}
            alt={thumbnail.altText ?? `${product.brand.name} ${product.name}`}
            className="aspect-[4/5] w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <ProductImagePlaceholder
            seed={product.id}
            className="aspect-[4/5] w-full transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        )}
      </div>
      <div className="flex flex-col gap-1 pt-3">
        <span className="text-sm font-medium uppercase tracking-wide text-text-secondary">
          {product.brand.name}
        </span>
        <span className="line-clamp-2 text-base font-medium leading-tight text-text-primary">
          {product.name}
        </span>
        <span className="text-base font-semibold text-text-primary">
          {formatPrice(product.price)}
        </span>
        <AvailabilityBadge available={product.available} />
      </div>
    </Link>
  );
}
