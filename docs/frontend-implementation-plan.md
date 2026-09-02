# Frontend Implementation Plan

## Curated Product Catalog & Inventory Website

**Document:** frontend-implementation-plan.md
**Version:** 1.0
**Status:** Planning artifact — no code, no migrations
**Date:** 2026-09-01
**Source of truth:** `01-product-requirements.md`, `02-design-brief.md`, `03-design-specification.md`, `04-system-design.md`, `05-database-design.md`, `CLAUDE.md`

This document translates the approved product/design/system specification into a frontend implementation plan. It does not implement code, does not create migrations, and does not modify `docs/01`–`06`. Every recommendation below is traceable to an existing document section; anything not traceable is listed in the final section as a decision required before implementation.

---

## 1. Route Architecture

### 1.1 Route split

Per `04-system-design.md` §7.1/7.4 (2026-09-04: moved off the separate `admin.{domain}` subdomain to a single-hostname obscure path), admin lives at `/x7k9m2/*` on the same hostname as the public site — not `/admin/*`, which no longer exists as a route. Two logical route trees, one hostname.

### 1.2 Public domain (`{domain}`)

| Route | Purpose |
|---|---|
| `/` | Catalog home — search, filters, product grid, Load More (`03` §2.2/2.3/2.4) |
| `/produk/[slug]` | Product detail (`03` §2.5) |

Category/brand/availability filtering and search are **not** separate routes. They are query-string state on `/` (`?q=&kategori=&merek=&ketersediaan=&cursor=`), matching the design brief's single catalog IA (`02` §8: `Catalog → Search / Category Filter / Brand Filter → Product Detail`, no category/brand landing pages defined anywhere in `01`–`03`). Query params are kept shareable/back-button-safe (`router.replace` on filter change) as a low-cost UX default, not a new requirement.

No route exists for account, wishlist, or reviews — explicitly excluded (`01` §17, `CLAUDE.md` §2). The cart is client-side state (localStorage, no dedicated DB table) rendered at a dedicated `/keranjang` route rather than a drawer/sheet, so adding an item never interrupts browsing (Milestone 5); order submission happens inline on that page via a Server Action, not a separate page (`01` §5.1a).

### 1.3 Admin path (`/x7k9m2/*`)

`/x7k9m2` is an obscure static path, not a subdomain — defense in depth only, never treated as an authentication boundary (`04` §7.1). Filesystem route tree is `app/x7k9m2/*`, mapping directly to these URLs with no rewrite.

| Route | Purpose |
|---|---|
| `/x7k9m2/access/[token]` | One-time bootstrap link (`04` §7.1, `05` §17) — validates, sets cookie, redirects; not a page with UI beyond a loading/error state |
| `/x7k9m2/` | Dashboard — minimal landing (brief `02` §23 lists "Dashboard" as an area; no content is specified anywhere in `01`–`05`, see §14 Decisions) |
| `/x7k9m2/produk` | Product list/table |
| `/x7k9m2/produk/baru` | Create product |
| `/x7k9m2/produk/[id]` | Edit product (fields, images, read-only current stock) |
| `/x7k9m2/kategori` | Category list, create, archive/restore (`05` §3.3) |
| `/x7k9m2/merek` | Brand list, create, archive/restore (`05` §3.3) |
| `/x7k9m2/inventaris` | Inventory: current stock per product, stock in/out action, transaction history (filterable by product) |
| `/x7k9m2/penjualan` | Sales list (filters: `payment_status`, `sale_status`) |
| `/x7k9m2/penjualan/baru` | Record a new sale (multi-line-item form) |
| `/x7k9m2/penjualan/[id]` | Sale detail — mark paid, cancel (if eligible), generate/send invoice via WhatsApp |
| `/x7k9m2/pengaturan` | Settings — WhatsApp number, order/availability message templates |
| `/x7k9m2/kredensial` | Access-credential management — issue/revoke device tokens (`05` §2.1/§17); required by the schema but not laid out in `01`–`03`, see §14 Decisions |

Every route under this tree (except `/x7k9m2/access/[token]`) is gated by the Section 7 middleware — enforced at the edge, not per-page. `/admin/*` does not exist as a route and returns generic 404.

---

## 2. Component Architecture

Component responsibilities below map 1:1 to `03-design-specification.md` §2.x; only mobile/accessibility/state highlights are repeated here to avoid duplicating the spec.

### 2.1 Public components

**`<Header />`** — Logo, search input, optional contact icon. Sticky (`03` §2.3). Props: none (reads settings via server data for contact link if used). States: default, search-focused. Mobile: search bar always visible below logo row, no hamburger (`03` §2.3).

**`<Logo />`** — Fixed-size slot (`h-8`/`h-9`, `max-w-[180px]`) rendering the business-name text wordmark today, swappable to an image/SVG later with zero layout change (`03` §1.1). Props: none — content is internal until a real asset exists.

**`<SearchInput />`** — Controlled text input, debounced (client-side, ~300ms) onChange emits query string. Props: `value`, `onChange`. State: `idle | typing | no-results` (no-results delegates to `<EmptyState />`, not owned by this component). Mobile: `text-base` (16px) to prevent iOS zoom (`03` §2.3).

