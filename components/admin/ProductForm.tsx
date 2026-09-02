"use client";

import { useActionState } from "react";
import { SubmitButton } from "./SubmitButton";
import type { ActionResult } from "@/lib/admin/actions/taxonomy";

export type ProductFormInitial = {
  name: string;
  brandId: string;
  categoryId: string;
  description: string;
  price: number;
  isManuallyUnavailable: boolean;
};

export function ProductForm({
  action,
  brands,
  categories,
  initial,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  brands: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  initial?: ProductFormInitial;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium">
          Nama Produk
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={initial?.name}
          className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="brandId" className="mb-1 block text-sm font-medium">
            Merek
          </label>
          <select
            id="brandId"
            name="brandId"
            required
            defaultValue={initial?.brandId ?? ""}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="" disabled>
              Pilih merek
            </option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="categoryId" className="mb-1 block text-sm font-medium">
            Kategori
          </label>
          <select
            id="categoryId"
            name="categoryId"
            required
            defaultValue={initial?.categoryId ?? ""}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="" disabled>
              Pilih kategori
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="price" className="mb-1 block text-sm font-medium">
          Harga (Rp)
        </label>
        <input
          id="price"
          name="price"
          type="number"
          min={0}
          step="1"
          required
          defaultValue={initial?.price}
          className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium">
          Deskripsi
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={initial?.description}
          className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isManuallyUnavailable"
          defaultChecked={initial?.isManuallyUnavailable}
          className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
        />
        Tandai tidak tersedia secara manual (tidak memengaruhi stok)
      </label>

      {state.error && <p className="text-sm text-sold-out">{state.error}</p>}

      <div>
        <SubmitButton>Simpan Produk</SubmitButton>
      </div>
    </form>
  );
}
