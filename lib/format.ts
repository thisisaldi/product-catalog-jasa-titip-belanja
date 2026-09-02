const idr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
});

export function formatPrice(amount: number): string {
  return idr.format(amount);
}
