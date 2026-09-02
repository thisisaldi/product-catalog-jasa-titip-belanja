"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart/CartContext";
import { createPublicSale } from "@/lib/catalog/checkout-actions";
import { buildWhatsAppLink } from "@/lib/whatsapp/build-link";
import { formatPrice } from "@/lib/format";
import { BagIcon } from "@/components/shared/icons";

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
        <div className="rounded-lg border border-available bg-accent-soft px-5 py-4 text-sm">
          Pesanan <strong>{checkoutResult.invoiceNumber}</strong> berhasil dibuat. Kirim pesan
          berikut lewat WhatsApp untuk melanjutkan.
        </div>
        <pre className="mt-5 whitespace-pre-wrap rounded-lg border border-border bg-surface p-5 font-mono text-sm leading-relaxed">
          {checkoutResult.invoiceText}
        </pre>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-whatsapp-cta px-6 text-base font-medium text-whatsapp-text hover:brightness-95"
            >
              Kirim via WhatsApp
            </a>
          ) : (
            <p className="text-sm text-sold-out">Nomor WhatsApp belum dikonfigurasi.</p>
          )}
          <Link
            href="/"
            className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-border px-6 text-base font-medium text-text-primary"
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
          className="text-sm text-text-secondary underline-offset-2 hover:underline"
        >
          ← Kembali ke keranjang
        </button>
        <h1 className="mt-3 font-serif text-2xl text-text-primary">Detail Pemesanan</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Isi data berikut untuk membuat pesanan. Pembayaran dan konfirmasi selanjutnya
          dilakukan lewat WhatsApp.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="cart-name" className="mb-1 block text-sm font-medium">
              Nama
            </label>
            <input
              id="cart-name"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full rounded-md border border-border px-3.5 py-2.5 text-base focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label htmlFor="cart-phone" className="mb-1 block text-sm font-medium">
              Nomor WhatsApp
            </label>
            <input
              id="cart-phone"
              required
              placeholder="+6281234567890"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full rounded-md border border-border px-3.5 py-2.5 text-base focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label htmlFor="cart-note" className="mb-1 block text-sm font-medium">
              Catatan (opsional)
            </label>
            <textarea
              id="cart-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-md border border-border px-3.5 py-2.5 text-base focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="rounded-lg bg-accent-soft p-4 text-sm">
            <div className="flex justify-between font-medium">
              <span>Total ({cart.totalCount} item)</span>
              <span>{formatPrice(cart.totalPrice)}</span>
            </div>
          </div>

          {error && <p className="text-sm text-sold-out">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-full bg-accent px-6 py-3.5 text-base font-medium text-white disabled:opacity-60"
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
        <BagIcon className="h-12 w-12 text-text-secondary" />
        <h1 className="mt-5 font-serif text-2xl text-text-primary">Keranjang kamu kosong</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Yuk jelajahi katalog dan temukan produk favoritmu.
        </p>
        <Link
          href="/"
          className="mt-6 rounded-full bg-accent px-6 py-3 text-sm font-medium text-white"
        >
          Lihat Katalog
        </Link>
      </div>
    );
  }

  return (
    <div className="py-2">
      <h1 className="font-serif text-2xl text-text-primary sm:text-3xl">Keranjang</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-3">
        <ul className="flex flex-col gap-5 lg:col-span-2">
          {cart.items.map((item) => (
            <li key={item.productId} className="flex gap-4 border-b border-border pb-5">
              <div className="h-28 w-24 shrink-0 overflow-hidden rounded-lg bg-border">
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
                  <p className="mt-1 text-sm text-text-secondary">{formatPrice(item.price)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => cart.decrementItem(item.productId)}
                    aria-label={`Kurangi jumlah ${item.name}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-base transition-colors hover:border-accent hover:text-accent"
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-medium">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => cart.incrementItem(item.productId)}
                    aria-label={`Tambah jumlah ${item.name}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-base transition-colors hover:border-accent hover:text-accent"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => cart.removeItem(item.productId)}
                    className="ml-2 text-sm text-sold-out underline-offset-2 hover:underline"
                  >
                    Hapus
                  </button>
                </div>
              </div>
              <p className="shrink-0 self-start font-semibold text-text-primary">
                {formatPrice(item.price * item.quantity)}
              </p>
            </li>
          ))}
        </ul>

        <div className="lg:sticky lg:top-28 lg:h-fit">
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between text-base">
              <span className="font-medium">Total</span>
              <span className="text-lg font-semibold">{formatPrice(cart.totalPrice)}</span>
            </div>
            <button
              type="button"
              onClick={() => setView("checkout")}
              className="mt-5 w-full rounded-full bg-accent px-6 py-3.5 text-base font-medium text-white transition-transform active:scale-[0.98]"
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
