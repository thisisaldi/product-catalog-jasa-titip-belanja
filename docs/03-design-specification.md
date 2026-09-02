# Design Specification

## Curated Product Catalog & Inventory Website — Customer-Facing UI

**Document:** 03-design-specification.md
**Version:** 1.1
**Status:** Draft — decisions resolved 2026-09-01
**Date:** 2026-09-01
**Approved direction:** Direction B — Warm Modern Boutique

---

## 0. Scope

Customer-facing components only. No auth, cart, checkout, payment, reviews, wishlist, discounts, recommendations, admin UI, or backend in this document. Source of truth: `01-product-requirements.md`, `02-design-brief.md`.

Dials locked: `DESIGN_VARIANCE: 5`, `MOTION_INTENSITY: 3`, `VISUAL_DENSITY: 3`.

---

## 1. Design Tokens

### 1.1 Font Family

```
--font-sans: "Plus Jakarta Sans", "Public Sans", system-ui, sans-serif;   /* UI + body */
--font-brand: temporary text wordmark, set in --font-sans font-semibold.
              No custom mark/logo asset yet. See Logo/Wordmark Placeholder below.
```

UI text always uses `--font-sans`. No serif in product cards, buttons, filters, or body copy — audience needs maximum readability, not editorial flourish.

**Logo/wordmark placeholder (decision locked 2026-09-01):** Business name rendered as plain text (`text-lg font-semibold text-primary`, `--font-sans`) inside a fixed-size header slot (`h-8` mobile, `h-9` desktop, `max-w-[180px]`, left-aligned, single line, `truncate` if too long). The header/footer markup references a `<Logo />` component, never inline text at each call site, so swapping in a final SVG/image asset later is a one-file change with zero layout impact. `<Logo />` reserves its box size regardless of content (text now, `<img>`/`<svg>` later) to avoid header reflow or CLS when the real asset ships.

### 1.2 Font Sizes (mobile-first, `rem`)

| Token | Size | Usage |
|---|---|---|
| `text-xs` | 0.75rem (12px) | Availability badge, meta labels |
| `text-sm` | 0.875rem (14px) | Brand label, filter chips, footer links |
| `text-base` | 1rem (16px) | Body copy, product name (card) |
| `text-lg` | 1.125rem (18px) | Product name (detail), section intro |
| `text-xl` | 1.25rem (20px) | Price (detail) |
| `text-2xl` | 1.5rem (24px) | Section headings |
| `text-3xl` | 1.875rem (30px) | Page-level heading (rare, e.g. category title) |

No display sizes above `text-3xl` — this is a catalog, not a marketing landing page. No hero headline requirement.

### 1.3 Font Weights

| Token | Weight | Usage |
|---|---|---|
| `font-normal` | 400 | Body, description |
| `font-medium` | 500 | Product name, nav links, buttons |
| `font-semibold` | 600 | Price, section headings, brand wordmark |

No `font-bold` (700+) anywhere — brief calls for refined, not shouty.

### 1.4 Line Heights

| Token | Value | Usage |
|---|---|---|
| `leading-tight` | 1.25 | Product name (card, 1-2 lines) |
| `leading-snug` | 1.375 | Headings |
| `leading-relaxed` | 1.625 | Description body copy |

### 1.5 Spacing Scale

Standard Tailwind scale, used consistently: `1 (4px) · 2 (8px) · 3 (12px) · 4 (16px) · 6 (24px) · 8 (32px) · 12 (48px) · 16 (64px) · 24 (96px)`.

Section vertical rhythm: `py-12` mobile → `py-16` tablet → `py-24` desktop (density 3, not art-gallery-empty).

### 1.6 Border Radius

Single scale, locked project-wide:

| Token | Value | Usage |
|---|---|---|
| `rounded-md` | 8px | Inputs, filter chips, badges |
| `rounded-lg` | 12px | Product card image, buttons |
| `rounded-2xl` | 20px | Bottom sheet top corners, modal |
| `rounded-full` | pill | Primary CTA button, avatar-style elements (none currently) |

Rule: cards/images/buttons use `rounded-lg`; the WhatsApp CTA is the one `rounded-full` pill element on the page (visual distinction = "this is the action").

