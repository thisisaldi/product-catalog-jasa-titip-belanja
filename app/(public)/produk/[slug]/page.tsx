import { notFound } from "next/navigation";
import { getProductBySlug, getPublicSettings } from "@/lib/catalog/queries";
import { formatPrice } from "@/lib/format";
import { ProductGallery } from "@/components/detail/ProductGallery";
import { AvailabilityBadge } from "@/components/catalog/AvailabilityBadge";
import { WhatsAppCTA } from "@/components/detail/WhatsAppCTA";
import { StickyMobileCTA } from "@/components/detail/StickyMobileCTA";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getProductBySlug(slug), getPublicSettings()]);

  if (!product || !settings) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 sm:py-12 lg:px-8 lg:pb-12">
      <div className="lg:grid lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-7">
          <ProductGallery
            images={product.images}
            productName={product.name}
            seedPrefix={product.id}
          />
        </div>

        <div className="mt-6 lg:col-span-5 lg:mt-0">
          <div className="lg:sticky lg:top-24">
            <span className="text-sm font-medium uppercase tracking-wide text-text-secondary">
              {product.brand.name}
            </span>
            <h1 className="mt-1 text-lg font-medium leading-snug text-text-primary md:text-xl">
              {product.name}
            </h1>
            <p className="mt-2 text-xl font-semibold text-text-primary">
              {formatPrice(product.price)}
            </p>
            <div className="mt-2">
              <AvailabilityBadge available={product.available} size="base" />
            </div>

            {product.description && (
              <div className="mt-6 border-t border-border pt-6">
                <p className="max-w-[65ch] text-base leading-relaxed text-text-secondary">
                  {product.description}
                </p>
              </div>
            )}

            <div className="mt-6">
              <WhatsAppCTA
                phoneNumber={settings.whatsappNumber}
                orderMessageTemplate={settings.orderMessageTemplate}
                availabilityMessageTemplate={settings.availabilityMessageTemplate}
                product={{ brand: product.brand.name, name: product.name, price: product.price }}
                available={product.available}
                className="w-full lg:w-auto"
              />
            </div>
          </div>
        </div>
      </div>

      <StickyMobileCTA settings={settings} product={product} />
    </div>
  );
}
