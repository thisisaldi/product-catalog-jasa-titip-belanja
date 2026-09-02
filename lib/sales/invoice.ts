import { resolveTemplate } from "@/lib/whatsapp/build-link";
import { formatPrice } from "@/lib/format";
import type { SaleDetail } from "@/lib/admin/types";

/**
 * Builds invoice text from the PERSISTED sale/sale_items — never from
 * independently-tracked cart/order state (Milestone 3's core invariant).
 * Placeholders match settings.invoice_message_template exactly
 * (05-database-design.md Section 7.2): {invoice_number}, {customer_name},
 * {item_list}, {subtotal}, {shipping_cost}, {other_cost}, {total}.
 * {shipping_cost}/{other_cost} resolve to empty — no schema field exists for
 * either, matching the documented decision. {total} equals {subtotal} for
 * v1 since there is no separate stored total distinct from summed line items.
 */
export function buildInvoiceText(sale: SaleDetail, template: string): string {
  const itemList = sale.items
    .map(
      (item) =>
        `${item.quantity} x ${item.productName} @ ${formatPrice(item.unitPrice)} = ${formatPrice(item.subtotal)}`,
    )
    .join("\n");

  return resolveTemplate(template, {
    invoice_number: sale.invoiceNumber,
    customer_name: sale.customerName ?? "",
    item_list: itemList,
    subtotal: formatPrice(sale.total),
    shipping_cost: "",
    other_cost: "",
    total: formatPrice(sale.total),
  });
}
