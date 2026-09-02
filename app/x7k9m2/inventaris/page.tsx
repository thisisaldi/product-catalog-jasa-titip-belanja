import { InventoryStockForm } from "@/components/admin/InventoryStockForm";
import { listInventoryHistory, listProductsForInventoryPicker } from "@/lib/admin/queries";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ produk?: string }>;
}) {
  const { produk } = await searchParams;
  const [products, history] = await Promise.all([
    listProductsForInventoryPicker(),
    listInventoryHistory(produk),
  ]);
  const productNameById = new Map(products.map((p) => [p.id, p.name]));

  return (
    <div>
      <h1 className="text-xl font-semibold">Inventaris</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Catat stok masuk/keluar manual. Bukan bagian dari transaksi penjualan.
      </p>

      <div className="mt-6">
        <InventoryStockForm products={products} defaultProductId={produk} />
      </div>

      <div className="mt-8 overflow-x-auto">
        <h2 className="text-base font-semibold">
          {produk ? `Riwayat: ${productNameById.get(produk) ?? "Produk"}` : "Riwayat Terbaru"}
        </h2>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">Belum ada transaksi.</p>
        ) : (
          <table className="mt-3 w-full min-w-[560px] text-left">
            <thead>
              <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-text-secondary">
                <th className="py-2 pr-4">Tanggal</th>
                <th className="py-2 pr-4">Produk</th>
                <th className="py-2 pr-4">Jenis</th>
                <th className="py-2 pr-4">Jumlah</th>
                <th className="py-2">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {history.map((t) => (
                <tr key={t.id} className="border-b border-border">
                  <td className="py-2 pr-4 text-sm text-text-secondary">
                    {new Date(t.createdAt).toLocaleString("id-ID")}
                  </td>
                  <td className="py-2 pr-4 text-sm">{productNameById.get(t.productId) ?? "-"}</td>
                  <td className="py-2 pr-4">
                    <span className={t.type === "IN" ? "text-available" : "text-sold-out"}>
                      {t.type === "IN" ? "Masuk" : "Keluar"}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-sm">{t.quantity}</td>
                  <td className="py-2 text-sm text-text-secondary">{t.note ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
