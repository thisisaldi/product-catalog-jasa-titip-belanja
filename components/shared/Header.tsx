"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "./Logo";
import { SearchIcon, WhatsAppIcon } from "./icons";
import { Container } from "./Container";
import { CartIndicator } from "@/components/cart/CartIndicator";
import { buildWhatsAppLink } from "@/lib/whatsapp/build-link";

function SearchForm({ id }: { id: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? `/?q=${encodeURIComponent(q)}` : "/");
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <label htmlFor={id} className="sr-only">
        Cari produk
      </label>
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Cari produk, brand, atau kategori"
        className="w-full rounded-full border border-border bg-surface py-2.5 pl-10 pr-4 text-base text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
      />
    </form>
  );
}

export function Header({ whatsappNumber }: { whatsappNumber: string }) {
  const contactHref = buildWhatsAppLink(
    whatsappNumber,
    "Halo Kak, saya ingin bertanya tentang produk di katalog.",
  );
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center gap-4 sm:h-20">
          <Logo />
          <div className="hidden max-w-md flex-1 sm:block">
            <SearchForm id="header-search-desktop" />
          </div>
          <div className="ml-auto flex items-center gap-1 sm:ml-0">
            <a
              href={contactHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Hubungi kami via WhatsApp"
              className="rounded-full p-2 text-text-secondary hover:text-whatsapp-cta"
            >
              <WhatsAppIcon className="h-5 w-5" />
            </a>
            <CartIndicator />
          </div>
        </div>
      </Container>
      <div className="border-t border-border px-5 pb-3 pt-2 sm:hidden">
        <SearchForm id="header-search-mobile" />
      </div>
    </header>
  );
}
