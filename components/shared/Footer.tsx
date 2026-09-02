import { buildWhatsAppLink } from "@/lib/whatsapp/build-link";
import { Container } from "./Container";

export function Footer({ whatsappNumber }: { whatsappNumber: string }) {
  const contactHref = buildWhatsAppLink(
    whatsappNumber,
    "Halo Kak, saya ingin bertanya tentang produk di katalog.",
  );
  return (
    <footer className="border-t border-border bg-surface">
      <Container className="py-14 sm:py-16">
        <p className="font-serif text-2xl italic text-text-primary">Katalog</p>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-text-secondary">
          Katalog produk kurasi dari berbagai brand. Lihat produknya, lanjutkan obrolan lewat
          WhatsApp.
        </p>
        <a
          href={contactHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-block text-sm font-medium text-accent underline-offset-4 hover:underline"
        >
          Hubungi Kami →
        </a>
        <p className="mt-10 border-t border-border pt-6 text-xs text-text-secondary">
          &copy; {new Date().getFullYear()} Katalog. Seluruh hak cipta dilindungi.
        </p>
      </Container>
    </footer>
  );
}
