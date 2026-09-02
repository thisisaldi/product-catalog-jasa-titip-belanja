import { buildWhatsAppLink } from "@/lib/whatsapp/build-link";

export function Footer({ whatsappNumber }: { whatsappNumber: string }) {
  const contactHref = buildWhatsAppLink(
    whatsappNumber,
    "Halo Kak, saya ingin bertanya tentang produk di katalog.",
  );
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-base font-semibold text-text-primary">Katalog</p>
        <p className="mt-2 max-w-sm text-sm text-text-secondary">
          Katalog produk kurasi dari berbagai brand. Lihat produknya, lanjutkan obrolan lewat
          WhatsApp.
        </p>
        <a
          href={contactHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-sm text-text-secondary underline-offset-2 hover:text-accent hover:underline"
        >
          Hubungi Kami
        </a>
        <p className="mt-8 text-xs text-text-secondary">
          &copy; {new Date().getFullYear()} Katalog. Seluruh hak cipta dilindungi.
        </p>
      </div>
    </footer>
  );
}
