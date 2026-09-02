import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { CartProvider } from "@/lib/cart/CartContext";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { getPublicSettings } from "@/lib/catalog/queries";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getPublicSettings();
  // Falls back to an empty number only if the settings singleton is somehow
  // missing (should not happen once seeded, 05-database-design.md Section 15)
  // — the WhatsApp link builder degrades to a non-functional wa.me link
  // rather than crashing every public page.
  const whatsappNumber = settings?.whatsappNumber ?? "";

  return (
    <CartProvider>
      <Header whatsappNumber={whatsappNumber} />
      <main className="flex-1">{children}</main>
      <Footer whatsappNumber={whatsappNumber} />
      <CartDrawer />
    </CartProvider>
  );
}
