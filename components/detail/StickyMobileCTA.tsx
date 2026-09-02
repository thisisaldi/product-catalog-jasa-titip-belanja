import { WhatsAppCTA } from "./WhatsAppCTA";
import type { Product } from "@/lib/catalog/types";

type PublicSettings = {
  whatsappNumber: string;
  orderMessageTemplate: string;
  availabilityMessageTemplate: string;
};

export function StickyMobileCTA({
  settings,
  product,
}: {
  settings: PublicSettings;
  product: Product;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 lg:hidden">
      <WhatsAppCTA
        phoneNumber={settings.whatsappNumber}
        orderMessageTemplate={settings.orderMessageTemplate}
        availabilityMessageTemplate={settings.availabilityMessageTemplate}
        product={{ brand: product.brand.name, name: product.name, price: product.price }}
        available={product.available}
        className="w-full"
      />
    </div>
  );
}
