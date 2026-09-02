import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

// Warm soft-serif for the logo/headings — the one typographic move that
// does the most to move the site away from a generic sans-only SaaS feel
// toward an editorial/boutique identity (docs/02-design-brief.md Section 18/26).
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
});

export const metadata: Metadata = {
  title: "Katalog Produk",
  description: "Katalog produk kurasi multi-brand.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${plusJakartaSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-text-primary font-sans">
        {children}
      </body>
    </html>
  );
}
