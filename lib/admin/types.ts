export type Status = "ACTIVE" | "INACTIVE";

export type AdminTaxonomy = {
  id: string;
  name: string;
  slug: string;
  status: Status;
  createdAt: string;
};

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  status: Status;
  isManuallyUnavailable: boolean;
  cachedStock: number;
  createdAt: string;
  updatedAt: string;
  brand: { id: string; name: string; slug: string };
  category: { id: string; name: string; slug: string };
};

export type AdminProductImage = {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

export type InventoryTransaction = {
  id: string;
  productId: string;
  type: "IN" | "OUT";
  quantity: number;
  note: string | null;
  createdAt: string;
};

export type AdminSettings = {
  whatsappNumber: string;
  orderMessageTemplate: string;
  availabilityMessageTemplate: string;
  invoiceMessageTemplate: string;
  updatedAt: string;
};

export type PaymentStatus = "PENDING" | "PAID";
export type SaleStatus = "CONFIRMED" | "CANCELLED";

export type SellableProduct = {
  id: string;
  name: string;
  price: number;
  cachedStock: number;
  primaryImageUrl: string | null;
};

export type SaleListItem = {
  id: string;
  invoiceNumber: string;
  customerName: string | null;
  createdAt: string;
  total: number;
  paymentStatus: PaymentStatus;
  saleStatus: SaleStatus;
};

export type SaleLineItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type SaleDetail = {
  id: string;
  invoiceNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  note: string | null;
  paymentStatus: PaymentStatus;
  paidAt: string | null;
  paidBy: string | null;
  saleStatus: SaleStatus;
  cancelledAt: string | null;
  cancelledBy: string | null;
  createdBy: string;
  createdAt: string;
  items: SaleLineItem[];
  total: number;
};
