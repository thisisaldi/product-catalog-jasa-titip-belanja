import { resolveTemplate, buildWhatsAppLink } from "@/lib/whatsapp/build-link";
import { formatPrice } from "@/lib/format";
import { WhatsAppIcon } from "@/components/shared/icons";

type WhatsAppCTAProps = {
  phoneNumber: string;
  orderMessageTemplate: string;
  availabilityMessageTemplate: string;
  product: { brand: string; name: string; price: number };
  available: boolean;
  className?: string;
};

export function WhatsAppCTA({
  phoneNumber,
  orderMessageTemplate,
  availabilityMessageTemplate,
  product,
  available,
  className,
}: WhatsAppCTAProps) {
  const label = available ? "Pesan via WhatsApp" : "Tanya Ketersediaan";
  const message = available
    ? resolveTemplate(orderMessageTemplate, {
        brand: product.brand,
        product_name: product.name,
        price: formatPrice(product.price),
        qty: "1",
      })
    : resolveTemplate(availabilityMessageTemplate, {
        brand: product.brand,
        product_name: product.name,
      });
  const href = buildWhatsAppLink(phoneNumber, message);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} ${product.name} via WhatsApp`}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-full bg-whatsapp-cta px-6 text-base font-medium text-whatsapp-text transition-[filter,transform] duration-200 hover:brightness-95 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-cta focus-visible:ring-offset-2 ${className ?? ""}`}
    >
      <WhatsAppIcon className="h-5 w-5 text-whatsapp" />
      {label}
    </a>
  );
}
