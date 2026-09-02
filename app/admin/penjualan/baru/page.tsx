import { SaleForm } from "@/components/admin/sales/SaleForm";
import { listSellableProducts } from "@/lib/admin/queries";

export default async function NewSalePage() {
  const products = await listSellableProducts();

  return (
    <div>
      <h1 className="text-xl font-semibold">Catat Penjualan</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Susun pesanan dari produk aktif, lalu simpan. Harga final diambil dari data produk saat
        penjualan disimpan.
      </p>

      {products.length === 0 ? (
        <p className="mt-6 text-sm text-sold-out">
          Belum ada produk aktif untuk dijual. Tambahkan produk terlebih dahulu.
        </p>
      ) : (
        <div className="mt-6">
          <SaleForm products={products} />
        </div>
      )}
    </div>
  );
}
