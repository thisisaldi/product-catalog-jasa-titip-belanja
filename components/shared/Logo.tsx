import Link from "next/link";

/**
 * Fixed-size slot per 03-design-specification.md Section 1.1 — plain text
 * wordmark today, swappable to an image/SVG later with zero layout change.
 * Set in the display serif (app/layout.tsx) rather than the body sans —
 * a real wordmark treatment instead of looking like a nav-bar label.
 */
export function Logo() {
  return (
    <Link
      href="/"
      aria-label="Katalog — kembali ke beranda"
      className="flex h-8 max-w-[200px] items-center truncate font-serif text-xl italic tracking-tight text-text-primary sm:h-9 sm:text-2xl"
    >
      Katalog
    </Link>
  );
}
