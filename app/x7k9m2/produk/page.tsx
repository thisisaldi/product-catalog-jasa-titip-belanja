import Link from "next/link";
import { listProducts } from "@/lib/admin/queries";
import { formatPrice } from "@/lib/format";
import { StatusBadge } from "@/components/admin/StatusBadge";

export default async function AdminProductsPage() {
  const products = await listProducts();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Produk</h1>
        <Link
          href="/x7k9m2/produk/baru"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          Tambah Produk
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto">
        {products.length === 0 ? (
          <p className="text-sm text-text-secondary">Belum ada produk.</p>
        ) : (
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-text-secondary">
                <th className="py-2 pr-4">Nama</th>
                <th className="py-2 pr-4">Merek</th>
                <th className="py-2 pr-4">Kategori</th>
                <th className="py-2 pr-4">Harga</th>
                <th className="py-2 pr-4">Stok</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-border">
                  <td className="py-3 pr-4 font-medium">
                    {p.name}
                    {p.isManuallyUnavailable && (
                      <span className="ml-2 text-xs text-sold-out">(nonaktif manual)</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-sm text-text-secondary">{p.brand.name}</td>
                  <td className="py-3 pr-4 text-sm text-text-secondary">{p.category.name}</td>
                  <td className="py-3 pr-4 text-sm">{formatPrice(p.price)}</td>
                  <td className="py-3 pr-4 text-sm">{p.cachedStock}</td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="py-3">
                    <Link href={`/x7k9m2/produk/${p.id}`} className="text-sm text-accent hover:underline">
                      Kelola
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