**`<FilterTrigger />` / `<FilterSheet />` (mobile) / `<FilterPopovers />` (desktop ≥1024px)** — Category, Brand, Availability filters. One shared filter-state hook (`useProductFilters`) drives both presentations — sheet and popover are pure UI variants of the same state, not two implementations (`03` §2.4). Props: `categories`, `brands`, `activeFilters`, `onApply`. States: closed/open, option selected/unselected. Accessibility: `role="dialog" aria-modal="true"` + focus trap on the sheet; real `<input type="checkbox">`/`<input type="radio">` controls, never div-fakes (`03` §2.4).

**`<ProductCard />`** — Single `<a href="/produk/{slug}">` wrapping image + text (`03` §2.1). Props: `product: { slug, name, brand, price, primaryImageUrl, available }`. States: default, hover (desktop `scale-1.03` on image), active/press (`scale-0.98`), focus ring. Mobile: no hover, full card is the tap target (44px+ height beyond image). Accessibility: `alt="{Brand} {Product Name}"`, availability always carries a text label, never color-only.

**`<ProductGrid />`** — CSS Grid (2/3/4 columns per breakpoint, `03` §1.9). Props: `products[]`, `isLoading`, `hasMore`, `onLoadMore`. States: loaded, loading (renders `<Skeleton />` cards matching column count), empty (renders `<EmptyState />` in place of the grid), error. Accessibility: `<ul>`/`<li>` list semantics, `aria-live="polite"` region announcing result count on filter change (`03` §2.2).

**`<LoadMoreButton />`** — Outline button, `mt-8` centered. Props: `onClick`, `loading`. States: default, loading (spinner + "Memuat...", disabled to prevent double-fetch), hidden when `hasMore` is false.

**`<AvailabilityBadge />`** — Dot + text, two states only (`03` §2.7): `Tersedia` (`--available`) / `Stok Habis` (`--sold-out`). Props: `available: boolean`. No third visual state — the manual-override cause is never exposed publicly (`04` §5.4).

**`<ProductGallery />`** — Branches on `images.length === 1` (static image, zero gallery chrome) vs. `2–5` (native CSS `scroll-snap` + dot indicator, thumbnail row on desktop) — no carousel library (`03` §2.5). Props: `images: {url, altText}[]`. Accessibility: `aria-label="Galeri produk"`, descriptive alt text per image.

**`<WhatsAppCTA />`** — Renders one of two label/message states based on `available` (`03` §2.6). Props: `phoneNumber`, `messageTemplate`, `product: {brand, name, price, available}` — number and templates are always passed in from settings data, **never hardcoded** (`01` §7, `03` §2.6, `CLAUDE.md` §6). Real `<a>`, `target="_blank" rel="noopener noreferrer"`. Used inline on product detail and in `<StickyMobileCTA />` (mobile only, `lg:hidden`, safe-area-inset padding).

**`<EmptyState />`** — Icon + heading + body, two copy variants (no-search-results / empty-category), optional "Reset filter" link (`03` §2.8). Props: `variant`, `onResetFilters?`.

**`<Skeleton />` (grid + card shapes)** — Shape-matched placeholder blocks, `animate-pulse`, respects `prefers-reduced-motion` (`03` §2.9). No text, no per-block `aria-label`; container-level `aria-busy="true"`.

**`<Footer />`** — Brand + statement, optional category quick-links, single general-contact link (`03` §2.10). Static, server-rendered.

### 2.2 Admin components

Admin prioritizes efficiency over the public editorial aesthetic (`02` §23) — shadcn/ui defaults, denser spacing, table-first.

**`<AdminDataTable />`** — Generic table shell (sort-agnostic per §9 pagination decision below) used by Products, Categories, Brands, Sales, Inventory-history lists. Props: `columns`, `rows`, `emptyMessage`, `onRowClick?`. Not a bespoke table per page — one component, column config per usage (reuse over duplication, per `CLAUDE.md` §3).

**`<ProductForm />`** — Create/edit product. Fields: name, category (active-only dropdown, `05` §3.3), brand (active-only dropdown), description, price, status, `is_manually_unavailable` toggle. Props: `initialValues?`, `onSubmit`. States: pristine, submitting, server-error (field-level + form-level), success. Does not include images (delegated to `<ProductImageManager />` as a distinct concern, since image upload has its own async lifecycle).

**`<ProductImageManager />`** — Upload (max 5, `03` §2.5/`05` §4), reorder (`sort_order`), set-primary (`is_primary`), remove. Props: `productId`, `images[]`. States: uploading (per-file progress), at-limit (upload control disabled at 5, `05` §4), error (per-file). Mobile: same controls, touch-friendly reorder (drag or up/down buttons — drag-and-drop on touch is unreliable, buttons are the lazy-correct default).

**`<CategoryBrandTable />`** — Shared list+inline-form component for both Categories and Brands (identical shape: name, slug, status, archive/restore action — `05` §3.3). One component parameterized by entity type, not two.

