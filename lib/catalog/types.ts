export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type Brand = {
  id: string;
  name: string;
  slug: string;
};

export type ProductImage = {
  url: string;
  altText: string | null;
  isPrimary: boolean;
};

/** Shape mirrors the products_public view (04-system-design.md Section 8.1). */
export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: Brand;
  category: Category;
  price: number;
  description: string | null;
  images: ProductImage[];
  available: boolean;
};

export type Settings = {
  whatsappNumber: string;
  orderMessageTemplate: string;
  availabilityMessageTemplate: string;
  invoiceMessageTemplate: string;
};

export type Availability = "all" | "available" | "sold-out";

export type Cursor = {
  createdAt: string;
  id: string;
};
