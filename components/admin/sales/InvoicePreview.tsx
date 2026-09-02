import { buildWhatsAppLink } from "@/lib/whatsapp/build-link";

export function InvoicePreview({
  invoiceText,
  whatsappNumber,
}: {
  invoiceText: string;
  whatsappNumber: string | null;
}) {
  const href = whatsappNumber ? buildWhatsAppLink(whatsappNumber, invoiceText) : null;

  return (
    <div>
      <h2 className="text-base font-semibold">Pratinjau Invoice</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Teks ini dibuat dari template pengaturan dan data penjualan tersimpan. Tinjau sebelum
        dikirim — pengiriman dilakukan manual melalui WhatsApp.
      </p>
      <pre className="mt-3 whitespace-pre-wrap rounded-md border border-border bg-surface p-4 font-mono text-sm">
        {invoiceText}
      </pre>

      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-whatsapp-cta px-6 text-base font-medium text-whatsapp-text hover:brightness-95"
        >
          Kirim Invoice via WhatsApp
        </a>
      ) : (
        <p className="mt-4 text-sm text-sold-out">
          Nomor WhatsApp belum dikonfigurasi di Pengaturan — tidak dapat membuat tautan.
        </p>
      )}
    </div>
  );
}
