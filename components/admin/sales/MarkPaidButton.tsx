"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markSalePaid } from "@/lib/admin/actions/sales";

export function MarkPaidButton({ saleId }: { saleId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm("Tandai penjualan ini sebagai LUNAS? Tindakan ini tidak dapat dibatalkan.")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await markSalePaid(saleId);
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
        className="rounded-lg bg-available px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? "Menyimpan..." : "Tandai Lunas"}
      </button>
      {error && <p className="mt-2 text-sm text-sold-out">{error}</p>}
    </div>
  );
}
