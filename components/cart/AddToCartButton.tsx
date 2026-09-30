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
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-white shadow-card transition-all hover:bg-accent/90 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${justAdded ? "!bg-available" : ""} ${className}`}
      >
        <BagIcon className={`h-[18px] w-[18px] transition-transform ${justAdded ? "scale-110" : ""}`} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`transition-transform active:scale-[0.96] ${justAdded ? "scale-[1.04] !bg-available" : ""} ${className}`}
    >
      {justAdded ? (
        "Ditambahkan ✓"
      ) : (
        <>
          <BagIcon className="h-4 w-4" />
          Tambah ke Keranjang
        </>
      )}
    </button>
  );
}
