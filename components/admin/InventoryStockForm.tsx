"use client";

import { useActionState } from "react";
import { SubmitButton } from "./SubmitButton";
import { adjustStock } from "@/lib/admin/actions/inventory";
import type { ActionResult } from "@/lib/admin/actions/taxonomy";

export function InventoryStockForm({
  products,
  defaultProductId,
}: {
  products: { id: string; name: string; cachedStock: number }[];
  defaultProductId?: string;
}) {
  const [state, formAction] = useActionState(
    async (_prev: ActionResult, formData: FormData) => adjustStock(formData),
    {},
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
      <div className="min-w-48">
        <label htmlFor="productId" className="mb-1 block text-sm font-medium">
          Produk
        </label>
        <select
          id="productId"
          name="productId"
          required
          defaultValue={defaultProductId ?? ""}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="" disabled>
            Pilih produk
          </option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (stok: {p.cachedStock})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="type" className="mb-1 block text-sm font-medium">
          Jenis
        </label>
        <select
          id="type"
          name="type"
          required
          defaultValue="IN"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="IN">Stok Masuk</option>
          <option value="OUT">Stok Keluar</option>
        </select>
      </div>

      <div>
        <label htmlFor="quantity" className="mb-1 block text-sm font-medium">
          Jumlah
        </label>
        <input
          id="quantity"
          name="quantity"
          type="number"
          min={1}
          step="1"
          required
          className="w-24 rounded-md border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div className="min-w-48 flex-1">
        <label htmlFor="note" className="mb-1 block text-sm font-medium">
          Catatan
        </label>
        <input
          id="note"
          name="note"
          placeholder="mis. Koreksi stok fisik"
          className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <SubmitButton pendingText="Menyimpan...">Catat Transaksi</SubmitButton>

      {state.error && <p className="w-full text-sm text-sold-out">{state.error}</p>}
    </form>
  );
}
