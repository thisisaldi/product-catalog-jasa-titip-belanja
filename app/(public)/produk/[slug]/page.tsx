import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug, getPublicSettings } from "@/lib/catalog/queries";
import { formatPrice } from "@/lib/format";
import { ProductGallery } from "@/components/detail/ProductGallery";
import { AvailabilityBadge } from "@/components/catalog/AvailabilityBadge";
import { WhatsAppCTA } from "@/components/detail/WhatsAppCTA";
import { StickyMobileCTA } from "@/components/detail/StickyMobileCTA";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { Container } from "@/components/shared/Container";
import Link from "next/link";
import { ArrowLeftIcon } from "@/components/shared/icons";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    return { title: "Produk Tidak Ditemukan" };
  }

  const thumbnail = product.images.find((img) => img.isPrimary) ?? product.images[0];
  const title = `${product.name} — ${product.brand.name}`;
  const description =
    product.description?.slice(0, 160) ||
    `Beli ${product.name} dari ${product.brand.name} di Katalog. Pesan mudah via WhatsApp.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: thumbnail ? [{ url: thumbnail.url }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: thumbnail ? [thumbnail.url] : [],
    },
  };
}

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
    <Container className="pt-4 pb-32 sm:pt-6 lg:pb-24">
      <Link
        href="/"
        className="-ml-2 inline-flex h-10 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-text-secondary transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Katalog
      </Link>
      <div className="mt-3 lg:mt-4 lg:grid lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7">
          <ProductGallery
            images={product.images}
            productName={product.name}
            seedPrefix={product.id}
          />
        </div>

        <div className="mt-8 lg:col-span-5 lg:mt-0">
          <div className="lg:sticky lg:top-24">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-text-secondary sm:text-sm">
              <span>{product.brand.name}</span>
              <span aria-hidden="true" className="text-text-secondary/50">•</span>
              <span>{product.category.name}</span>
            </div>
            <h1 className="mt-2 text-xl font-medium leading-snug tracking-tight text-text-primary sm:text-2xl">
              {product.name}
            </h1>
            <p className="mt-3 text-xl font-semibold tabular-nums text-text-primary">
              {formatPrice(product.price)}
            </p>
            <div className="mt-3">
              <AvailabilityBadge available={product.available} size="base" />
            </div>

            {product.description && (
              <div className="mt-7 border-t border-border pt-7">
                <p className="max-w-[65ch] whitespace-pre-line text-base leading-relaxed text-text-secondary">
                  {product.description}
                </p>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3">
              {product.available && (
                <AddToCartButton
                  product={product}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-accent px-6 text-base font-medium text-accent hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                />
              )}
              <WhatsAppCTA
                phoneNumber={settings.whatsappNumber}
                orderMessageTemplate={settings.orderMessageTemplate}
                availabilityMessageTemplate={settings.availabilityMessageTemplate}
                product={{ brand: product.brand.name, name: product.name, price: product.price }}
                available={product.available}
                className="w-full"
              />
            </div>

            <p className="mt-5 rounded-lg bg-surface-muted px-4 py-3 text-sm leading-relaxed text-text-secondary">
              {product.available
                ? "Pesan langsung lewat WhatsApp, atau kumpulkan beberapa produk di keranjang dulu. Pembayaran dikonfirmasi admin lewat WhatsApp."
                : "Stok sedang habis. Tanyakan ke admin lewat WhatsApp kapan produk ini tersedia lagi."}
            </p>
          </div>
        </div>
      </div>

      <StickyMobileCTA settings={settings} product={product} />
    </Container>
  );
}