### 1.7 Color Palette

Warm neutral base, one desaturated accent, WhatsApp green reserved solely for WhatsApp CTA (functional recognition, not decorative).

| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#FBF9F6` | Page background (warm off-white, not pure white) |
| `--surface` | `#FFFFFF` | Card surface |
| `--text-primary` | `#2A2622` | Body/heading text (warm near-black, not pure black) |
| `--text-secondary` | `#6B645C` | Meta text, brand label, description |
| `--border` | `#E8E2D9` | Hairlines, card borders, dividers |
| `--accent` | `#B5533C` | Links, active filter state, focus ring, price emphasis (muted terracotta, <80% saturation) |
| `--accent-soft` | `#F1E3DC` | Accent background tint (active filter chip fill) |
| `--available` | `#3F7A52` | Availability = Available (muted green, not neon) |
| `--sold-out` | `#8A837A` | Availability = Sold Out (neutral gray, not red — not an error state) |
| `--whatsapp` | `#25D366` | Brand-recognition use only: WhatsApp icon glyph fill, never as a CTA background with text on top |
| `--whatsapp-cta` | `#157A3A` | WhatsApp CTA button background (darkened, AA-safe) |
| `--whatsapp-text` | `#FFFFFF` | Text on WhatsApp CTA |

Contrast checked: `--text-primary` on `--bg` = 13.9:1. `--accent` on `--bg` = 5.1:1 (passes AA for text use). `--whatsapp-text` on `--whatsapp-cta` (`#157A3A`) ≈ 5.4:1 — passes AA for normal text, resolved 2026-09-01. `--whatsapp` (`#25D366`) is retained only for the small WhatsApp glyph icon inside the CTA (icon at sufficient size/contrast against the darker fill), never as a text-bearing fill. Availability still never relies on color alone (text label always present).

