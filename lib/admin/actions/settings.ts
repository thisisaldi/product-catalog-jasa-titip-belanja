"use server";

import { revalidatePath } from "next/cache";
import { requireAdminTokenId } from "@/lib/auth/guard";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "./taxonomy";

const E164_PATTERN = /^\+[1-9]\d{6,14}$/;

const ALLOWED_PLACEHOLDERS: Record<string, string[]> = {
  order_message_template: ["brand", "product_name", "price", "qty"],
  availability_message_template: ["brand", "product_name"],
  invoice_message_template: [
    "invoice_number",
    "customer_name",
    "item_list",
    "subtotal",
    "shipping_cost",
    "other_cost",
    "total",
  ],
};

/**
 * 06-security.md Section 10: unrecognized {placeholder} tokens in an
 * admin-edited template are rejected at save time, never passed through
 * blindly.
 */
function findUnknownPlaceholders(template: string, field: keyof typeof ALLOWED_PLACEHOLDERS): string[] {
  const allowed = new Set(ALLOWED_PLACEHOLDERS[field]);
  const found = [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  return [...new Set(found.filter((token) => !allowed.has(token)))];
}

export async function updateSettings(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const tokenId = await requireAdminTokenId();

  const whatsappNumber = String(formData.get("whatsappNumber") ?? "").trim();
  const orderMessageTemplate = String(formData.get("orderMessageTemplate") ?? "").trim();
  const availabilityMessageTemplate = String(formData.get("availabilityMessageTemplate") ?? "").trim();
  const invoiceMessageTemplate = String(formData.get("invoiceMessageTemplate") ?? "").trim();

  if (!E164_PATTERN.test(whatsappNumber)) {
    return { error: "Nomor WhatsApp harus format E.164, contoh: +6281234567890." };
  }
  if (!orderMessageTemplate) return { error: "Template pesan pemesanan wajib diisi." };
  if (!availabilityMessageTemplate) return { error: "Template pesan ketersediaan wajib diisi." };
  if (!invoiceMessageTemplate) return { error: "Template invoice wajib diisi." };

  for (const [field, template] of [
    ["order_message_template", orderMessageTemplate],
    ["availability_message_template", availabilityMessageTemplate],
    ["invoice_message_template", invoiceMessageTemplate],
  ] as const) {
    const unknown = findUnknownPlaceholders(template, field);
    if (unknown.length > 0) {
      return { error: `Placeholder tidak dikenal: ${unknown.map((p) => `{${p}}`).join(", ")}` };
    }
  }

  const supabase = createServiceRoleSupabaseClient();
  const { error } = await supabase
    .from("settings")
    .update({
      whatsapp_number: whatsappNumber,
      order_message_template: orderMessageTemplate,
      availability_message_template: availabilityMessageTemplate,
      invoice_message_template: invoiceMessageTemplate,
      updated_by: tokenId,
    })
    .eq("id", 1);
  if (error) return { error: "Gagal menyimpan pengaturan. Coba lagi." };

  revalidatePath("/admin/pengaturan");
  revalidatePath("/", "layout");
  return { success: true };
}
