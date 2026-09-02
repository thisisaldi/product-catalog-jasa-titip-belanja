"use client";

import { useState } from "react";
import type { SellableProduct } from "@/lib/admin/types";
import { formatPrice } from "@/lib/format";

export function ProductPicker({
  products,
  onAdd,
}: {
  products: SellableProduct[];
  onAdd: (product: SellableProduct) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
    : products;

  return (
    <div>
      <label htmlFor="product-search" className="sr-only">
        Cari produk
      </label>
      <input
        id="product-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cari produk aktif..."
        className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
      />

      <ul className="mt-3 max-h-80 divide-y divide-border overflow-y-auto rounded-md border border-border">
        {filtered.length === 0 && (
          <li className="px-3 py-4 text-sm text-text-secondary">Tidak ada produk ditemukan.</li>
        )}
        {filtered.map((product) => {
          const outOfStock = product.cachedStock <= 0;
          return (
            <li key={product.id} className="flex items-center gap-3 px-3 py-2">
              <div className="h-12 w-10 shrink-0 overflow-hidden rounded bg-border">
                {product.primaryImageUrl && (
                  // Plain <img>, not next/image: Storage host varies per environment.
                  <img
                    src={product.primaryImageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{product.name}</p>
                <p className="text-xs text-text-secondary">
                  {formatPrice(product.price)} · stok {product.cachedStock}
                </p>
              </div>
              <button
                type="button"
                disabled={outOfStock}
                onClick={() => onAdd(product)}
                className="shrink-0 rounded-md border border-accent px-3 py-1.5 text-xs font-medium text-accent disabled:cursor-not-allowed disabled:border-border disabled:text-text-secondary"
              >
                {outOfStock ? "Habis" : "Tambah"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
