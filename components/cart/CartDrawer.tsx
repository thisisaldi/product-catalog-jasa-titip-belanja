"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart/CartContext";
import { createPublicSale } from "@/lib/catalog/checkout-actions";
import { buildWhatsAppLink } from "@/lib/whatsapp/build-link";
import { formatPrice } from "@/lib/format";
import { CloseIcon } from "@/components/shared/icons";

export function CartDrawer() {
  const cart = useCart();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (cart.isOpen && !dialog.open) dialog.showModal();
    if (!cart.isOpen && dialog.open) dialog.close();
  }, [cart.isOpen]);

  function handleDialogClose() {
    cart.closeCart();
    setError(null);
  }

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
        setError(result.error);
        // Cart is deliberately NOT cleared on failure — the customer can
        // adjust quantities and retry (01-product-requirements.md Section 5.1a).
        return;
      }
      cart.completeCheckout(result);
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const whatsappHref =
    cart.checkoutResult?.whatsappNumber && cart.checkoutResult
      ? buildWhatsAppLink(cart.checkoutResult.whatsappNumber, cart.checkoutResult.invoiceText)
      : null;

  return (
    <dialog
      ref={dialogRef}
      onClose={handleDialogClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) dialogRef.current?.close();
      }}
      aria-label="Keranjang belanja"
      className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-md border-0 bg-surface p-0 backdrop:bg-black/40 sm:rounded-l-2xl"
      style={{ position: "fixed", top: 0, right: 0, left: "auto" }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-text-primary">
            {cart.view === "checkout"
              ? "Detail Pemesanan"
              : cart.view === "success"
                ? "Pesanan Terkirim"
                : "Keranjang"}
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Tutup keranjang"
            className="rounded-full p-1.5 text-text-secondary hover:bg-accent-soft hover:text-accent"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {cart.view === "cart" && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {cart.items.length === 0 ? (
                <p className="py-16 text-center text-sm text-text-secondary">
                  Keranjang kamu masih kosong. Yuk mulai jelajahi katalog.
                </p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {cart.items.map((item) => (
                    <li key={item.productId} className="flex gap-3">
                      <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-border">
                        {item.imageUrl && (
                          // Plain <img>, not next/image: Storage host varies per environment.
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs uppercase tracking-wide text-text-secondary">
                          {item.brandName}
                        </p>
                        <p className="truncate text-sm font-medium text-text-primary">{item.name}</p>
                        <p className="mt-0.5 text-sm text-text-secondary">{formatPrice(item.price)}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => cart.decrementItem(item.productId)}
                            aria-label={`Kurangi jumlah ${item.name}`}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-sm transition-colors hover:border-accent hover:text-accent"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => cart.incrementItem(item.productId)}
                            aria-label={`Tambah jumlah ${item.name}`}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-sm transition-colors hover:border-accent hover:text-accent"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col items-end justify-between">
                        <p className="text-sm font-semibold text-text-primary">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                        <button
                          type="button"
                          onClick={() => cart.removeItem(item.productId)}
                          className="text-xs text-sold-out underline-offset-2 hover:underline"
                        >
                          Hapus
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {cart.items.length > 0 && (
              <div className="border-t border-border px-5 py-4">
                <div className="flex items-center justify-between text-base">
                  <span className="font-medium">Total</span>
                  <span className="font-semibold">{formatPrice(cart.totalPrice)}</span>
                </div>
                <button
                  type="button"
                  onClick={cart.goToCheckout}
                  className="mt-4 w-full rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-transform active:scale-[0.98]"
                >
                  Lanjut Pesan
                </button>
              </div>
            )}
          </>
        )}

        {cart.view === "checkout" && (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto px-5 py-4">
            <p className="text-sm text-text-secondary">
              Isi data berikut untuk membuat pesanan. Pembayaran dan konfirmasi selanjutnya
              dilakukan lewat WhatsApp.
            </p>

            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label htmlFor="cart-name" className="mb-1 block text-sm font-medium">
                  Nama
                </label>
                <input
                  id="cart-name"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2 text-base focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
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
                  className="w-full rounded-md border border-border px-3 py-2 text-base focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label htmlFor="cart-note" className="mb-1 block text-sm font-medium">
                  Catatan (opsional)
                </label>
                <textarea
                  id="cart-note"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2 text-base focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-accent-soft p-3 text-sm">
              <div className="flex justify-between font-medium">
                <span>Total ({cart.totalCount} item)</span>
                <span>{formatPrice(cart.totalPrice)}</span>
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-sold-out">{error}</p>}

            <div className="mt-auto flex flex-col gap-2 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-accent px-6 py-3 text-sm font-medium text-white disabled:opacity-60"
              >
                {isSubmitting ? "Memproses..." : "Buat Pesanan"}
              </button>
              <button
                type="button"
                onClick={cart.goToCart}
                className="w-full rounded-full border border-border px-6 py-3 text-sm font-medium text-text-secondary"
              >
                Kembali ke Keranjang
              </button>
            </div>
          </form>
        )}

        {cart.view === "success" && cart.checkoutResult && (
          <div className="flex flex-1 flex-col overflow-y-auto px-5 py-4">
            <div className="rounded-lg border border-available bg-accent-soft px-4 py-3 text-sm">
              Pesanan <strong>{cart.checkoutResult.invoiceNumber}</strong> berhasil dibuat. Kirim
              pesan berikut lewat WhatsApp untuk melanjutkan.
            </div>
            <pre className="mt-4 whitespace-pre-wrap rounded-md border border-border bg-bg p-4 font-mono text-sm">
              {cart.checkoutResult.invoiceText}
            </pre>
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-whatsapp-cta px-6 text-base font-medium text-whatsapp-text hover:brightness-95"
              >
                Kirim via WhatsApp
              </a>
            ) : (
              <p className="mt-4 text-sm text-sold-out">
                Nomor WhatsApp belum dikonfigurasi — hubungi kami secara langsung.
              </p>
            )}
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="mt-3 w-full rounded-full border border-border px-6 py-3 text-sm font-medium text-text-secondary"
            >
              Lanjut Belanja
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
