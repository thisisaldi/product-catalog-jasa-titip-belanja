import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Single UI font per 03-design-specification.md Section 1.1 — "UI text
// always uses --font-sans. No serif in product cards, buttons, filters, or
// body copy." (Direction B — Warm Modern Boutique, not the rejected
// Editorial Boutique direction.)
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Katalog Produk",
  description: "Katalog produk kurasi multi-brand.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${plusJakartaSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg text-text-primary font-sans">
        {children}
      </body>
    </html>
  );
}
