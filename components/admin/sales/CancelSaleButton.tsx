"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelSale } from "@/lib/admin/actions/sales";

export function CancelSaleButton({ saleId }: { saleId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (
      !window.confirm(
        "Batalkan penjualan ini? Seluruh kuantitas pada penjualan ini akan dikembalikan ke stok. Tindakan ini hanya berlaku untuk penjualan yang belum dibayar.",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await cancelSale(saleId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-lg border border-sold-out px-5 py-2.5 text-sm font-medium text-sold-out disabled:opacity-60"
      >
        {isPending ? "Membatalkan..." : "Batalkan Penjualan"}
      </button>
      {error && <p className="mt-2 text-sm text-sold-out">{error}</p>}
    </div>
  );
}