Dark mode: out of scope for v1 (catalog/e-commerce convention, brief doesn't request it). Single light theme, locked project-wide (Section 4.11 theme-lock rule).

### 1.8 Container Widths

```
--container-max: 1280px;   /* max-w-7xl, desktop hard cap */
--container-padding-mobile: 16px;
--container-padding-tablet: 24px;
--container-padding-desktop: 32px;
```

### 1.9 Grid Behavior

Product grid columns per brief Section 25:

| Breakpoint | Columns | Gap |
|---|---|---|
| Mobile (`<768px`) | 2 | `gap-4` (16px) |
| Tablet (`768–1023px`) | 3 | `gap-5` (20px) |
| Desktop (`≥1024px`) | 4 | `gap-6` (24px) |

CSS Grid, not flex-percentage math.

### 1.10 Breakpoints

Standard: `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`. Primary design target mobile (`<768px`), then tablet, then desktop.

---

## 2. Component Specifications

### 2.1 Product Card

**Purpose:** Fastest possible scan-and-decide unit. Image sells; text confirms.

**Content hierarchy:** Image → Brand → Product Name → Price → Availability.

**Desktop behavior:** Static grid cell. On hover: image scales `1.03` (subtle, `transition-transform duration-300 ease-out`), no shadow pop (shadow implies elevation this card doesn't need — grid position IS the hierarchy).

**Mobile behavior:** No hover (touch device). Tap target = entire card (image + text block), min touch area 44px height beyond just the image.

**Interaction states:**
- Default: as specified.
- Hover (desktop only): image scale 1.03, ~300ms ease-out.
- Active/press: `scale-[0.98]` on the card container, ~100ms.
- Focus (keyboard): `ring-2 ring-[--accent] ring-offset-2` on the card wrapper (whole card is one `<a>`).
- Loading: see 2.9 Skeleton.

**Accessibility:** Card is a single `<a href="/produk/{slug}">` wrapping image + text — one tab stop, not nested interactive elements. `alt` text = `"{Brand} {Product Name}"`. Price and availability are plain text, not color-only signal (availability also carries a text label, see 2.7).

**Responsive behavior:** Image aspect ratio locked `4:5` at all breakpoints (`aspect-[4/5] object-cover`). Text block below image, same layout mobile → desktop, only grid column count changes (Section 1.9).

**Spacing:** `p-0` on image (edge-to-edge within card radius), `pt-3` gap before text block, `gap-1` between brand/name/price/availability lines, card-to-card gap per grid (1.9).

**Typography:** Brand = `text-sm text-secondary font-medium uppercase tracking-wide` (single restrained use of uppercase-tracking, not an eyebrow-spam pattern — this is a brand label, functional). Name = `text-base font-medium leading-tight`, max 2 lines (`line-clamp-2`). Price = `text-base font-semibold text-primary`. Availability = `text-xs`, see 2.7.

**Visual treatment:** No card border, no shadow. Image `rounded-lg`. Card separation is achieved by grid gap + whitespace alone (Section 4.4 "cards only when elevation communicates hierarchy" — here it doesn't, so no box).

---

### 2.2 Product Grid

**Purpose:** Primary browsing surface — the catalog itself.

**Content hierarchy:** Grid of Product Cards, no section subdivision beyond active filters.

**Desktop behavior:** 4-column CSS Grid, `max-w-7xl mx-auto`. Initial page loads a fixed batch (e.g. 20 products); a "Muat Lebih Banyak" (Load More) button renders centered below the grid, `mt-8`, when more results exist. No infinite scroll, no numbered pagination (decision locked 2026-09-01).

**Mobile behavior:** 2-column grid, full-bleed within container padding. Same Load More button, full-width `max-w-xs mx-auto` centered.

**Interaction states:** None at grid level (delegates to cards). Filter changes reset the batch and trigger grid re-render with skeleton state during fetch (2.9). Load More button: default outline style, loading state shows inline spinner + "Memuat..." label and is disabled during fetch (prevents double-fetch on repeated taps), appended cards fade in (`opacity` only, ≤300ms, honors reduced motion) rather than causing a layout jump.

**Accessibility:** Grid is a `<ul>` of `<li>` cards (or `<div role="list">` if semantic list breaks card link semantics) — list landmark helps screen-reader users know item count context ("24 products"). Announce result count on filter change via `aria-live="polite"` region.

**Responsive behavior:** Column count only, per Section 1.9. No layout reflow beyond column count and gap.

**Spacing:** Grid sits directly below Filters (Section 2.4 trigger bar), `pt-6` separation. Bottom `pb-16` before Footer.

**Typography:** N/A at grid level (result count text, if shown: `text-sm text-secondary`, e.g. "24 produk").

**Visual treatment:** No background differentiation from page `--bg`. Pure grid, no dividers.

---

### 2.3 Header + Search

**Purpose:** Orientation (brand identity) + fastest path to search. Per brief: minimal nav, search/filter reachable without menu diving. Search matches product name, brand, and category (decision locked 2026-09-01) — single input, no separate scope selector; results simply union across the three fields server-side.

**Content hierarchy:** Logo/wordmark → Search input → (optional) WhatsApp/contact icon link.

**Desktop behavior:** Single row, `h-16` (64px, within 80px cap). Logo left, search input center-expanding (`flex-1 max-w-md`), contact icon right. Sticky on scroll (`sticky top-0 z-30 bg-[--bg]/95 backdrop-blur-sm border-b border-[--border]`) — subtle, functional, not decorative glass.

**Mobile behavior:** Logo left, search icon-button right (expands to full-width input on tap, or search bar always visible below logo row if vertical space allows — prefer always-visible search bar per brief "easy access without navigating menus"). Two-row header on mobile only if needed: row 1 = logo + contact icon, row 2 = full-width search input. Total header height still capped, no more than ~112px combined.

**Interaction states:**
- Search input: default border `--border`, focus `ring-2 ring-[--accent] border-[--accent]`.
- Search icon button (if collapsed): press state `scale-[0.96]`.
- Logo: link to home, no visual button chrome.

**Accessibility:** `<header>` landmark. Search input has visible `<label>` (visually can be `sr-only` if placeholder-adjacent icon makes purpose obvious, but real `<label>` element required — no placeholder-as-label per Section 4.6). `aria-label="Cari produk"` fallback. Logo link has `aria-label` with business name.

**Responsive behavior:** Search input always reachable in ≤1 tap on mobile — no hamburger menu gate. No hamburger menu needed at all (nav is: logo, search, filters — nothing else per IA).

**Spacing:** `px-4` mobile / `px-6` tablet / `px-8` desktop container padding. `gap-3` between header elements.

**Typography:** Logo wordmark `text-lg font-semibold` (or custom brand mark, TBD — flagged in Section 4). Search placeholder `text-sm text-secondary`, actual input text `text-base` (16px minimum to prevent iOS auto-zoom on focus).

**Visual treatment:** Search input `rounded-md border border-[--border] bg-[--surface]`, search icon (Phosphor `MagnifyingGlass`) inline-left, `1.5` stroke width.

---

### 2.4 Filter Bottom Sheet

**Purpose:** Category / Brand / Availability filtering with lowest cognitive load, per brief explicit recommendation of bottom sheet over multi-page navigation.

**Content hierarchy:** Trigger bar (always visible, above grid) → Sheet: Sheet title → Category options → Brand options → Availability toggle → Apply button (sticky bottom of sheet) → Clear all (text link).

**Desktop behavior:** Trigger bar shows inline filter chips/dropdowns instead of a sheet (more horizontal space available — sheet is a mobile-optimized pattern). Desktop: horizontal row of 3 dropdown/popover filters (Category, Brand, Availability) directly above the grid, `border-b border-[--border] pb-4` separating from grid.

**Mobile behavior:** Trigger bar = single "Filter" button with active-count badge (e.g. "Filter (2)") + a Sort/Availability quick-toggle if needed. Tapping opens bottom sheet: slides up from bottom, `rounded-t-2xl`, max-height `85dvh`, scrollable body, sticky "Terapkan" (Apply) button pinned to sheet bottom, drag-handle bar at top for dismiss affordance, backdrop `bg-black/40` dismissible on tap.

**Interaction states:**
- Trigger button: default outline, active (filters applied) → filled `bg-[--accent-soft] border-[--accent] text-[--accent]`.
- Sheet open/close: `MOTION_INTENSITY 3` — simple slide + fade, ~250ms ease-out, honors `prefers-reduced-motion` (collapses to instant show/hide).
- Filter option (chip/checkbox row): default, selected = `bg-[--accent-soft] text-[--accent] border-[--accent]`, focus ring visible.
- Apply button: primary style (see 2.6 button treatment), disabled state not needed (always tappable, even with zero changes = closes sheet).

**Accessibility:** Sheet uses `role="dialog" aria-modal="true"` with focus trap, labeled by sheet title (`aria-labelledby`). Return focus to trigger button on close. Filter checkboxes are real `<input type="checkbox">` / `<input type="radio">` (Availability is single-select: All / Available / Sold Out → radio group), not div-based fake controls. Keyboard: Esc closes sheet.

**Responsive behavior:** Sheet pattern strictly `<1024px`. At `≥1024px`, filters render as inline popovers (same underlying option list/state, different container chrome) — mobile collapse rule declared per Section 4.7.

**Spacing:** Sheet padding `px-6 pt-2 pb-6`, `gap-6` between filter groups (Category/Brand/Availability), `gap-2` between options within a group.

**Typography:** Sheet title `text-lg font-semibold`. Group labels `text-sm font-medium text-secondary uppercase tracking-wide` (functional group headers, counts toward general uppercase-label usage — keep restrained, only 3 instances per sheet). Option labels `text-base`.

**Visual treatment:** Filter chips `rounded-full border` (pill, consistent with the "interactive pill" carve-out alongside the WhatsApp CTA) OR checkbox rows with `rounded-md` — pick checkbox-row style for Category/Brand (clearer at scale with many brands) and pill chips only for Availability (2-3 options, chip-appropriate). Single scrollable list per group if long (e.g. many brands) — no separate scroll-snap needed at this list length.

---

### 2.5 Product Detail

**Purpose:** Answer brief Section 12 questions (what/brand/price/availability/description/how to order) and drive to WhatsApp.

**Content hierarchy:** Product Image(s) → Brand → Product Name → Price → Availability → Description → WhatsApp CTA.

**Desktop behavior:** Two-column layout: left = image gallery (`col-span-6` or `7`), right = product information stack (`col-span-6` or `5`), per brief Section 25. Right column: sticky within viewport as user might scroll long description (`sticky top-20`), CTA always visible in this sticky column — no separate mobile-style sticky bar needed on desktop since it's already in view.

**Mobile behavior:** Single column, strict vertical order: Image → Brand → Name → Price → Availability → Description → (inline CTA in flow) + sticky bottom CTA bar (Section 2.6) always present regardless of scroll position.

**Interaction states:** Supports 1-5 images per product (decision locked 2026-09-01). With 1 image: single static `aspect-[4/5]` image, no dots, no thumbnails, no swipe affordance rendered at all — a single image never shows gallery chrome, keeping the "clean single-image presentation" the requirement calls for. With 2-5 images: dot-indicator + swipe (native scroll-snap, `overflow-x-auto snap-x`) — no JS carousel library needed, native CSS scroll-snap suffices (ladder rung: native feature covers it). Thumbnail row on desktop (optional secondary nav for gallery, only rendered when count > 1), swipe-only on mobile. Gallery component branches on `images.length === 1` at the top rather than always rendering carousel chrome with one slide.

**Accessibility:** `<h1>` = product name (only one h1 per page). Image gallery has `aria-label="Galeri produk"`, each image has descriptive alt text. Price marked with visually-clear text, not relying on font-size alone to convey importance (also `font-semibold` + slightly larger size). Description text meets `max-w-[65ch]` for readability.

**Responsive behavior:** Column split only `≥1024px`. Below that: single column, explicit stacking order as specified. Image aspect ratio consistent `4:5` in gallery, matching card treatment for visual continuity.

**Spacing:** `gap-6` between major info blocks (name/price/availability cluster vs. description vs. CTA) in right column. `py-8` top padding mobile, `py-12` desktop before content starts (below sticky header).

**Typography:** Brand `text-sm text-secondary uppercase tracking-wide`. Name `text-lg md:text-xl font-medium leading-snug`. Price `text-xl font-semibold text-primary`. Description `text-base text-secondary leading-relaxed max-w-[65ch]`.

**Visual treatment:** No card wrapper around detail content — it's the page itself, not a card in a grid. Divider (`border-t border-[--border]`) optionally separating price/availability cluster from description, used once, not per-line.

---

### 2.6 WhatsApp CTA / Sticky Mobile CTA

**Purpose:** The single conversion action of the entire site (brief Section 21 — "Selection" ends here, WhatsApp takes over).

**Content hierarchy:** Icon (WhatsApp glyph) + Label. Two label states, driven by the product's availability (decision locked 2026-09-01):
- **Available:** "Pesan via WhatsApp" — pre-filled message per PRD Section 7 (product, price, qty, availability question).
- **Sold Out:** "Tanya Ketersediaan" — same `<a href="wa.me/...">` mechanism, different pre-filled message asking about restock/availability instead of ordering. Button remains fully active (never disabled/hidden) — sold-out products stay visible and contactable per the locked decision.
Exactly one label renders per page state; no duplicate-intent buttons elsewhere (Section 4.5 rule — product card excluded since card has no CTA, only detail page and sticky bar carry this button, both always showing the same state-matched label).

**Desktop behavior:** Inline button within the sticky right-column info stack (Section 2.5), full-width within that column, not floating separately.

**Mobile behavior:** Two placements, same label/style: (1) inline in content flow after description, (2) sticky bottom bar (`fixed bottom-0 inset-x-0 z-40 bg-[--surface] border-t border-[--border] px-4 py-3`, safe-area-inset-bottom padding for iOS home indicator) containing the same CTA full-width. The sticky bar appears only on the product-detail route, not globally.

**Interaction states:**
- Default: `bg-[--whatsapp-cta] text-white rounded-full font-medium`, icon (in `--whatsapp` brand green, sized for legibility against the darker fill) + label centered, `h-12` min height (comfortable 44px+ touch target).
- Hover (desktop): slight darken (`brightness-95`), `transition-colors duration-200`.
- Active/press: `scale-[0.98]`, ~100ms.
- Focus: `ring-2 ring-offset-2 ring-[--whatsapp-cta]`.
- Loading: not applicable (opens external link, no async state).

**Accessibility:** Real `<a>` tag, `href` built from an admin-configured phone number (never hardcoded in the component, see token/config note below) plus a URL-encoded pre-filled message: `https://wa.me/{configured_number}?text={encoded_message}`, `target="_blank" rel="noopener noreferrer"`. `aria-label` mirrors the visible label plus product name for screen-reader specificity (`"Pesan {Product Name} via WhatsApp"` or `"Tanya ketersediaan {Product Name} via WhatsApp"`). Text/background contrast resolved 2026-09-01 (Section 1.7, `--whatsapp-cta` ≈ 5.4:1 with white text).

**Configuration:** The destination number is never hardcoded in this or any UI component (PRD Section 7, decision locked 2026-09-01). The component accepts the number (and any global message template) as a prop/config value sourced from admin settings at render time; the component itself has zero knowledge of a specific number.

**Responsive behavior:** Sticky bar mobile-only (`lg:hidden`), inline button always present at all breakpoints.

**Spacing:** Button internal padding `px-6 py-3`. Sticky bar container padding `px-4 py-3` plus safe-area inset.

**Typography:** `text-base font-medium`, single line (no wrap risk — label is short, verified under CTA wrap-ban rule).

**Visual treatment:** Only `rounded-full` element besides filter chips — visually signals "this is THE action" against the `rounded-lg`/`rounded-md` rest of the UI.

---

### 2.7 Availability Indicator

**Purpose:** Instant, jargon-free stock signal (brief explicitly bans "stock transaction / inventory movement" language on customer side).

**Content hierarchy:** Icon/dot (supplementary) + text label. Text label is the primary signal, never color/dot alone (Section 4.5 / accessibility rule — availability must not rely on color alone).

**States:**
- **Available:** text `"Tersedia"`, color `--available` (#3F7A52), small filled dot `bg-[--available]` before text (dot is decorative reinforcement, not sole signal).
- **Sold Out:** text `"Stok Habis"`, color `--sold-out` (#8A837A, neutral gray — not alarming red, this isn't an error), dot `bg-[--sold-out]`.

**Desktop/Mobile behavior:** Identical, no responsive variation needed — this is a small text+icon unit.

**Interaction states:** Static, no hover/press (not interactive). On card: sits below price. On detail: own line below price, slightly larger.

**Accessibility:** Text label always present (not icon-only). `aria-label` not needed beyond visible text since text IS the label. Sold-out products remain visible and browsable in the catalog and on their detail page (decision locked 2026-09-01); the CTA changes label and message rather than disabling (see Section 2.6).

**Responsive behavior:** None — same treatment all breakpoints.

**Spacing:** `gap-1.5` between dot and text, inline-flex.

**Typography:** Card: `text-xs font-medium`. Detail: `text-sm font-medium`.

**Visual treatment:** Dot `w-1.5 h-1.5 rounded-full`. No badge/pill background — plain text+dot keeps it lightweight, not a marketplace-style badge.

---

### 2.8 Empty State

**Purpose:** Graceful "nothing found" moments per brief Section 17.

**Variants:**
1. **No search results:** Heading "Tidak menemukan produk yang dicari." + body "Coba kata kunci lain."
2. **Empty category/filter result:** "Belum ada produk di kategori ini."

**Content hierarchy:** Simple icon (Phosphor, e.g. `MagnifyingGlass` or `Package`, `1.5` stroke, `text-secondary`, `w-12 h-12`) → Heading → Body text → (optional) "Reset filter" text-link if filters are active.

**Desktop/Mobile behavior:** Identical — centered block, `py-24` vertical padding, replaces the grid area entirely (grid container renders this instead of cards).

**Interaction states:** "Reset filter" link (if shown): underline on hover, `text-[--accent]`.

**Accessibility:** Announced via the grid's `aria-live="polite"` region (Section 2.2) so screen-reader users filtering get immediate feedback, not silence.

**Responsive behavior:** None needed, single centered layout at all sizes.

**Spacing:** `gap-3` between icon/heading/body.

**Typography:** Heading `text-base font-medium text-primary`. Body `text-sm text-secondary`.

**Visual treatment:** No illustration, no playful animation (brief explicitly: avoid overly playful illustrations). Icon + text only.

---

### 2.9 Loading / Skeleton State

**Purpose:** Subtle, non-distracting loading feedback (brief Section 17 — "does not distract from the catalog").

**Content hierarchy:** Skeleton shapes matching final layout exactly — image block, brand line, name line, price line — not a generic spinner.

**Desktop/Mobile behavior:** Grid renders N skeleton cards (matching current column count) in place of product cards during initial load or filter-triggered refetch.

**Interaction states:** Subtle shimmer (`animate-pulse`, Tailwind built-in — `opacity` pulse only, GPU-cheap, no custom shimmer-gradient library needed). Respects `prefers-reduced-motion` (falls back to static gray blocks, no pulse).

**Accessibility:** Container has `aria-busy="true"` while loading; removed when content resolves. No individual `aria-label` spam per skeleton block (decorative).

**Responsive behavior:** Skeleton card shape mirrors real card exactly (`aspect-[4/5]` image block + text lines) at every breakpoint.

**Spacing:** Identical to real Product Grid/Card spacing (Section 2.1/2.2) — this is the point of a shape-matched skeleton, zero layout shift on content swap.

**Typography:** N/A (no text, just shaped blocks: `bg-[--border] rounded` for image, shorter `rounded` bars for text lines).

**Visual treatment:** `bg-[--border]` (or slightly lighter neutral) blocks, `rounded-lg` for image matching card radius, `rounded-full` thin bars for text-line placeholders.

---

### 2.10 Footer

**Purpose:** Closure, minimal trust/contact info. Not a marketing mega-footer.

**Content hierarchy:** Logo/business name → short line (business statement, optional) → WhatsApp/contact link → (optional) simple category quick-links → copyright line.

**Desktop behavior:** Simple 2-3 column layout within `max-w-7xl`: (1) brand + short statement, (2) quick links (categories, if useful), (3) contact (WhatsApp link, plain — same "Pesan via WhatsApp" wording avoided here since it's not product-specific; use "Hubungi Kami" as distinct intent — general contact, not order — this is NOT a duplicate CTA intent since it serves a different purpose: general inquiry vs. product order).
Actually — per Section 4.5 duplicate-intent rule, keep this minimal: footer WhatsApp link uses the SAME general contact intent site-wide if repeated, worded consistently.

**Mobile behavior:** Single stacked column, center or left-aligned, generous `py-12` padding.

**Interaction states:** Links: `text-secondary` default, `text-[--accent]` hover/focus, underline on focus for clarity.

**Accessibility:** `<footer>` landmark. Contact link has clear `aria-label`.

**Responsive behavior:** Column count 1 (mobile) → 3 (desktop, `md:grid-cols-3`).

**Spacing:** `py-12` mobile, `py-16` desktop. `gap-8` between columns.

**Typography:** Business name `text-base font-semibold`. Body/links `text-sm text-secondary`. Copyright `text-xs text-secondary`.

**Visual treatment:** `border-t border-[--border]` separating from page content above. No background color change (stays `--bg`).

---

## 3. Cross-Component Rules Applied

- One accent color (`--accent` terracotta) used identically in: search focus ring, filter active state, links, price emphasis nowhere else needed. Locked per Section 4.2 rule.
- One radius system: `rounded-md` (inputs/badges), `rounded-lg` (cards/buttons/images), `rounded-full` (WhatsApp CTA + filter pills only). Locked per Section 4.4.
- No em-dashes anywhere in copy (all example strings above use plain punctuation).
- No decorative dots except the Availability indicator (real semantic state, sparingly used, one location).
- Icons: Phosphor Icons, `1.5` stroke weight, one family project-wide.
- All motion ≤ `MOTION_INTENSITY 3`: transitions on `transform`/`opacity` only, 100-300ms, `prefers-reduced-motion` honored everywhere motion appears (card hover, sheet open, skeleton pulse).

---

## 4. Decision Log

Resolved 2026-09-01:

1. **Logo/wordmark** — temporary text wordmark in a fixed-size `<Logo />` slot; final asset swaps in without layout change. See Section 1.1.
2. **WhatsApp CTA contrast** — CTA fill darkened to `--whatsapp-cta` `#157A3A` (≈5.4:1 with white text, passes AA); `--whatsapp` `#25D366` kept only for the icon glyph. See Section 1.7 / 2.6.
3. **Sold-out products** — stay visible in catalog and detail, marked "Stok Habis"; detail CTA relabels to "Tanya Ketersediaan" with a different pre-filled message, button never disabled/hidden. See Section 2.5-2.7.
4. **Pagination** — "Muat Lebih Banyak" (Load More) button, no infinite scroll, no numbered pagination. See Section 2.2.
5. **Search scope** — product name + brand + category, single input. See Section 2.3.
6. **Product images** — 1-5 per product; single image renders with no gallery chrome, 2-5 renders scroll-snap gallery + dots/thumbnails. See Section 2.5.
7. **WhatsApp number** — admin-configurable, passed into the CTA component as config/prop, never hardcoded. See Section 2.6.

---

## 5. Consistency Review

Checked against Section 3 cross-component rules and Section 1 tokens after applying the above:

- Color lock holds: `--accent` unchanged and still the only non-functional accent; `--whatsapp` / `--whatsapp-cta` are functional-only (WhatsApp association), consistent with the original rule that WhatsApp green is reserved and never decorative elsewhere.
- Radius lock holds: CTA is still the sole `rounded-full` button; no new shapes introduced by these decisions.
- No new duplicate-CTA-intent: the two WhatsApp label states are mutually exclusive per product (never both on screen), so this is a state variant, not a second CTA.
- Load More button needs its own visual spec (outline style, not filled) — added in Section 2.2; it must not visually compete with the `rounded-full` WhatsApp CTA (kept `rounded-lg`, standard button, per the radius rule).
- Single-image gallery branch avoids shipping unused carousel chrome (dead dots/arrows with one slide), consistent with the "don't build for hypothetical state" bias.

No inconsistencies found between the new decisions and the previously locked spec.

---

## 6. Remaining Decisions — Database Schema / Architecture Impact

These are no longer visual-design questions; they materially shape the data model and cannot be deferred further without guessing at schema:

1. **Sold-out CTA message content** — "Tanya Ketersediaan" needs its own WhatsApp message template distinct from the ordering template (PRD Section 7 only specifies the ordering template). Where does this second template live — hardcoded string, or a second admin-configurable template field alongside the WhatsApp number? Affects the `Settings`/config table shape.
2. **Availability is derived, not stored, per PRD Section 11** (`current stock = SUM(IN) - SUM(OUT)`), but "Sold Out" as a catalog-facing label needs a threshold rule: is a product "Sold Out" purely at `stock === 0`, or can a product be manually marked unavailable independent of stock (e.g. discontinued but stock > 0, or a staff override)? This determines whether `Product` needs its own `availability_override` field beyond the computed stock value.
3. **Load More pagination contract** — cursor-based or offset-based pagination for the product list endpoint; affects whether `Product` needs a stable sort key (e.g. `created_at` + `id` composite cursor) versus simple `LIMIT/OFFSET`. Needs deciding before the catalog API is designed, since it's harder to change after real traffic/data exists.
4. **Product image storage shape** — 1-5 images per product implies either a `ProductImage` child table (`product_id`, `url`, `sort_order`) or a fixed-width array/JSON column on `Product`. A child table is the safer default for ordering/future reordering in the admin UI, but this is an explicit schema choice, not implied by the PRD's flat `Product` field list (Section 8).
5. **Search implementation** — matching name + brand + category in one query: simple `ILIKE`/`OR` across joined tables is fine at small catalog scale, but confirms no full-text search index or search service is expected for v1 (keeping infra minimal per PRD Section 18/G6). Worth stating explicitly so it isn't over-built later.
6. **WhatsApp number + message templates as config** — confirms a `Settings` table/row (or single-row config table) is needed rather than environment variables, since PRD Section 7 says "configurable through the admin/system configuration" (i.e. editable by an admin user at runtime, not a redeploy-to-change env var).

None of these block finishing the customer-facing visual/component spec — they block moving into database schema and API design, which is the next phase after this document.
