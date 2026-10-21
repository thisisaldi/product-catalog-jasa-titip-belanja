import type { Product } from "@/lib/catalog/types";
import { ProductCard } from "./ProductCard";

export function ProductGrid({
  products,
  animateFrom = Infinity,
}: {
  products: Product[];
  animateFrom?: number;
}) {
  return (
    <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4 lg:gap-6">
      {products.map((product, i) => (
        <li
          key={product.id}
          className={i >= animateFrom ? "[animation:fade-in_0.3s_ease-out]" : undefined}
        >
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
