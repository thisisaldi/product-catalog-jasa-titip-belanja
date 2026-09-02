"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart/CartContext";
import { BagIcon } from "@/components/shared/icons";

/**
 * Plain link to the dedicated /keranjang page (Milestone 5) — the cart is
 * no longer a blocking drawer/modal triggered from here.
 */
export function CartIndicator() {
  const cart = useCart();
  return (
    <Link
      href="/keranjang"
      aria-label={`Keranjang, ${cart.totalCount} item`}
      className="relative rounded-full p-2 text-text-primary hover:text-accent"
    >
      <BagIcon className="h-6 w-6" />
      {cart.totalCount > 0 && (
        <span
          key={cart.totalCount}
          className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white [animation:cart-bump_0.25s_ease-out]"
        >
          {cart.totalCount}
        </span>
      )}
    </Link>
  );
}
