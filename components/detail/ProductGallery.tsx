"use client";

import { useRef, useState } from "react";
import type { ProductImage } from "@/lib/catalog/types";
import { ProductImagePlaceholder } from "@/components/shared/ProductImagePlaceholder";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/shared/icons";

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
      <div className="overflow-hidden rounded-lg bg-surface-muted">
        <GalleryImage image={images[0]} seed={`${seedPrefix}-0`} altFallback={altFallback} />
      </div>
    );
  }

  // Keeps dots/thumbnails in sync with native swipe (scroll-snap).
  function handleScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    setActiveIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  function scrollToImage(index: number) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
    setActiveIndex(index);
  }

  return (
    <div aria-label={`Galeri produk ${productName}`}>
      <div className="relative overflow-hidden rounded-lg bg-surface-muted">
        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-lg scrollbar-none"
        >
          {images.map((image, i) => (
            <div key={i} className="w-full shrink-0 snap-start">
              <GalleryImage image={image} seed={`${seedPrefix}-${i}`} altFallback={altFallback} />
            </div>
          ))}
        </div>

        {/* Navigation arrows (desktop & tablet) */}
        {activeIndex > 0 && (
          <button
            type="button"
            onClick={() => scrollToImage(activeIndex - 1)}
            aria-label="Foto sebelumnya"
            className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-text-primary shadow-card backdrop-blur-sm transition-transform hover:scale-105 active:scale-95 md:flex"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
        )}
        {activeIndex < images.length - 1 && (
          <button
            type="button"
            onClick={() => scrollToImage(activeIndex + 1)}
            aria-label="Foto berikutnya"
            className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-text-primary shadow-card backdrop-blur-sm transition-transform hover:scale-105 active:scale-95 md:flex"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Mobile dots indicator */}
      <div className="mt-3 flex justify-center gap-1.5 md:hidden" aria-label="Navigasi gambar">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => scrollToImage(i)}
            aria-label={`Foto ke-${i + 1}`}
            className={`h-2 rounded-full transition-all ${
              i === activeIndex ? "w-6 bg-accent" : "w-2 bg-text-secondary/25"
            }`}
          />
        ))}
      </div>

      {/* Desktop thumbnail strip (03 Section 2.5) */}
      <div className="mt-4 hidden gap-3 md:flex" aria-label="Pilihan foto produk">
        {images.map((image, i) => (
          <button
            key={i}
            type="button"
            onClick={() => scrollToImage(i)}
            aria-label={`Lihat foto ${i + 1}`}
            aria-current={i === activeIndex}
            className={`relative h-20 w-16 overflow-hidden rounded-md border-2 bg-surface-muted transition-[opacity,border-color] ${
              i === activeIndex
                ? "border-accent"
                : "border-transparent opacity-60 hover:opacity-100"
            }`}
          >
            <img src={image.url} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
