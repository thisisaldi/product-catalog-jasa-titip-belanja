"use client";

import { useRef, useState } from "react";
import type { ProductImage } from "@/lib/catalog/types";
import { ProductImagePlaceholder } from "@/components/shared/ProductImagePlaceholder";

function GalleryImage({
  image,
  seed,
  altFallback,
}: {
  image: ProductImage | undefined;
  seed: string;
  altFallback: string;
}) {
  // Gracefully handle a product with no images yet (05-database-design.md
  // Section 4 — a product can exist with zero images while being assembled).
  if (!image) {
    return <ProductImagePlaceholder seed={seed} className="aspect-[4/5] w-full" />;
  }
  // Plain <img>, not next/image: Storage host varies per environment.
  return (
    <img
      src={image.url}
      alt={image.altText ?? altFallback}
      className="aspect-[4/5] w-full object-cover"
    />
  );
}

export function ProductGallery({
  images,
  productName,
  seedPrefix,
}: {
  images: ProductImage[];
  productName: string;
  seedPrefix: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const altFallback = productName;

  if (images.length <= 1) {
    return (
      <div className="overflow-hidden rounded-lg">
        <GalleryImage image={images[0]} seed={`${seedPrefix}-0`} altFallback={altFallback} />
      </div>
    );
  }

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActiveIndex(index);
  }

  return (
    <div aria-label={`Galeri produk ${productName}`}>
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-lg"
      >
        {images.map((image, i) => (
          <div key={i} className="w-full shrink-0 snap-start">
            <GalleryImage image={image} seed={`${seedPrefix}-${i}`} altFallback={altFallback} />
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-center gap-1.5" aria-hidden="true">
        {images.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              i === activeIndex ? "bg-accent" : "bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
