import { notFound } from "next/navigation";
import { getProductBySlug, getPublicSettings } from "@/lib/catalog/queries";
import { formatPrice } from "@/lib/format";
import { ProductGallery } from "@/components/detail/ProductGallery";
import { AvailabilityBadge } from "@/components/catalog/AvailabilityBadge";
import { WhatsAppCTA } from "@/components/detail/WhatsAppCTA";
import { StickyMobileCTA } from "@/components/detail/StickyMobileCTA";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { Container } from "@/components/shared/Container";

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
    <Container className="py-10 pb-32 sm:py-14 lg:pb-16">
      <div className="lg:grid lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7">
          <ProductGallery
            images={product.images}
            productName={product.name}
            seedPrefix={product.id}
          />
        </div>

        <div className="mt-8 lg:col-span-5 lg:mt-0">
          <div className="lg:sticky lg:top-28">
            <span className="text-sm font-medium uppercase tracking-wider text-text-secondary">
              {product.brand.name}
            </span>
            <h1 className="mt-2 text-lg font-medium leading-snug text-text-primary">
              {product.name}
            </h1>
            <p className="mt-3 text-xl font-semibold text-text-primary">
              {formatPrice(product.price)}
            </p>
            <div className="mt-3">
              <AvailabilityBadge available={product.available} size="base" />
            </div>

            {product.description && (
              <div className="mt-7 border-t border-border pt-7">
                <p className="max-w-[65ch] text-base leading-relaxed text-text-secondary">
                  {product.description}
                </p>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3">
              {product.available && (
                <AddToCartButton
                  product={product}
                  className="w-full rounded-full border border-accent px-6 py-3.5 text-base font-medium text-accent hover:bg-accent-soft lg:w-auto"
                />
              )}
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
    </Container>
  );
}
