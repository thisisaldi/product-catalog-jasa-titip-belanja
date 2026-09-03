import Link from "next/link";

/**
 * Fixed-size slot per 03-design-specification.md Section 1.1 — plain text
 * wordmark today (text-lg font-semibold, --font-sans), swappable to an
 * image/SVG later with zero layout change. No serif/italic per Section 1.1:
 * "No serif in product cards, buttons, filters, or body copy."
 */
export function Logo() {
  return (
    <Link
      href="/"
      aria-label="Katalog — kembali ke beranda"
      className="flex h-8 max-w-[180px] items-center truncate text-lg font-semibold text-text-primary sm:h-9"
    >
      Katalog
    </Link>
  );
}
