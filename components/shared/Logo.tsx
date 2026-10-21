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
      className="flex h-8 max-w-[180px] shrink-0 items-center truncate rounded-sm text-lg font-semibold tracking-tight text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:h-9"
    >
      Katalog
    </Link>
  );
}