**`<ArchiveRestoreToggle />`** — Button pair reflecting `status`, calls the archive/restore mutation, optimistic UI with rollback on error. Props: `status`, `onArchive`, `onRestore`. Never shows "Delete" copy (`05` §3.3: archive/restore only, no hard delete from the app).

**`<InventoryStockForm />`** — Product picker + IN/OUT toggle + quantity + note. Props: `onSubmit`. Client-side pre-check against currently-known stock for OUT (fast feedback), DB `CHECK` is the real guarantee (`04` §6.1, `05` §5.3). States: submitting, insufficient-stock error (surfaced from the server, not just the client pre-check, since concurrent writes can race).

**`<InventoryHistoryTable />`** — Read-only ledger view, filterable by product, newest-first (`05` §8 `idx_inventory_product_created`). Never editable — append-only ledger has no edit/delete affordance in the UI at all.

**`<SaleForm />`** — Customer name/phone (optional), note, multi-line-item picker (product + quantity, unit price defaults to current `product.price` and is editable only if a future requirement asks — v1 uses live price as the snapshot source, per `04` §6.1/`05` §6.1). Props: `onSubmit`. States: submitting, per-line stock-insufficient error, success (redirects to sale detail).

**`<SaleDetail />`** — Sale summary, line items, `payment_status` (mark-as-paid action, only when `PENDING`), `sale_status` (cancel action, only when `PENDING`+`CONFIRMED` — `05` §6.4), invoice text preview + "Kirim Invoice via WhatsApp" action. Props: `sale`. States: default, mutating (mark-paid/cancel in flight), already-transitioned (button hidden once state no longer allows the action — server is authoritative, matches the idempotent `WHERE payment_status = 'PENDING'` guard in `05` §6.3).

**`<InvoiceWhatsAppAction />`** — Builds a `wa.me` link from the sale's data using the same template-resolution pattern as the public CTA (text, not PDF — `01` §7, `12.1` says invoice text, this task's §9). Exact invoice content is not specified in `01`–`05` (see §14 Decisions).

**`<SettingsForm />`** — WhatsApp number (E.164), order message template, availability message template, with the `{brand} {product_name} {price} {qty}` / `{brand} {product_name}` placeholder sets documented in `04` §11.2. Single-row singleton, always `UPDATE`, never `INSERT` from the client (`05` §7.1).

**`<AccessTokenManager />`** — List active/expired/revoked credentials (label, issued date, expiry, revoke action), issue-new flow (shows the one-time bootstrap link once, never persisted client-side beyond that view). Props: none (server-fetched). See §14 Decisions — this page's UX is not designed in `01`–`03`, only its data model (`05` §2.1/§17).

**`<AdminNav />`** — Sidebar or top nav listing the seven admin areas (`02` §23: Dashboard, Catalog, Categories, Brands, Inventory, Sales, Settings) plus Access/Kredensial. No role-based conditional items — single flat admin role for v1 (`04` §7.4).

---

## 3. Page Architecture

### 3.1 Public — `/` (Catalog)

