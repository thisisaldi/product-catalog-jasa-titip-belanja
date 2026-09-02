"use client";

import { useCart } from "@/lib/cart/CartContext";

/**
 * Subtle, non-blocking confirmation shown after adding to cart — replaces
 * the old auto-opening drawer (Milestone 5). Never interrupts browsing:
 * no backdrop, no focus trap, dismisses itself.
 */
export function CartToast() {
  const { toastMessage } = useCart();

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4 sm:bottom-6"
    >
      {toastMessage && (
        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-text-primary px-5 py-3 text-sm font-medium text-bg shadow-card [animation:toast-in_0.2s_ease-out]">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
