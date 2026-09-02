"use client";

import { formatPrice } from "@/lib/format";

export type CartLine = {
  productId: string;
  name: string;
  price: number;
  cachedStock: number;
  quantity: number;
};

export function CartTable({
  lines,
  onIncrement,
  onDecrement,
  onRemove,
}: {
  lines: CartLine[];
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
}) {
  const total = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);

  if (lines.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-text-secondary">
        Keranjang kosong. Tambahkan produk dari daftar di atas.
      </p>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-border rounded-md border border-border">
        {lines.map((line) => {
          const exceedsStock = line.quantity > line.cachedStock;
          return (
            <li key={line.productId} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{line.name}</p>
                <p className="text-xs text-text-secondary">{formatPrice(line.price)} / item</p>
                {exceedsStock && (
                  <p className="text-xs text-sold-out">Melebihi stok tersedia ({line.cachedStock}).</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onDecrement(line.productId)}
                  className="h-7 w-7 rounded border border-border text-sm"
                  aria-label={`Kurangi jumlah ${line.name}`}
                >
                  −
                </button>
                <span className="w-8 text-center text-sm">{line.quantity}</span>
                <button
                  type="button"
                  onClick={() => onIncrement(line.productId)}
                  className="h-7 w-7 rounded border border-border text-sm"
                  aria-label={`Tambah jumlah ${line.name}`}
                >
                  +
                </button>
              </div>
              <p className="w-28 shrink-0 text-right text-sm font-medium">
                {formatPrice(line.price * line.quantity)}
              </p>
              <button
                type="button"
                onClick={() => onRemove(line.productId)}
                className="shrink-0 text-xs text-sold-out underline-offset-2 hover:underline"
              >
                Hapus
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <span className="text-sm font-medium">Total</span>
        <span className="text-lg font-semibold">{formatPrice(total)}</span>
      </div>
    </div>
  );
}
