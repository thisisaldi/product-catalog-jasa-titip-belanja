/**
 * Small hand-drawn icon set matching the design spec's Phosphor Icons choice
 * (1.5 stroke weight, 03-design-specification.md Section 3) without pulling
 * in the full icon package for the handful of glyphs this demo needs.
 */
type IconProps = { className?: string };

export function BagIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className} aria-hidden="true">
      <path d="M6 8h12l-1 12H7L6 8Z" strokeLinejoin="round" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}

export function SlidersIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className} aria-hidden="true">
      <path d="M4 6h10M18 6h2M4 12h2M8 12h12M4 18h14M22 18h-2" strokeLinecap="round" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="6" cy="12" r="2" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className} aria-hidden="true">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PackageIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className} aria-hidden="true">
      <path d="M3 8l9-5 9 5-9 5-9-5z" strokeLinejoin="round" />
      <path d="M3 8v8l9 5 9-5V8" strokeLinejoin="round" />
      <path d="M12 13v8" />
    </svg>
  );
}

export function ImageIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className} aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M3 17l5-5 4 4 3-3 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WhatsAppIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2a9.87 9.87 0 0 0-8.5 14.86L2 22l5.3-1.5A9.87 9.87 0 1 0 12.04 2Zm0 1.8a8.06 8.06 0 0 1 6.99 12.1l-.24.4.9 3.28-3.35-.9-.4.23a8.06 8.06 0 1 1-3.9-15.1Zm-3.4 4.4c-.2 0-.5 0-.7.3-.2.28-.9.85-.9 2.07 0 1.22.9 2.4 1.03 2.57.13.16 1.8 2.86 4.4 3.9 2.16.86 2.6.7 3.07.65.47-.04 1.5-.6 1.72-1.2.22-.6.22-1.1.15-1.2-.06-.1-.23-.16-.47-.28-.25-.13-1.5-.75-1.73-.83-.23-.08-.4-.13-.57.13-.16.25-.65.83-.8 1-.15.16-.3.18-.55.06-.25-.13-1.06-.4-2.02-1.26-.75-.66-1.25-1.48-1.4-1.73-.15-.25-.02-.38.11-.5.11-.12.25-.3.38-.46.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.44-.06-.13-.57-1.42-.8-1.94-.2-.5-.42-.44-.57-.44Z" />
    </svg>
  );
}
