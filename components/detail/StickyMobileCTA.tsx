import { WhatsAppCTA } from "./WhatsAppCTA";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
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
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_16px_rgba(42,38,34,0.06)] backdrop-blur-sm lg:hidden">
      <div className="flex items-center gap-2.5">
        {product.available && (
          <AddToCartButton
            product={product}
            iconOnly
            className="!h-12 !w-12 !rounded-full border border-accent !bg-accent-soft !text-accent shadow-none hover:!bg-accent hover:!text-white"
          />
        )}
        <WhatsAppCTA
          phoneNumber={settings.whatsappNumber}
          orderMessageTemplate={settings.orderMessageTemplate}
          availabilityMessageTemplate={settings.availabilityMessageTemplate}
          product={{ brand: product.brand.name, name: product.name, price: product.price }}
          available={product.available}
          className="flex-1 text-sm font-medium"
        />
      </div>
    </div>
  );
}
