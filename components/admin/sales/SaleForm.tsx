"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SellableProduct } from "@/lib/admin/types";
import { createSale } from "@/lib/admin/actions/sales";
import { formatPrice } from "@/lib/format";
import { ProductPicker } from "./ProductPicker";
import { CartTable, type CartLine } from "./CartTable";

export function SaleForm({ products }: { products: SellableProduct[] }) {
  const router = useRouter();
  const [cart, setCart] = useState<Map<string, CartLine>>(new Map());
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const lines = useMemo(() => Array.from(cart.values()), [cart]);
  const total = useMemo(() => lines.reduce((sum, l) => sum + l.price * l.quantity, 0), [lines]);
  const hasStockIssue = lines.some((l) => l.quantity > l.cachedStock);

  function addProduct(product: SellableProduct) {
    setError(null);
    setCart((prev) => {
      // Same product added twice consolidates into one line, quantity += 1
      // (mirrors create_sale()'s own consolidation, kept consistent here).
      const next = new Map(prev);
      const existing = next.get(product.id);
      if (existing) {
        next.set(product.id, { ...existing, quantity: existing.quantity + 1 });
      } else {
        next.set(product.id, {
          productId: product.id,
          name: product.name,
          price: product.price,
          cachedStock: product.cachedStock,
          quantity: 1,
        });
      }
      return next;
    });
  }

  function changeQuantity(productId: string, delta: number) {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(productId);
      if (!existing) return prev;
      const quantity = existing.quantity + delta;
      if (quantity <= 0) {
        next.delete(productId);
      } else {
        next.set(productId, { ...existing, quantity });
      }
      return next;
    });
  }

  function removeLine(productId: string) {
    setCart((prev) => {
      const next = new Map(prev);
      next.delete(productId);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (lines.length === 0) {
      setError("Keranjang kosong. Tambahkan produk terlebih dahulu.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await createSale({
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          note: note || undefined,
          items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        // Cart is component-local state, never persisted — closing this
        // page (via navigation below) is all "clearing the cart" means.
        router.push(`/x7k9m2/penjualan/${result.saleId}`);
      } catch {
        setError("Terjadi kesalahan jaringan. Coba lagi.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-2">
      <div>
        <h2 className="text-base font-semibold">Pilih Produk</h2>
        <div className="mt-3">
          <ProductPicker products={products} onAdd={addProduct} />
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold">Keranjang</h2>
        <div className="mt-3">
          <CartTable
            lines={lines}
            onIncrement={(id) => changeQuantity(id, 1)}
            onDecrement={(id) => changeQuantity(id, -1)}
            onRemove={removeLine}
          />
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <div>
            <label htmlFor="customerName" className="mb-1 block text-sm font-medium">
              Nama Pelanggan
            </label>
            <input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label htmlFor="customerPhone" className="mb-1 block text-sm font-medium">
              Nomor WhatsApp Pelanggan
            </label>
            <input
              id="customerPhone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="+6281234567890"
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label htmlFor="note" className="mb-1 block text-sm font-medium">
              Catatan
            </label>
            <textarea
              id="note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        {lines.length > 0 && (
          <div className="mt-6 rounded-md bg-accent-soft p-4 text-sm">
            <p className="font-medium">Ringkasan Pesanan</p>
            <ul className="mt-2 space-y-1 text-text-secondary">
              {lines.map((l) => (
                <li key={l.productId} className="flex justify-between gap-2">
                  <span className="truncate">
                    {l.quantity} x {l.name}
                  </span>
                  <span>{formatPrice(l.price * l.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-between border-t border-accent/30 pt-2 font-semibold">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
            {hasStockIssue && (
              <p className="mt-2 text-sold-out">
                Satu atau lebih item melebihi stok yang tersedia — penjualan akan ditolak jika stok
                tidak mencukupi saat disimpan.
              </p>
            )}
          </div>
        )}

        {error && <p className="mt-3 text-sm text-sold-out">{error}</p>}

        <button
          type="submit"
          disabled={isPending || lines.length === 0}
          className="mt-4 w-full rounded-lg bg-accent px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Menyimpan..." : "Buat Penjualan"}
        </button>
      </div>
    </form>
  );
}
