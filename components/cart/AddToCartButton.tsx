"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart/CartContext";
import type { Product } from "@/lib/catalog/types";
import { BagIcon } from "@/components/shared/icons";

/**
 * Only ever gated by the resolved two-state `available` boolean — never an
 * exact stock number (01-product-requirements.md Section 5.1a: the public
 * site must not expose stock quantities on the add-to-cart control).
 */
export function AddToCartButton({
  product,
  className = "",
  stopPropagation = false,
  iconOnly = false,
}: {
  product: Product;
  className?: string;
  stopPropagation?: boolean;
  iconOnly?: boolean;
}) {
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  if (!product.available) return null;

  function handleClick(e: React.MouseEvent) {
    if (stopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }
    const thumbnail = product.images.find((img) => img.isPrimary) ?? product.images[0];
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      brandName: product.brand.name,
      price: product.price,
      imageUrl: thumbnail?.url ?? null,
    });
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 900);
  }

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={`Tambah ${product.name} ke keranjang`}
        className={`flex h-10 w-10 items-center justify-center rounded-full bg-surface/90 text-text-primary shadow-card backdrop-blur transition-transform active:scale-90 ${justAdded ? "bg-accent text-white" : ""} ${className}`}
      >
        <BagIcon className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`transition-transform active:scale-[0.96] ${justAdded ? "scale-[1.04]" : ""} ${className}`}
    >
      {justAdded ? "Ditambahkan ✓" : "Tambah ke Keranjang"}
    </button>
  );
}
