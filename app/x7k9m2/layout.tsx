import Link from "next/link";
import type { Metadata } from "next";

// Obscure static path, same hostname as the public site (04-system-design.md
// Section 7.1, migrated 2026-09-04 off the earlier admin subdomain) — every
// admin link is an absolute path prefixed with /x7k9m2, since "/" now
// resolves to the public catalog, not the admin dashboard.
const ADMIN_ROOT = "/x7k9m2";

const NAV_ITEMS = [
  { href: `${ADMIN_ROOT}/`, label: "Dashboard" },
  { href: `${ADMIN_ROOT}/produk`, label: "Produk" },
  { href: `${ADMIN_ROOT}/kategori`, label: "Kategori" },
  { href: `${ADMIN_ROOT}/merek`, label: "Merek" },
  { href: `${ADMIN_ROOT}/inventaris`, label: "Inventaris" },
  { href: `${ADMIN_ROOT}/penjualan`, label: "Penjualan" },
  { href: `${ADMIN_ROOT}/pengaturan`, label: "Pengaturan" },
  { href: `${ADMIN_ROOT}/kredensial`, label: "Kredensial" },
];

// Defense-in-depth only (06-security.md Section 2.8) — a courtesy signal to
// compliant crawlers, never the security boundary; robots.txt is not relied
// on either. Real protection is the token + signed session cookie (Section 7).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

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
