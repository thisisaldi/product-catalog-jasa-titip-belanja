import { notFound } from "next/navigation";
import { getSaleDetail, getSettings } from "@/lib/admin/queries";
import { buildInvoiceText } from "@/lib/sales/invoice";
import { formatPrice } from "@/lib/format";
import { InvoicePreview } from "@/components/admin/sales/InvoicePreview";
import { MarkPaidButton } from "@/components/admin/sales/MarkPaidButton";
import { CancelSaleButton } from "@/components/admin/sales/CancelSaleButton";

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [sale, settings] = await Promise.all([getSaleDetail(id), getSettings()]);
  if (!sale) notFound();

  const invoiceText = settings ? buildInvoiceText(sale, settings.invoiceMessageTemplate) : "";
  const isCancellable = sale.paymentStatus === "PENDING" && sale.saleStatus === "CONFIRMED";
  const isPayable = sale.paymentStatus === "PENDING" && sale.saleStatus === "CONFIRMED";

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{sale.invoiceNumber}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {new Date(sale.createdAt).toLocaleString("id-ID")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`text-sm font-medium ${sale.paymentStatus === "PAID" ? "text-available" : "text-sold-out"}`}
          >
            {sale.paymentStatus === "PAID" ? "Lunas" : "Menunggu Pembayaran"}
          </span>
          <span className="text-sm text-text-secondary">
            {sale.saleStatus === "CANCELLED" ? "Dibatalkan" : "Dikonfirmasi"}
          </span>
        </div>
      </div>

      {sale.saleStatus === "CANCELLED" && (
        <div className="mt-4 rounded-md border border-sold-out bg-accent-soft px-4 py-3 text-sm">
          Dibatalkan pada {sale.cancelledAt && new Date(sale.cancelledAt).toLocaleString("id-ID")}.
          Stok telah dikembalikan.
        </div>
      )}
      {sale.paymentStatus === "PAID" && sale.paidAt && (
        <div className="mt-4 rounded-md border border-available bg-accent-soft px-4 py-3 text-sm">
          Dibayar pada {new Date(sale.paidAt).toLocaleString("id-ID")}.
        </div>
      )}

      <div className="mt-6 grid gap-1 text-sm">
        <p>
          <span className="text-text-secondary">Pelanggan: </span>
          {sale.customerName ?? "-"}
        </p>
        <p>
          <span className="text-text-secondary">WhatsApp: </span>
          {sale.customerPhone ?? "-"}
        </p>
        {sale.note && (
          <p>
            <span className="text-text-secondary">Catatan: </span>
            {sale.note}
          </p>
        )}
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[480px] text-left">
          <thead>
            <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-text-secondary">
              <th className="py-2 pr-4">Produk</th>
              <th className="py-2 pr-4">Jumlah</th>
              <th className="py-2 pr-4">Harga</th>
              <th className="py-2">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item) => (
              <tr key={item.id} className="border-b border-border">
                <td className="py-2 pr-4">{item.productName}</td>
                <td className="py-2 pr-4">{item.quantity}</td>
                <td className="py-2 pr-4">{formatPrice(item.unitPrice)}</td>
                <td className="py-2">{formatPrice(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 flex justify-end gap-4 text-base font-semibold">
          <span>Total</span>
          <span>{formatPrice(sale.total)}</span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {isPayable && <MarkPaidButton saleId={sale.id} />}
        {isCancellable && <CancelSaleButton saleId={sale.id} />}
      </div>

      <div className="mt-10 border-t border-border pt-8">
        <InvoicePreview invoiceText={invoiceText} whatsappNumber={settings?.whatsappNumber ?? null} />
      </div>
    </div>
  );
}
