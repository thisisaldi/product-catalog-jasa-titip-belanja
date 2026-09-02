"use client";

import { useActionState } from "react";
import { SubmitButton } from "./SubmitButton";
import { updateSettings } from "@/lib/admin/actions/settings";
import type { AdminSettings } from "@/lib/admin/types";

export function SettingsForm({ initial }: { initial: AdminSettings }) {
  const [state, formAction] = useActionState(updateSettings, {});

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <div>
        <label htmlFor="whatsappNumber" className="mb-1 block text-sm font-medium">
          Nomor WhatsApp (format E.164)
        </label>
        <input
          id="whatsappNumber"
          name="whatsappNumber"
          required
          placeholder="+6281234567890"
          defaultValue={initial.whatsappNumber}
          className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div>
        <label htmlFor="orderMessageTemplate" className="mb-1 block text-sm font-medium">
          Template Pesan Pemesanan
        </label>
        <p className="mb-1 text-xs text-text-secondary">Placeholder: {"{brand} {product_name} {price} {qty}"}</p>
        <textarea
          id="orderMessageTemplate"
          name="orderMessageTemplate"
          rows={5}
          required
          defaultValue={initial.orderMessageTemplate}
          className="w-full rounded-md border border-border px-3 py-2 text-sm font-mono focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div>
        <label htmlFor="availabilityMessageTemplate" className="mb-1 block text-sm font-medium">
          Template Pesan Ketersediaan
        </label>
        <p className="mb-1 text-xs text-text-secondary">Placeholder: {"{brand} {product_name}"}</p>
        <textarea
          id="availabilityMessageTemplate"
          name="availabilityMessageTemplate"
          rows={4}
          required
          defaultValue={initial.availabilityMessageTemplate}
          className="w-full rounded-md border border-border px-3 py-2 text-sm font-mono focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div>
        <label htmlFor="invoiceMessageTemplate" className="mb-1 block text-sm font-medium">
          Template Invoice
        </label>
        <p className="mb-1 text-xs text-text-secondary">
          Placeholder: {"{invoice_number} {customer_name} {item_list} {subtotal} {shipping_cost} {other_cost} {total}"}
        </p>
        <textarea
          id="invoiceMessageTemplate"
          name="invoiceMessageTemplate"
          rows={6}
          required
          defaultValue={initial.invoiceMessageTemplate}
          className="w-full rounded-md border border-border px-3 py-2 text-sm font-mono focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <p className="mt-1 text-xs text-text-secondary">
          Belum digunakan sampai fitur penjualan (Milestone 3) tersedia.
        </p>
      </div>

      {state.error && <p className="text-sm text-sold-out">{state.error}</p>}
      {state.success && <p className="text-sm text-available">Pengaturan tersimpan.</p>}

      <div>
        <SubmitButton>Simpan Pengaturan</SubmitButton>
      </div>
    </form>
  );
}
