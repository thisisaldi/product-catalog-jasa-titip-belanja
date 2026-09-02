import Link from "next/link";
import { listSales } from "@/lib/admin/queries";
import { formatPrice } from "@/lib/format";
import type { PaymentStatus, SaleStatus } from "@/lib/admin/types";

const PAYMENT_LABEL: Record<PaymentStatus, string> = { PENDING: "Menunggu", PAID: "Lunas" };
const SALE_STATUS_LABEL: Record<SaleStatus, string> = { CONFIRMED: "Dikonfirmasi", CANCELLED: "Dibatalkan" };

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; payment?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const paymentStatus = (sp.payment as PaymentStatus | "all") || "all";
  const saleStatus = (sp.status as SaleStatus | "all") || "all";

  const sales = await listSales({ query: sp.q, paymentStatus, saleStatus });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Penjualan</h1>
        <Link href="/penjualan/baru" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white">
          Catat Penjualan
        </Link>
      </div>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="q" className="mb-1 block text-xs font-medium text-text-secondary">
            Cari invoice / pelanggan
          </label>
          <input
            id="q"
            name="q"
            defaultValue={sp.q}
            placeholder="INV-2026-... atau nama"
            className="rounded-md border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div>
          <label htmlFor="payment" className="mb-1 block text-xs font-medium text-text-secondary">
            Status Pembayaran
          </label>
          <select
            id="payment"
            name="payment"
            defaultValue={paymentStatus}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="all">Semua</option>
            <option value="PENDING">Menunggu</option>
            <option value="PAID">Lunas</option>
          </select>
        </div>
        <div>
          <label htmlFor="status" className="mb-1 block text-xs font-medium text-text-secondary">
            Status Penjualan
          </label>
          <select
            id="status"
            name="status"
            defaultValue={saleStatus}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="all">Semua</option>
            <option value="CONFIRMED">Dikonfirmasi</option>
            <option value="CANCELLED">Dibatalkan</option>
          </select>
        </div>
        <button type="submit" className="rounded-md border border-border px-4 py-2 text-sm font-medium">
          Filter
        </button>
      </form>

      <div className="mt-6 overflow-x-auto">
        {sales.length === 0 ? (
          <p className="text-sm text-text-secondary">Belum ada penjualan.</p>
        ) : (
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-text-secondary">
                <th className="py-2 pr-4">Invoice</th>
                <th className="py-2 pr-4">Pelanggan</th>
                <th className="py-2 pr-4">Tanggal</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-4">Pembayaran</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="border-b border-border">
                  <td className="py-3 pr-4 font-medium">{sale.invoiceNumber}</td>
                  <td className="py-3 pr-4 text-sm text-text-secondary">{sale.customerName ?? "-"}</td>
                  <td className="py-3 pr-4 text-sm text-text-secondary">
                    {new Date(sale.createdAt).toLocaleDateString("id-ID")}
                  </td>
                  <td className="py-3 pr-4 text-sm">{formatPrice(sale.total)}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`text-sm ${sale.paymentStatus === "PAID" ? "text-available" : "text-sold-out"}`}
                    >
                      {PAYMENT_LABEL[sale.paymentStatus]}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-sm text-text-secondary">
                    {SALE_STATUS_LABEL[sale.saleStatus]}
                  </td>
                  <td className="py-3">
                    <Link href={`/penjualan/${sale.id}`} className="text-sm text-accent hover:underline">
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
