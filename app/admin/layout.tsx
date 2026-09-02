import Link from "next/link";

// Browser-visible paths on the admin subdomain — never prefixed with /admin,
// since middleware.ts rewrites admin.<domain>/* to the /admin/* filesystem
// route internally; the address bar never shows that prefix.
const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/produk", label: "Produk" },
  { href: "/kategori", label: "Kategori" },
  { href: "/merek", label: "Merek" },
  { href: "/inventaris", label: "Inventaris" },
  { href: "/penjualan", label: "Penjualan" },
  { href: "/pengaturan", label: "Pengaturan" },
  { href: "/kredensial", label: "Kredensial" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <nav className="w-56 shrink-0 border-r border-border p-4">
        <p className="text-sm font-semibold">Admin</p>
        <ul className="mt-4 space-y-1 text-sm">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded-md px-2 py-1.5 text-text-secondary hover:bg-accent-soft hover:text-accent"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
