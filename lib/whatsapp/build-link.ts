/**
 * Shared wa.me deep-link builder — the only mechanism the system integrates
 * with WhatsApp through (06-security.md Section 8). Never an API call.
 */
export function resolveTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? vars[key] : match,
  );
}

export function buildWhatsAppLink(phoneNumber: string, message: string): string {
  const digits = phoneNumber.replace(/[^0-9]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
