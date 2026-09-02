"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  brandName: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
};

export type CartView = "cart" | "checkout" | "success";

export type CheckoutSuccess = {
  invoiceNumber: string;
  invoiceText: string;
  whatsappNumber: string | null;
};

type CartContextValue = {
  items: CartItem[];
  isOpen: boolean;
  view: CartView;
  checkoutResult: CheckoutSuccess | null;
  totalCount: number;
  totalPrice: number;
  openCart: () => void;
  closeCart: () => void;
  goToCheckout: () => void;
  goToCart: () => void;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  incrementItem: (productId: string) => void;
  decrementItem: (productId: string) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  completeCheckout: (result: CheckoutSuccess) => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "product-catalog-cart-v1";

/**
 * Client-side only — the cart is never persisted server-side, never a DB
 * table (01-product-requirements.md Section 5.1a). localStorage survives a
 * refresh within the same browser; it never reaches Supabase until checkout
 * calls createPublicSale(), at which point the persisted Sale/sale_items
 * become the source of truth and this state is cleared.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<CartView>("cart");
  const [checkoutResult, setCheckoutResult] = useState<CheckoutSuccess | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // One-time hydration from localStorage on mount, not a reactive
        // subscription (there is nothing else that changes this data out
        // from under the component) — a plain setState here is correct;
        // useSyncExternalStore would need its own snapshot-caching just to
        // avoid a fresh array reference every render, for no real benefit.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {
      // Corrupt/inaccessible storage degrades to an empty cart, never a crash.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage may be unavailable (private mode, quota) — cart still works
      // for the current page load, just won't survive a refresh.
    }
  }, [items, hydrated]);

  function addItem(item: Omit<CartItem, "quantity">, quantity = 1) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId ? { ...i, quantity: i.quantity + quantity } : i,
        );
      }
      return [...prev, { ...item, quantity }];
    });
    setView("cart");
    setIsOpen(true);
  }

  function incrementItem(productId: string) {
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i)));
  }

  function decrementItem(productId: string) {
    setItems((prev) =>
      prev
        .map((i) => (i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0),
    );
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  function clearCart() {
    setItems([]);
  }

  function completeCheckout(result: CheckoutSuccess) {
    setCheckoutResult(result);
    setView("success");
    clearCart();
  }

  const totalCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
  const totalPrice = useMemo(() => items.reduce((sum, i) => sum + i.quantity * i.price, 0), [items]);

  const value: CartContextValue = {
    items,
    isOpen,
    view,
    checkoutResult,
    totalCount,
    totalPrice,
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
    goToCheckout: () => setView("checkout"),
    goToCart: () => setView("cart"),
    addItem,
    incrementItem,
    decrementItem,
    removeItem,
    clearCart,
    completeCheckout,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
