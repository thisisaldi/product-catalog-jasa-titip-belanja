import Link from "next/link";
import { getDashboardStats } from "@/lib/admin/queries";

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div>
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Ringkasan operasional. Penjualan dan pembayaran belum tersedia (Milestone 3).
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/x7k9m2/produk"
          className="rounded-lg border border-border p-4 hover:border-accent"
        >
          <p className="text-2xl font-semibold">{stats.activeProducts}</p>
          <p className="text-sm text-text-secondary">Produk aktif</p>
        </Link>
        <Link
          href="/x7k9m2/inventaris"
          className="rounded-lg border border-border p-4 hover:border-accent"
        >
          <p className="text-2xl font-semibold text-sold-out">{stats.outOfStockCount}</p>
          <p className="text-sm text-text-secondary">Stok habis</p>
        </Link>
        <Link
          href="/x7k9m2/inventaris"
          className="rounded-lg border border-border p-4 hover:border-accent"
        >
          <p className="text-2xl font-semibold">{stats.lowStockCount}</p>
          <p className="text-sm text-text-secondary">Stok menipis (≤5)</p>
        </Link>
      </div>
    </div>
  );
}
