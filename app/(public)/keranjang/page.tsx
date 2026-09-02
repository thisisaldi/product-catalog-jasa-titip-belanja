import { Container } from "@/components/shared/Container";
import { CartPageContent } from "@/components/cart/CartPageContent";

export default function CartPage() {
  return (
    <Container className="py-10 sm:py-14">
      <CartPageContent />
    </Container>
  );
}
