"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart/CartContext";
import { createPublicSale } from "@/lib/catalog/checkout-actions";
import { buildWhatsAppLink } from "@/lib/whatsapp/build-link";
import { formatPrice } from "@/lib/format";
import { ArrowLeftIcon, BagIcon, CheckIcon, WhatsAppIcon } from "@/components/shared/icons";

type View = "cart" | "checkout" | "success";
type CheckoutSuccess = { invoiceNumber: string; invoiceText: string; whatsappNumber: string | null };

export function CartPageContent() {
  const cart = useCart();
  const [view, setView] = useState<View>("cart");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<CheckoutSuccess | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!customerName.trim() || !customerPhone.trim()) {
      setError("Nama dan nomor WhatsApp wajib diisi.");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await createPublicSale({
        customerName,
        customerPhone,
        note,
        items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
      if ("error" in result) {
        // Cart and the entered form values are deliberately retained on
        // failure — the customer adjusts and retries (01 Section 5.1a).
        setError(result.error);
        return;
      }
      setCheckoutResult(result);
      setView("success");
      cart.clearCart();
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const whatsappHref =
    checkoutResult?.whatsappNumber && checkoutResult
      ? buildWhatsAppLink(checkoutResult.whatsappNumber, checkoutResult.invoiceText)
      : null;

  if (view === "success" && checkoutResult) {
    return (
      <div className="mx-auto max-w-lg py-6">
        <div className="flex gap-3 rounded-lg bg-available-soft px-5 py-4 text-sm leading-relaxed text-text-primary">
          <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-available" />
          <p>
            Pesanan <span className="font-semibold">{checkoutResult.invoiceNumber}</span> berhasil
            dibuat. Kirim pesan berikut lewat WhatsApp untuk melanjutkan.
          </p>
        </div>
        <pre className="mt-5 whitespace-pre-wrap rounded-lg border border-border bg-surface p-5 font-mono text-sm leading-relaxed text-text-primary">
          {checkoutResult.invoiceText}
        </pre>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-whatsapp-cta px-6 text-base font-medium text-whatsapp-text transition-[filter,transform] hover:brightness-95 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-cta focus-visible:ring-offset-2"
            >
              <WhatsAppIcon className="h-5 w-5 text-whatsapp" />
              Kirim via WhatsApp
            </a>
          ) : (
            <p className="text-sm text-sold-out">Nomor WhatsApp belum dikonfigurasi.</p>
          )}
          <Link
            href="/"
            className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-border bg-surface px-6 text-base font-medium text-text-primary transition-colors hover:border-accent hover:text-accent"
          >
            Lanjut Belanja
          </Link>
        </div>
      </div>
    );
  }

  if (view === "checkout") {
    return (
      <div className="mx-auto max-w-lg py-6">
        <button
          type="button"
          onClick={() => setView("cart")}
          className="-ml-2 inline-flex h-10 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-text-secondary transition-colors hover:text-accent"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Kembali ke keranjang
        </button>
        <h1 className="mt-3 text-2xl font-semibold text-text-primary">Detail Pemesanan</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Isi data berikut untuk membuat pesanan. Pembayaran dan konfirmasi selanjutnya
          dilakukan lewat WhatsApp.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="cart-name" className="mb-1.5 block text-sm font-medium text-text-primary">
              Nama
            </label>
            <input
              id="cart-name"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-base text-text-primary transition-colors placeholder:text-text-secondary hover:border-text-secondary/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <div>
            <label htmlFor="cart-phone" className="mb-1.5 block text-sm font-medium text-text-primary">
              Nomor WhatsApp
            </label>
            <input
              id="cart-phone"
              required
              placeholder="+6281234567890"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-base text-text-primary transition-colors placeholder:text-text-secondary hover:border-text-secondary/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <div>
            <label htmlFor="cart-note" className="mb-1.5 block text-sm font-medium text-text-primary">
              Catatan (opsional)
            </label>
            <textarea
              id="cart-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-base text-text-primary transition-colors placeholder:text-text-secondary hover:border-text-secondary/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>

          <div className="rounded-lg bg-surface-muted p-4 text-sm">
            <div className="flex justify-between font-medium text-text-primary">
              <span>Total ({cart.totalCount} item)</span>
              <span className="font-semibold tabular-nums">{formatPrice(cart.totalPrice)}</span>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 text-sm font-medium text-accent-strong"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 h-12 w-full rounded-full bg-accent px-6 text-base font-medium text-white transition-[background-color,transform] hover:bg-accent-strong active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60"
          >
            {isSubmitting ? "Memproses..." : "Buat Pesanan"}
          </button>
        </form>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted">
          <BagIcon className="h-8 w-8 text-text-secondary" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-text-primary">Keranjang kamu kosong</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Yuk jelajahi katalog dan temukan produk favoritmu.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-accent px-6 text-sm font-medium text-white transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          Lihat Katalog
        </Link>
      </div>
    );
  }

  return (
    <div className="py-2">
      <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">Keranjang</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-3">
        <ul className="flex flex-col gap-5 lg:col-span-2">
          {cart.items.map((item) => (
            <li key={item.productId} className="flex gap-4 border-b border-border pb-5">
              <div className="h-28 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                {item.imageUrl && (
                  // Plain <img>, not next/image: Storage host varies per environment.
                  <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-text-secondary">
                    {item.brandName}
                  </p>
                  <p className="mt-0.5 font-medium text-text-primary">{item.name}</p>
                  <p className="mt-1 text-sm tabular-nums text-text-secondary">{formatPrice(item.price)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => cart.decrementItem(item.productId)}
                    aria-label={`Kurangi jumlah ${item.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-base transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-95"
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-medium tabular-nums">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => cart.incrementItem(item.productId)}
                    disabled={item.quantity >= 20}
                    aria-label={`Tambah jumlah ${item.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-base transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => cart.removeItem(item.productId)}
                    className="ml-auto text-sm text-text-secondary underline-offset-2 transition-colors hover:text-accent hover:underline"
                  >
                    Hapus
                  </button>
                </div>
              </div>
              <p className="shrink-0 self-start font-semibold tabular-nums text-text-primary">
                {formatPrice(item.price * item.quantity)}
              </p>
            </li>
          ))}
        </ul>

        <div className="lg:sticky lg:top-24 lg:h-fit">
          <div className="rounded-lg border border-border bg-surface p-6 shadow-card">
            <div className="flex items-center justify-between text-base">
              <span className="font-medium">Total</span>
              <span className="text-lg font-semibold tabular-nums">{formatPrice(cart.totalPrice)}</span>
            </div>
            <button
              type="button"
              onClick={() => setView("checkout")}
              className="mt-5 h-12 w-full rounded-full bg-accent px-6 text-base font-medium text-white transition-[background-color,transform] hover:bg-accent-strong active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              Checkout
            </button>
            <Link
              href="/"
              className="mt-3 block text-center text-sm text-text-secondary underline-offset-2 hover:underline"
            >
              Lanjut Belanja
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