- **Layout:** `<Header />` → intro/brand statement (brief `02` §9) → `<FilterTrigger />`/`<FilterPopovers />` → `<ProductGrid />` → `<Footer />`.
- **Data:** First page of products server-rendered (Next.js Server Component, Supabase `anon` client, RLS-scoped `status = 'ACTIVE'`, `idx_products_public_listing` — `05` §8/§10). Categories/brands for filters fetched server-side alongside (both `status = 'ACTIVE'` for filter options, per `05` §11.1's filter-list query note).
- **Loading:** Skeleton grid on filter-change/Load-More refetch (client-driven); no loading state for the very first paint (SSR delivers content directly).
- **Empty:** `<EmptyState variant="no-results">` or `variant="empty-category">` depending on whether a search/filter is active.
- **Error:** Inline retry affordance in place of the grid (network/Supabase failure) — no full-page error screen for a partial-data failure.
- **Responsive:** 2/3/4-column grid, filter sheet (`<1024px`) vs. inline popovers (`≥1024px`) per `03` §2.4.

### 3.2 Public — `/produk/[slug]` (Product Detail)

- **Layout:** Mobile: `<ProductGallery />` → Brand → Name → Price → `<AvailabilityBadge />` → Description → inline `<WhatsAppCTA />` → `<StickyMobileCTA />`. Desktop: two-column (gallery left, sticky info stack right) per `03` §2.5.
- **Data:** Server-rendered by `slug` (unique index, `05` §8), `status = 'ACTIVE'` only — an `INACTIVE` product's slug returns 404 (not a "this product isn't available" message; it isn't a public row at all, `04` §5.4/`05` §11.1).
- **Loading:** N/A — SSR; a client-side skeleton is unnecessary since this is not a client-fetched route.
- **Empty:** N/A (404 page for missing/inactive slug — standard Next.js `notFound()`).
- **Error:** Standard Next.js error boundary; no bespoke design needed beyond matching the site's tone (simple, not scary).
- **Responsive:** Column split only `≥1024px`; single-column stack below that (`03` §2.5).

### 3.3 Admin — `/produk` (Product List)

- **Layout:** `<AdminNav />` → page header with "Tambah Produk" action → `<AdminDataTable />` (columns: image thumb, name, brand, category, price, status, cached stock, availability override indicator).
- **Data:** Server-rendered via `service_role` (admin sees all statuses, `04` §8).
- **Loading:** Table skeleton rows.
- **Empty:** "Belum ada produk" + "Tambah Produk" CTA.
- **Error:** Table-area error banner with retry.
- **Responsive:** Table scrolls horizontally on narrow viewports (admin is desktop-first per `02` §23, but must not break on a phone if a staff member checks stock on mobile).

### 3.4 Admin — `/produk/baru`, `/produk/[id]` (Create/Edit Product)

- **Layout:** `<ProductForm />`; `<ProductImageManager />` appears on `/produk/[id]` only (an image needs a `product_id` to attach to — creation is two steps: save the product row, then manage images, consistent with `05` §4's note that a product can exist with zero images while being edited).
- **Data:** Form submits via server action/route using `service_role`. Category/brand dropdowns: active-only (`05` §3.3).
- **Loading:** Submit-button spinner state; image upload shows per-file progress.
- **Empty:** N/A (form page).
- **Error:** Field-level validation errors (server-authoritative, see §8) + toast for unexpected failures.
- **Responsive:** Single-column form at all sizes (admin forms don't need a two-column layout at this field count).

### 3.5 Admin — `/kategori`, `/merek` (Category/Brand Management)

- **Layout:** `<AdminNav />` → `<CategoryBrandTable />` (name, slug, status, `<ArchiveRestoreToggle />`) + inline "add new" row/modal.
- **Data:** Server-rendered, all statuses visible to admin (unlike the public `status='ACTIVE'`-only filter list).
- **Loading:** Table skeleton.
- **Empty:** "Belum ada kategori/merek" + add action.
- **Error:** Inline banner + retry.
- **Responsive:** Simple table, no special mobile treatment beyond horizontal scroll if needed.

### 3.6 Admin — `/inventaris` (Inventory)

- **Layout:** `<InventoryStockForm />` (product picker + IN/OUT + qty + note) above `<InventoryHistoryTable />` (filterable by product).
- **Data:** Current `cached_stock` per product for the picker; ledger rows via `idx_inventory_product_created`.
- **Loading:** Form disabled while submitting; table skeleton on filter change.
- **Empty:** "Belum ada transaksi" for a product with no history yet.
- **Error:** Insufficient-stock error surfaced inline on the form (client pre-check + server-authoritative rejection, `04` §6.1).
- **Responsive:** Form stacks single-column on mobile; table scrolls horizontally.

### 3.7 Admin — `/penjualan`, `/penjualan/baru`, `/penjualan/[id]` (Sales)

- **Layout (list):** `<AdminDataTable />` with `payment_status`/`sale_status` filter chips.
- **Layout (create):** `<SaleForm />`.
- **Layout (detail):** `<SaleDetail />` + `<InvoiceWhatsAppAction />`.
- **Data:** List server-rendered (`idx_sales_created`); create submits via `service_role` transaction (`05` §6.2); detail server-rendered by id.
- **Loading:** List/table skeleton; create-form submit spinner; detail mutation buttons show inline spinner during mark-paid/cancel.
- **Empty:** "Belum ada penjualan" + "Catat Penjualan" CTA on the list.
- **Error:** Per-line stock-insufficient error on create (mirrors `<InventoryStockForm />`'s pattern); conflict message if a mark-paid/cancel action is attempted on a sale whose state already changed (idempotent guard returns zero rows, `05` §6.3/§6.4 — UI treats this as "someone else already did this," not a silent success).
- **Responsive:** Create form stacks single-column; line-item rows collapse to a stacked card layout on mobile instead of a table row.

### 3.8 Admin — `/pengaturan` (Settings)

- **Layout:** `<SettingsForm />` only — single-row singleton (`05` §7.1).
- **Data:** Server-rendered, one `UPDATE` on submit.
- **Loading:** Submit spinner.
- **Empty:** N/A (row always exists, seeded — `05` §15).
- **Error:** Field-level validation (E.164 format for the phone number) + server-error toast.
- **Responsive:** Single-column form.

### 3.9 Admin — `/kredensial` (Access Credentials)

- **Layout:** `<AccessTokenManager />` — list + issue action.
- **Data:** Server-rendered list (`admin_access_tokens`, never public-readable — `05` §11.1); issuance is a server action returning the one-time bootstrap link.
- **Loading:** Table skeleton; issue-button spinner.
- **Empty:** Should not realistically be empty (seed creates one — `05` §15), but a "no credentials" state still needs to exist defensively since this table can theoretically be emptied by revocation.
- **Error:** Inline banner + retry.
- **Responsive:** Simple table.

### 3.10 Admin — `/` (Dashboard)

Minimal per `02` §23 (area exists, content undefined elsewhere) — see §14 Decisions for scope. Plan assumes a lightweight landing (e.g. low-stock count, pending-payment sales count) rather than a data-heavy dashboard, consistent with `CLAUDE.md` §3 "avoid over-engineering" — but the exact content is a decision, not an inference.

---

## 4. Public Catalog UX

- **Search:** Single input, debounced client-side (~300ms), matches name/brand/category via `ILIKE`/`OR` server-side (`03` §2.3, `05` §9). No separate scope selector. Empty query shows the unfiltered catalog, not an empty state.
- **Category/Brand filtering:** Multi-select or single-select per the design spec's checkbox-row treatment (`03` §2.4) — category/brand are checkbox groups (not radio, since the design spec doesn't restrict to one category/brand at a time and `04`/`05` don't say otherwise); Availability is a radio group (All/Available/Sold Out, 3 mutually exclusive states, `03` §2.4). Composed with plain `AND`, search narrows whatever filters already narrowed (`04` §10).
- **Cursor pagination:** "Muat Lebih Banyak" only. Client holds an opaque cursor from the last response; each Load More call appends results (`04`/`05` §9/§10). Filter/search change resets pagination and refetches page 1.
- **Product cards:** As specified in §2.1 above — image-first, no marketplace chrome (ratings, discounts, wishlist icons never appear, per `02` §11/`CLAUDE.md` §2).
- **Product detail:** Full spec-driven layout (§3.2 above); availability resolved server-side into exactly two labels, `is_manually_unavailable` and raw `cached_stock` are never sent to the client as separate fields (`04` §5.4, `05` §3.2/§11.1) — the server data-fetch layer must select only the resolved `available: boolean`, never `SELECT *`.
- **WhatsApp actions:** `<WhatsAppCTA />` resolves number + template from settings data passed down from a server fetch (never hardcoded, never a raw client-side `settings` table read — `05` §7.2/§11.1 requires the resolved link/fields only, via a narrow server-side helper, not a public `SELECT * FROM settings`).

No wishlist, ratings, discounts, or payment checkout anywhere in this surface (`01` §17, `02` §28, `CLAUDE.md` §2). The cart and order submission (`01` §5.1a, Milestone 4) are the one exception to "no cart" in this document's earlier passes — client-side cart state, order submission via the existing `createSale()` path, never a payment flow.

---

## 5. Admin UX

- **Catalog CRUD:** `<ProductForm />` + `<ProductImageManager />` (§3.4). Category/brand dropdowns exclude `INACTIVE` entries from selection but an existing product keeps displaying its already-assigned (possibly archived) category/brand normally (`05` §3.3).
- **Category/brand archive/restore:** `<ArchiveRestoreToggle />`, never a delete action in the UI — the app never issues `DELETE` against these tables (`05` §12).
- **Product images:** Relational table via `<ProductImageManager />`, 1–5 bound enforced in the upload flow (disable control at 5, reject a 6th — `05` §4), primary-image selection maps to the DB partial unique index.
- **Inventory:** `<InventoryStockForm />` + `<InventoryHistoryTable />` (§3.6). No edit/delete on ledger rows anywhere in the UI — corrections are new offsetting transactions, which the UI surfaces as "record a correction" (a normal Stock In/Out with a note), not a hidden edit path (`04`/`05` §5.1, §12).
- **Sales:** `<SaleForm />` creates `sale` + `sale_items` + `OUT` transactions atomically server-side (`05` §6.2) — the UI performs one submit, one server action, no multi-step client orchestration of the write.
- **Payment status:** Manual-only "Mark as Paid" button on `<SaleDetail />`, visible only while `payment_status = 'PENDING'` (`05` §6.3). No automated verification UI of any kind (no proof upload, no OCR trigger) — explicitly excluded (`01` §12.1/§17).
- **Invoice generation:** `<InvoiceWhatsAppAction />` builds a **text** message (never PDF, `01` §7/§17) from the sale's data and opens `wa.me`. Exact invoice copy/format is not specified anywhere in `01`–`05` — flagged in §14 Decisions rather than invented.
- **Kirim Invoice via WhatsApp:** Same `wa.me` deep-link mechanism as the customer-facing CTA, reused (not reimplemented) — both are instances of "build a WhatsApp deep link from a template + data," so the URL-building logic is one shared utility, not duplicated per surface (`CLAUDE.md` §3 reuse principle).
- **Settings:** `<SettingsForm />`, singleton, admin-only write (§3.8).

Where a requirement is unclear (dashboard content, invoice format, credential-management UX), it is listed in §14, not guessed at here.

---

## 6. State Management

**No Redux/Zustand/Jotai/etc.** — nothing in this system's interaction complexity justifies a global client store (`CLAUDE.md` §3, project instruction §6 "Recommend the simplest appropriate approach").

- **Server state (the vast majority of this app's data):** fetched via Next.js Server Components for initial render, re-fetched via Server Actions / Route Handlers for mutations, and revalidated with Next.js's built-in `revalidatePath`/`revalidateTag` — no client-side cache library (no React Query/SWR) needed at this data-volume and interaction-frequency scale. If admin tables later need optimistic multi-user live updates, that is a future decision, not a v1 requirement.
- **Local UI state:** `useState`/`useReducer` where a component owns genuinely local, ephemeral state (filter sheet open/closed, form field values before submit, image-upload progress). No state is lifted higher than the component tree that needs it.
- **Cross-component filter state (public catalog):** one `useProductFilters` hook (or React Context scoped to the catalog page tree only, not app-wide) synced to the URL query string — shareable, back-button-safe, and avoids prop-drilling between `<Header search />`, `<FilterSheet />`/`<FilterPopovers />`, and `<ProductGrid />` without introducing a global store.
- **Optimistic updates:** used narrowly for archive/restore and mark-paid/cancel actions (`useOptimistic` — a React/Next.js built-in, not a new dependency) with rollback on server rejection, since these are single-row toggles where perceived latency matters more than the (small) risk of a rollback flicker.

---

## 7. Data Fetching

| Concern | Where | Mechanism |
|---|---|---|
| Public catalog first page | Server-rendered | Server Component, Supabase `anon` client, RLS-scoped (`05` §11.1) |
| Public catalog Load More / filter refetch | Client-triggered | Client-side Supabase `anon` client call (RLS still enforces `status='ACTIVE'` boundaries) — no bespoke API route needed since the query shape is identical to the SSR query and RLS already guards it (avoids an unnecessary proxy layer, `CLAUDE.md` §3) |
| Product detail page | Server-rendered | Server Component, `anon` client, single-row-by-slug |
| WhatsApp number/message resolution (public) | Server-rendered / server helper | Narrow server-side function, never a raw client `settings` read (`05` §7.2/§11.1) |
| All admin reads | Server-rendered per page | `service_role` client, server-side only, behind the Section 7 middleware |
| All admin mutations (create/edit/archive product, category, brand; stock in/out; record/mark-paid/cancel sale; edit settings; issue/revoke credential) | Server Actions or Route Handlers | `service_role` client, server-side only — **the `service_role` key never reaches any client bundle, `NEXT_PUBLIC_*` var, or response body** (`05` §11.2, `CLAUDE.md` §11) |
| Admin bootstrap (`/access/[token]`) | Server-side only | Validates token, sets signed `httpOnly` cookie (`05` §17) — no client-side token handling at all |

This matches `04-system-design.md` §8's access table exactly: public writes are always `No`, admin reads/writes always route through server-side code gated by middleware, never through a client-reachable admin RLS role (there is none — `05` §11).

---

## 8. Forms and Validation

Three layers, each with a distinct job — none is a substitute for another:

1. **Client-side UX validation** (immediate feedback, not authoritative): required fields, price/quantity numeric bounds, E.164 phone format, image count ≤5 before upload even starts. Purpose is faster feedback and fewer round-trips, not security.
2. **Server-side authoritative validation** (in the Server Action/Route Handler, before touching the database): re-checks everything the client checked (never trusts client-only validation, `CLAUDE.md` §11) plus business rules the client can't fully verify — e.g. "is this category/brand currently `ACTIVE`" (race with a concurrent archive), "does this sale's stock still suffice" (race with a concurrent sale/stock-out).
3. **Database constraints** (final backstop, `05` §2/§4/§5): `CHECK (price >= 0)`, `CHECK (cached_stock >= 0)`, `CHECK (quantity > 0)`, unique slugs, the primary-image partial unique index, the `settings.id = 1` singleton check. A well-formed request that somehow bypasses layers 1–2 (or a genuine concurrency race) still cannot corrupt data — the transaction rolls back and the server surfaces that failure as a normal form error, not a crash.

Form boundary rule: **one form owns one write transaction.** `<ProductForm />` does not also submit images (separate form/component, separate mutation — §2.2 above); `<SaleForm />` submits the whole sale (header + all line items) as one atomic call, matching the one-transaction write path in `05` §6.2 — never a per-line-item request.

---

## 9. WhatsApp UX

All three actions share one underlying mechanism: build a `wa.me/{number}?text={encoded}` link from admin-configured data, never a hardcoded number or template (`01` §7, `03` §2.6, `04` §11.2).

- **Pesan via WhatsApp** (product detail, available): `order_message_template` resolved with `{brand} {product_name} {price} {qty}` (qty defaults to 1, no quantity selector exists — `01` §7's example message and `03`/`04` never describe a qty-picker UI, ordering "how many" happens in the WhatsApp conversation itself).
- **Tanya Ketersediaan** (product detail, sold out): `availability_message_template` resolved with `{brand} {product_name}` only — same button component, different label/message/state, not a second CTA (`03` §2.6, decision log item 3).
- **Kirim Invoice via WhatsApp** (admin, sale detail): same deep-link mechanism, sale data instead of product data. **The invoice stays plain text, never a PDF** (`01` §7/§17, `CLAUDE.md` §6) — content/format is a decision required (§14), not the mechanism, which is settled.

All three are real `<a>` tags (not `onClick` + `window.open`, for reliability across mobile browsers and to keep them keyboard/screen-reader operable), `target="_blank" rel="noopener noreferrer"`.

---

## 10. Responsive Strategy

Breakpoints locked in `03-design-specification.md` §1.10: `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`. Mobile is the design target (`01` §16, `02` §14); tablet and desktop are progressive enhancements, not separate designs.

| Surface | `<768px` | `768–1023px` | `≥1024px` |
|---|---|---|---|
| Product grid | 2 columns | 3 columns | 4 columns |
| Filters | Bottom sheet | Bottom sheet | Inline popovers |
| Product detail | Single column, sticky bottom CTA bar | Single column, sticky bottom CTA bar | Two-column, sticky right info stack |
| Header | Two-row (logo+contact / search) | Single row | Single row |
| Admin tables | Horizontal scroll | Horizontal scroll | Full table |
| Admin forms | Single column | Single column | Single column (no admin form in this plan needs a two-column layout) |

Touch targets ≥44px everywhere interactive (cards, buttons, filter chips — `01` §16, `03` §2.1/§2.6). No horizontal page scroll anywhere except deliberately scrollable containers (image galleries, wide tables).

---

## 11. Accessibility

Directly from `03-design-specification.md` §2.x and design brief §22, applied as implementation requirements:

- Every card/CTA/interactive element has a visible focus ring (`ring-2 ring-[--accent]` or `ring-[--whatsapp-cta]` depending on context) — never `outline: none` without a replacement.
- Availability, price, and all state signals carry a text label; color is reinforcement, never the sole channel (`03` §2.7, brief §22).
- `<ProductCard />` is one tab stop (single `<a>` wrapping the whole card), not nested interactive elements.
- Filter sheet: `role="dialog" aria-modal="true"`, focus trap, `Esc` closes, focus returns to the trigger button on close (`03` §2.4).
- Real form controls throughout — `<input type="checkbox">`/`<input type="radio">` for filters, real `<label>` elements for every input (search input has a real, possibly visually-`sr-only`, `<label>`, not placeholder-as-label — `03` §2.3).
- `aria-live="polite"` region announces result-count changes on the catalog grid (`03` §2.2/§2.8).
- One `<h1>` per page (product name on detail, page title on admin pages).
- All motion honors `prefers-reduced-motion` (card hover, sheet open/close, skeleton pulse, image fade-in — `03` §3).
- Landmarks: `<header>`, `<footer>`, `<main>` on every page; admin nav as a `<nav>` landmark.
- Image alt text: `"{Brand} {Product Name}"` pattern for cards/gallery; `product_images.alt_text` falls back to this pattern when null (`05` §2.5).

---

## 12. Loading / Error / Empty States

| Surface | Loading | Empty | Error |
|---|---|---|---|
| Public catalog grid | Shape-matched skeleton cards (`03` §2.9), first paint is SSR so no spinner on initial load | `<EmptyState variant="no-results"\|"empty-category">` (`03` §2.8) | Inline retry banner in the grid area |
| Product detail | N/A (SSR) | `notFound()` → standard 404 | Standard Next.js error boundary |
| Admin tables | Skeleton rows | "Belum ada {entity}" + primary action | Inline banner + retry |
| Admin forms | Submit-button spinner, form fields disabled during submit | N/A | Field-level errors (server-authoritative) + toast for unexpected failures |
| Image upload | Per-file progress | N/A | Per-file error, does not block other files' upload |
| Sale mark-paid/cancel | Inline button spinner | N/A | Conflict message if state already changed server-side (idempotent-guard miss, `05` §6.3/§6.4) |

No playful illustrations or unnecessary animation anywhere (brief `02` §17/§21) — icon + text only for empty states, `animate-pulse` (Tailwind built-in) only for loading, no custom shimmer library.

---

## 13. Suggested Project Structure

Single Next.js/TypeScript repository (App Router), path-based routing rather than two separate codebases or a separate admin subdomain (2026-09-04, `04` §7.1) — the public and admin surfaces share the design-token/component-primitive layer (`03` §1) and the Supabase client setup, and splitting into two repos would duplicate both for no benefit at this project's size. Admin lives at `app/x7k9m2/*`, mapping directly to `/x7k9m2/*` with no rewrite needed — middleware only gates the path, it does not rewrite hostnames.

```text
app/
  (public)/
    layout.tsx                 # public Header/Footer shell
    page.tsx                   # catalog home
    produk/[slug]/page.tsx     # product detail
  x7k9m2/
    layout.tsx                 # admin nav shell, applies only under /x7k9m2/*; sets noindex metadata
    access/[token]/route.ts    # bootstrap handler
    page.tsx                   # dashboard
    produk/page.tsx
    produk/baru/page.tsx
    produk/[id]/page.tsx
    kategori/page.tsx
    merek/page.tsx
    inventaris/page.tsx
    penjualan/page.tsx
    penjualan/baru/page.tsx
    penjualan/[id]/page.tsx
    pengaturan/page.tsx
    kredensial/page.tsx
  api/                         # route handlers only where a Server Action doesn't fit
    ...
middleware.ts                  # Section 7 access-control gate, applies to /x7k9m2/* only; returns generic 404 for /admin/*
components/
  ui/                          # shadcn primitives (Button, Input, etc.)
  catalog/                     # ProductCard, ProductGrid, FilterSheet, SearchInput, ...
  detail/                      # ProductGallery, WhatsAppCTA, AvailabilityBadge, ...
  admin/                       # AdminDataTable, ProductForm, SaleForm, ...
  shared/                      # Logo, EmptyState, Skeleton — used by both surfaces
lib/
  supabase/
    server.ts                  # anon client (public reads) + service_role client (admin, server-only)
  whatsapp/
    build-link.ts               # shared wa.me link builder, used by CTA + invoice action
  filters/
    use-product-filters.ts      # URL-synced filter state hook
  validation/
    product.ts, sale.ts, ...    # shared client+server validation schemas
types/
  database.ts                  # generated/maintained Supabase types
```

No `services/`, `repositories/`, or DDD-style layering beyond `lib/` — the data-access surface here (Supabase queries + Server Actions) does not justify an extra abstraction tier (`CLAUDE.md` §3 "avoid premature abstraction").

---

## 14. Implementation Order

Dependency-aware, matching `CLAUDE.md` §13's phase sequence, expanded to frontend specifics:

```text
1. Design tokens + primitives
   Tailwind config from 03 §1, shadcn/ui install, Logo component, base layout shells (public + admin)

2. Public catalog — read path only
   Header, SearchInput, ProductGrid, ProductCard, Skeleton, EmptyState, Footer
   Server-rendered first page, no filters/search wired yet

3. Public catalog — filters, search, pagination
   FilterSheet/FilterPopovers, useProductFilters, Load More, URL sync

4. Product detail
   ProductGallery, AvailabilityBadge, WhatsAppCTA (requires Settings data — depends on step 8 existing at least as seed data)

5. Admin shell + access control
   AdminNav, /access/[token] bootstrap, middleware gate — nothing past this point is reachable without it

6. Admin catalog CRUD
   ProductForm, ProductImageManager, CategoryBrandTable + ArchiveRestoreToggle (Kategori/Merek)

7. Admin inventory
   InventoryStockForm, InventoryHistoryTable

8. Admin settings
   SettingsForm — unblocks the real WhatsApp CTA/invoice wiring in steps 4 and 9

9. Admin sales
   SaleForm, sale list, SaleDetail (mark-paid, cancel), InvoiceWhatsAppAction

10. Admin access-credential management
    AccessTokenManager (can move earlier if issuing real staff credentials is needed before other admin work is usable)

11. Polish pass
    Full responsive verification, accessibility audit against §11, loading/error/empty state coverage against §12, reduced-motion check
```

Each step ends with: TypeScript check, lint, and a manual pass against the relevant `03`/`04`/`05` sections before moving on (`CLAUDE.md` §13/§17).

---

## Decisions Required Before Frontend Implementation

Only items with no answer findable in `01`–`05`:

1. **Admin dashboard content (`/`, §3.10).** `02-design-brief.md` §23 lists "Dashboard" as an admin area but no document defines what it shows. Plan assumes a lightweight summary (e.g. low-stock count, pending-payment count) as a placeholder-scale default — needs explicit approval or a defined content list before building.

2. **Access-credential management UX (`/kredensial`, §2.2/§3.9).** `05-database-design.md` §2.1/§17 defines the `admin_access_tokens` data model and requires admin read (list/revoke) and write (issue/revoke) capability, but no document in `01`–`03` designs this screen's flow (e.g. how the one-time bootstrap link is displayed/copied, whether labels are required at issuance, what "revoke" confirmation looks like). This plan proposes a minimal list+issue page; needs confirmation.

3. **Invoice text content/format.** `01-product-requirements.md` §12.1 and `04-system-design.md` §6.2 confirm an "invoice text" is generated and sent manually via WhatsApp, and confirm it is text (never PDF), but no document specifies its actual content/layout (line items? totals? payment instructions? business name/address?). Needed before `<InvoiceWhatsAppAction />` and its template can be built.

4. **Sale quantity default / no quantity selector on public CTA.** `01-product-requirements.md` §7's example message hardcodes `Qty: 1` and no document describes a quantity-selector UI anywhere in the public product detail flow. This plan assumes qty is always `1` in the pre-filled message (adjusted by the customer inside the WhatsApp conversation, matching the "browse independently, purchase personally" principle) — flagging in case a quantity stepper was actually intended and simply not written down.

5. **Domain/subdomain wiring mechanism.** `04-system-design.md` §7.1/§7.4 firmly establishes *that* admin lives on a separate subdomain, but not *how* that's realized at the hosting/deployment layer (Vercel multi-domain project vs. `middleware.ts` host-based routing within one deployment). This has a small structural impact on `middleware.ts`/route-group layout (§13) and is more naturally a `docs/07-deployment.md` decision — flagged here only because it touches the project structure proposed above.

None of these block starting Steps 1–3 of the implementation order (public catalog read path); they should be resolved before Steps 9–10 and before finalizing the dashboard in Step 5's shell.
