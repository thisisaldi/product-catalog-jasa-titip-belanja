"use client";

import { useCart } from "@/lib/cart/CartContext";
import { BagIcon } from "@/components/shared/icons";

export function CartIndicator() {
  const cart = useCart();
  return (
    <button
      type="button"
      onClick={cart.openCart}
      aria-label={`Buka keranjang, ${cart.totalCount} item`}
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
    </button>
  );
}
