import { buildWhatsAppLink } from "@/lib/whatsapp/build-link";
import { Container } from "./Container";
import { Logo } from "./Logo";
import { WhatsAppIcon } from "./icons";

export function Footer({ whatsappNumber }: { whatsappNumber: string }) {
  const contactHref = buildWhatsAppLink(
    whatsappNumber,
    "Halo Kak, saya ingin bertanya tentang produk di katalog.",
  );
  return (
    <footer className="border-t border-border bg-surface">
      <Container className="py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-2 md:items-end">
          <div>
            <Logo />
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-text-secondary">
              Katalog produk kurasi dari berbagai brand. Lihat produknya, lanjutkan obrolan lewat
              WhatsApp.
            </p>
          </div>
          <div className="md:justify-self-end">
            <a
              href={contactHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Hubungi kami via WhatsApp"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-5 text-sm font-medium text-text-primary transition-colors hover:border-whatsapp-cta hover:text-whatsapp-cta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <WhatsAppIcon className="h-4 w-4 text-whatsapp-cta" />
              Hubungi Kami
            </a>
          </div>
        </div>
        <p className="mt-10 border-t border-border pt-6 text-xs text-text-secondary">
          &copy; {new Date().getFullYear()} Katalog. Seluruh hak cipta dilindungi.
        </p>
      </Container>
    </footer>
  );
}
