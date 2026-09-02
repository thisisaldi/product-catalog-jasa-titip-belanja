# System Design Specification

## Curated Product Catalog & Inventory Website — Database & Architecture

**Document:** 04-system-design.md
**Version:** 1.5 — Architecture audit resolution pass: Storage bucket policy referenced (Section 12, full detail in `05` Section 4a/`06` Section 9); `settings.invoice_message_template` added (Section 2.9, 11.2); duplicate product lines rejected/consolidated (Section 2.7, 6.1b); deterministic lock ordering documented for multi-item sales (Section 6.1); explicit public-columns view (`products_public`) documented as the public data boundary (Section 8.1); `products.status` DRAFT question resolved without a schema change (Section 5.4a)
**Status:** Draft
**Date:** 2026-09-01
**Source of truth:** `01-product-requirements.md`, `02-design-brief.md`, `03-design-specification.md`

No code, no migrations in this document. Schema is proposed in SQL-like DDL sketches for review only.

---

## 1. Entity / Domain Model

Nine entities, three domains:

**Catalog domain:** `Category`, `Brand`, `Product`, `ProductImage`
**Inventory/Sales domain:** `InventoryTransaction`, `Sale`, `SaleItem`
**Platform domain:** `AdminAccessToken`, `Settings`

`AdminAccessToken` is a revocable per-device access-credential registry, not an identity/user table — see Section 7 for the full access-control model (no Supabase Auth, no login, no `authenticated` role).

```text
Category ──┐
Brand ──────┼──< Product >── ProductImage
            │        │
            │        ├──< InventoryTransaction
            │        │
            │        └──< SaleItem >── Sale

AdminAccessToken ──< InventoryTransaction (created_by)
AdminAccessToken ──< Sale (created_by)
AdminAccessToken ──< Settings (updated_by)

Settings (singleton)
```

---

## 2. Database Schema Proposal

All tables use UUID primary keys (Supabase/Postgres convention, avoids sequential-ID enumeration on public catalog endpoints).

### 2.1 `category`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | default `gen_random_uuid()` |
| `name` | text, not null | |
| `slug` | text, not null, unique | |
| `created_at` | timestamptz, not null | default `now()` |

### 2.2 `brand`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `name` | text, not null | |
| `slug` | text, not null, unique | |
| `created_at` | timestamptz, not null | default `now()` |

### 2.3 `product`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `name` | text, not null | |
| `slug` | text, not null, unique | |
| `brand_id` | uuid, FK → `brand.id`, not null | |
| `category_id` | uuid, FK → `category.id`, not null | |
| `description` | text, nullable | |
| `price` | numeric(12,2), not null, `CHECK (price >= 0)` | |
| `status` | enum `product_status` (`ACTIVE`, `INACTIVE`), not null, default `ACTIVE` | catalog **visibility** — PRD Section 8 |
| `is_manually_unavailable` | boolean, not null, default `false` | internal-only operational override, independent of stock; never exposed as a distinct public state — collapses into "Stok Habis" alongside `cached_stock = 0` (Section 5.4) |
| `cached_stock` | integer, not null, default `0`, `CHECK (cached_stock >= 0)` | denormalized running total, see Section 5.3 |
| `created_at` | timestamptz, not null, default `now()` | |
| `updated_at` | timestamptz, not null, default `now()` | |

### 2.4 `product_image`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `product_id` | uuid, FK → `product.id`, not null, `ON DELETE CASCADE` | |
| `url` | text, not null | storage path (Supabase Storage) |
| `alt_text` | text, nullable | falls back to `"{brand} {product name}"` at render time if null |
| `sort_order` | smallint, not null, default `0` | display order, 0 = first |
| `is_primary` | boolean, not null, default `false` | used for card thumbnail; exactly one `true` per product, enforced at application layer + partial unique index (2.4.1) |
| `created_at` | timestamptz, not null, default `now()` | |

2.4.1 — `CREATE UNIQUE INDEX ON product_image (product_id) WHERE is_primary = true;` guarantees at most one primary image per product at the DB level. 1-5 images per product is a UI/application-level bound (Section 3 spec), not a DB constraint — a hard row-count CHECK across a child table isn't natively expressible in Postgres without a trigger, and a trigger is more machinery than this limit is worth; enforce the 1-5 bound in the admin upload flow instead.

### 2.5 `inventory_transaction`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `product_id` | uuid, FK → `product.id`, not null | |
| `type` | enum `transaction_type` (`IN`, `OUT`), not null | |
| `quantity` | integer, not null, `CHECK (quantity > 0)` | always positive; direction comes from `type` |
| `note` | text, nullable | |
| `created_by` | uuid, FK → `admin_access_token.id`, not null | which access credential/device performed this action — device attribution, not a verified human identity |
| `created_at` | timestamptz, not null, default `now()` | |

Append-only ledger. No `UPDATE`/`DELETE` in normal operation — corrections are new offsetting transactions with a `note`, preserving audit history per PRD Section 11 ("retain transaction history").

### 2.6 `sale`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `invoice_number` | text, not null, unique | system-generated at creation, server-controlled only — see Section 6.1a |
| `customer_name` | text, nullable | |
| `customer_phone` | text, nullable | |
| `note` | text, nullable | |
| `payment_status` | enum (`PENDING`, `PAID`), not null, default `PENDING` | manual-only field, see Section 6.3 — never set automatically |
| `paid_at` | timestamptz, nullable | set only when `payment_status` transitions to `PAID`, see Section 6.3 |
| `paid_by` | uuid, FK → `admin_access_token.id`, nullable | which access credential made the `PAID` transition — device attribution, not a verified human identity |
| `sale_status` | enum (`CONFIRMED`, `CANCELLED`), not null, default `CONFIRMED` | order/lifecycle state, deliberately separate from `payment_status` — see Section 6.4 |
| `cancelled_at` | timestamptz, nullable | set only when an unpaid sale transitions to `CANCELLED`, see Section 6.4 |
| `cancelled_by` | uuid, FK → `admin_access_token.id`, nullable | which access credential made the cancellation |
| `created_by` | uuid, FK → `admin_access_token.id`, not null | which access credential/device performed this action — device attribution, not a verified human identity |
| `created_at` | timestamptz, not null, default `now()` | |

`payment_status` and `sale_status` are two independent axes, not one combined status — a sale can be `CONFIRMED` + `PENDING` (the normal in-progress state), `CONFIRMED` + `PAID` (done), or `CANCELLED` + `PENDING` (the only cancellation path currently defined, Section 6.4). `CANCELLED` + `PAID` is not a flow this system defines (cancelling an already-paid sale is a refund scenario, explicitly out of scope — PRD Section 17 Excluded has no refund handling).

`paid_at`/`paid_by` and `cancelled_at`/`cancelled_by` replace what would otherwise need a separate audit-log table for these two specific transitions — no such table is introduced (per this project's standing constraint against adding tables without concrete architectural reason, `05` §1.1). Both pairs are set exclusively by the server-side transitions in Section 6.3/6.4; there is no client-reachable path that writes to any of these four columns directly.

### 2.7 `sale_item`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `sale_id` | uuid, FK → `sale.id`, not null, `ON DELETE CASCADE` | |
| `product_id` | uuid, FK → `product.id`, not null | |
| `quantity` | integer, not null, `CHECK (quantity > 0)` | |
| `unit_price` | numeric(12,2), not null, `CHECK (unit_price >= 0)` | **snapshot** of `product.price` at sale time, not a live reference |
| `subtotal` | numeric(12,2), not null, `CHECK (subtotal >= 0)` | `quantity * unit_price`, stored (not generated) so historical sales survive a later change to the computation, though app always writes it as the product |

**Constraint (resolves audit Finding 7):** `UNIQUE (sale_id, product_id)` — a sale may contain a given product only once. See Section 6.1b.

### 2.8 `admin_access_token`

**Not a user/identity table.** No Supabase Auth, no account, no login — this is a revocable per-device access-credential registry, per the approved no-authentication access-control decision (Section 7). A row identifies a registered credential/device (e.g. "Owner's Phone"), never a cryptographically verified human.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | referenced by `created_by`/`updated_by` elsewhere for device attribution |
| `label` | text, not null | human-readable device/credential name, e.g. `"Owner's Phone"`, `"Store Laptop"` — descriptive only |
| `token_hash` | text, not null, unique | hash of the one-time bootstrap secret; plaintext is shown once at issuance, never stored |
| `created_at` | timestamptz, not null, default `now()` | |
| `expires_at` | timestamptz, nullable | optional hard expiry forcing periodic re-bootstrap, independent of `revoked_at`; `NULL` = permanent, the default as of 2026-09-03 |
| `revoked_at` | timestamptz, nullable | set to immediately invalidate this credential; `NULL` = active |

No `password_hash`, no `email`, no `name`-as-identity — there is no credential type here beyond the hashed bootstrap secret itself, and no auth provider of any kind is delegated to. Full flow (issuance → bootstrap → cookie → middleware → `service_role` mutation) is Section 7.1; exact schema detail lives in `05-database-design.md` Section 2.1/17.

### 2.9 `settings`

| Column | Type | Notes |
|---|---|---|
| `id` | smallint, PK, `CHECK (id = 1)` | singleton row, see Section 11 |
| `whatsapp_number` | text, not null | E.164 format, e.g. `+6281234567890` |
| `order_message_template` | text, not null | see Section 11.2 for placeholder syntax |
| `availability_message_template` | text, not null | sold-out / inquiry template, see Section 11.2 |
| `invoice_message_template` | text, not null | text-invoice template sent via WhatsApp after a sale is recorded, see Section 11.2 |
| `updated_at` | timestamptz, not null, default `now()` | |
| `updated_by` | uuid, FK → `admin_access_token.id`, nullable | which access credential/device last edited settings; nullable only for the seeded initial row |

---

## 3. Relationships

- `Product` **belongs to** one `Brand`, one `Category` (both required — PRD Section 8 fields are non-optional).
- `Product` **has many** `ProductImage` (1-5, app-enforced), **has many** `InventoryTransaction`, **has many** `SaleItem`.
- `Sale` **has many** `SaleItem`; `SaleItem` **belongs to** one `Sale` and one `Product`.
- `InventoryTransaction` and `Sale` both **belong to** one `AdminAccessToken` (`created_by`); `Settings` **belongs to** one `AdminAccessToken` (`updated_by`, nullable) — every mutation is attributable to a device/credential, not a verified human identity (Section 7).
- No relation between `Product` and `AdminAccessToken` directly — products aren't "owned" by a credential, just audited via the ledger/sale tables.

`Category` and `Brand` have no FK to each other — flat, independent taxonomies per PRD Sections 9-10, matching the "category-agnostic" flexibility requirement in the design brief (Section 7).

---

## 4. Important Constraints

- `product.price >= 0`, `sale_item.unit_price >= 0`, `sale_item.subtotal >= 0` — no negative money.
- `inventory_transaction.quantity > 0` and `sale_item.quantity > 0` — direction is carried by `type`/context, never by a signed quantity (avoids sign-error bugs at the query layer).
- `product.cached_stock >= 0` — DB-level backstop for the "stock must never go negative" rule (PRD Section 11), enforced in the same transaction that inserts an `OUT` row (Section 5.3).
- `sale.payment_status IN ('PENDING', 'PAID')`, default `PENDING`; `sale.sale_status IN ('CONFIRMED', 'CANCELLED')`, default `CONFIRMED` — two independent CHECK-constrained fields, never combined into one status column (Section 6.3/6.4).
- `product_image` primary-image partial unique index (2.4.1) — at most one primary image per product.
- `product.slug`, `category.slug`, `brand.slug` unique — required for clean public URLs (`/produk/{slug}`).
- `settings.id` fixed to `1` — prevents a second settings row from ever being created (singleton enforced by CHECK, not just convention).
- All child FKs (`product.brand_id`, `product.category_id`, `sale_item.product_id`, `inventory_transaction.product_id`) are `ON DELETE RESTRICT` by default (not written explicitly above, but the intended default) — a `Brand`/`Category`/`Product` with history cannot be hard-deleted, only archived via `status = INACTIVE`. This matches PRD Section 8's "archive" language over "delete" and protects sales/inventory history from orphaning.

---

## 5. Inventory Calculation Model

### 5.1 Source of truth

`inventory_transaction` is the ledger and the source of truth, per PRD Section 11: `current_stock = SUM(IN) - SUM(OUT)`. This is append-only and never recalculated retroactively except by adding new offsetting rows.

### 5.2 Why a cached column too

Recomputing `SUM(...)` from the full transaction history on every product-detail read (public traffic, no auth, must be fast per NFR Section 19) doesn't scale cleanly and makes "prevent negative stock" hard to enforce as a simple DB constraint. `product.cached_stock` is a denormalized read-optimization, not a second source of truth.

### 5.3 Write path (application-transaction, not yet code)

Every stock mutation (a direct Stock In/Out from Inventory, or the stock-out rows generated by recording a Sale) happens inside one DB transaction that:

1. Inserts the `inventory_transaction` row(s).
2. Updates `product.cached_stock` by the same delta (`+quantity` for `IN`, `-quantity` for `OUT`).
3. Commits — the `CHECK (cached_stock >= 0)` constraint on `product` fails the whole transaction atomically if a stock-out would push it negative, satisfying "the system MUST prevent stock from becoming negative" without a separate pre-check query race condition.

### 5.4 Public availability state resolution

**Final decision (2026-09-01):** `is_manually_unavailable` is an internal operational control only. It never produces a third customer-facing state. Public presentation stays exactly two-state (Available / Stok Habis), matching `02-design-brief.md` Section 16 and `03-design-specification.md` Section 2.7 as originally written — no update to that document was needed.

Derived at read time, never stored as its own column (avoids a second source of truth alongside `cached_stock`/`is_manually_unavailable`):

```text
IF product.status = 'INACTIVE'                                   -> not returned by any public query at all (catalog visibility, Section 8)
ELSE IF product.is_manually_unavailable OR product.cached_stock = 0 -> "Stok Habis" (public label), CTA -> "Tanya Ketersediaan"
ELSE                                                               -> "Available" (public label: "Tersedia"), CTA -> "Pesan via WhatsApp"
```

The two causes of "Stok Habis" (`cached_stock = 0` vs. `is_manually_unavailable = true`) are deliberately collapsed into one public label and one CTA state — the customer has no way to distinguish an out-of-stock product from an admin-disabled one, by design. The admin UI (not yet designed) is where this distinction stays visible and actionable (e.g. an admin sees both `cached_stock` and the override toggle separately, even though the public site does not).

### 5.4a `product.status` — DRAFT considered and rejected (resolves audit Finding 3)

The audit flagged that `status` (`ACTIVE`/`INACTIVE`) risked conflating "archived after being live" with "never yet published." Resolved without a schema change: no `DRAFT` value is added. PRD Section 8 defines exactly the two values, and no requirement in `01`-`04` needs to distinguish the two cases in an admin list, filter, or report. `INACTIVE` means "not currently visible in the public catalog," covering both an admin still assembling a new product and a formerly-`ACTIVE` product that was archived — publishing status (`status`) stays independent of stock availability (`cached_stock`/`is_manually_unavailable`) exactly as already designed. If distinguishing "drafting" from "archived" ever becomes a real admin-UX requirement, that is a new column proposed as its own flagged decision at that time — full reasoning in `05-database-design.md` Section 3.4.

### 5.5 Reconciliation

`cached_stock` should always equal `SUM(inventory_transaction WHERE product_id = X)`. Since it's only ever mutated inside the same transaction as the ledger insert, drift should not occur under normal operation; an admin-facing "recalculate stock from ledger" maintenance action is a reasonable future safety net but is not required for MVP.

---

## 6. Sales / Inventory Interaction

### 6.1 Sale creation — inventory moves immediately, payment is separate

Recording a sale (PRD Section 12/12.1) is one application transaction that:

1. Inserts one `sale` row with `payment_status = 'PENDING'` (default), `sale_status = 'CONFIRMED'` (default), and a server-generated `invoice_number` (Section 6.1a) — every new sale starts here, unconditionally.
2. Inserts one `sale_item` row per line item, with `unit_price` snapshotted from `product.price` at that moment and `subtotal = quantity * unit_price`.
3. For each `sale_item`, inserts a matching `inventory_transaction` row with `type = OUT`, `quantity = sale_item.quantity`, `product_id = sale_item.product_id`, `note = "Sale {sale.id}"`.
4. Updates `product.cached_stock` for each affected product per Section 5.3.

**Inventory is reduced at sale creation, not at payment confirmation.** This matches the confirmed business flow (PRD Section 12.1): the seller confirms the order and stock commits to it before the customer has necessarily finished paying — a sale sitting at `payment_status = 'PENDING'` still holds its stock reservation via the already-recorded `OUT` transaction, exactly as if it were paid. There is no separate "reserve stock" vs. "commit stock" mechanism — recording the sale *is* committing the stock, unconditionally of payment state.

If any `OUT` insert would violate `cached_stock >= 0` (selling more than in stock), the entire sale transaction rolls back — no partial sale, no partial stock-out. The admin UI surfaces this as a validation error before commit is even attempted (client-side check against currently-known stock), with the DB constraint as the authoritative backstop against race conditions (e.g. two staff recording sales concurrently).

`sale_item` does not have a direct FK to `inventory_transaction` — the link is inferred by `product_id` + timestamp proximity + the `note` field. With `sale_item` now unique on `(sale_id, product_id)` (Section 2.7, 6.1b), this reconciliation is unambiguous: exactly one line item, and therefore exactly one `OUT` transaction, per product per sale — sufficient for MVP audit needs (PRD doesn't ask for a stronger join here) and avoids a schema column that exists only for traceability convenience.

**Lock ordering (resolves audit Finding 5):** when a sale has multiple line items, the server processes them in ascending `product_id` order before taking any row lock on `product.cached_stock`. Two concurrent sales touching the same two products always attempt to lock them in the same order, eliminating the classic deadlock pattern (transaction A holds X waiting for Y while transaction B holds Y waiting for X) rather than relying on Postgres's deadlock detector to abort one side afterward. This applies identically to cancellation (Section 6.4), which is also a multi-product write. No distributed lock, advisory lock, or new infrastructure is introduced — this is purely an ordering rule applied to an already-in-memory list of line items before the existing per-row `UPDATE` locking (Section 5.4) runs.

### 6.1a `invoice_number` generation

Server-generated at sale-creation time, inside the same transaction as the rest of Section 6.1 — never client-supplied, never editable afterward. Practical v1 strategy: a dedicated PostgreSQL sequence (`sales_invoice_seq`), formatted as `INV-{YYYY}-{sequence padded to 6 digits}` (e.g. `INV-2026-000042`), assigned as the column's `DEFAULT` expression so the database itself guarantees a gap-free-enough, monotonically increasing, collision-free number under concurrent inserts — no application-level "check if taken, retry" logic needed (a native Postgres sequence is atomic by construction, the lower-complexity choice over generating a random/UUID-derived number and handling collisions). `UNIQUE` at the DB level is the backstop even though the sequence already makes collision practically impossible. Full column/constraint detail lives in `05-database-design.md` Section 2.7.

### 6.1b Duplicate product lines — consolidation (resolves audit Finding 7)

A single sale may contain a given product only once, enforced by `sale_item`'s `UNIQUE (sale_id, product_id)` constraint (Section 2.7). If a request would otherwise produce two lines for the same product (e.g. an admin selected it twice before submitting), the server-side sale-creation code consolidates them into one line by summing quantity before insert — the combined quantity is what gets checked against `cached_stock` and what the resulting single `OUT` transaction moves. The `UNIQUE` constraint is the database-level backstop: a consolidation bug fails loudly (constraint violation, whole sale transaction rolls back) rather than silently inserting two conflicting rows. Duplicate product lines are not a supported input shape in v1 — they are normalized away before they reach the database, never stored as-is.

### 6.2 Full confirmed flow

```text
Customer order
    ↓
Seller confirms
    ↓
Sale created — invoice_number generated, sale_status = CONFIRMED, payment_status = PENDING
    ↓
Inventory OUT transaction recorded atomically with the sale (Section 6.1)
    ↓
Invoice text generated (includes invoice_number), sent manually via WhatsApp
    ↓
Customer transfers manually, sends proof via WhatsApp
    ↓
Seller verifies proof manually
    ↓
Admin marks payment_status = PAID — records paid_at, paid_by (Section 6.3)
```

### 6.3 `payment_status` — manual only, two states

`PENDING` → `PAID` is a single manual admin action, via `service_role`, gated by the same access-control middleware as every other admin mutation (Section 7):

```sql
UPDATE sale
SET payment_status = 'PAID', paid_at = now(), paid_by = :token_id
WHERE id = :sale_id AND payment_status = 'PENDING';
```

No code path sets `payment_status`, `paid_at`, or `paid_by` any other way:

- No automatic verification of any kind — no payment gateway, no bank API, no QRIS, no payment-proof upload, no OCR (PRD Section 12.1, Section 17 Excluded).
- No states beyond `PENDING`/`PAID` — no `REFUNDED`, `FAILED`, `PARTIAL`, `EXPIRED`, `WAITING_VERIFICATION`. If a future requirement genuinely needs one of these, that's a new decision at that time, not implied by anything currently approved.
- `payment_status` never influences inventory. Marking a sale `PAID` does not touch `cached_stock` or `inventory_transactions` — that already happened at sale creation (Section 6.1).
- `paid_at`/`paid_by` are set exclusively by this one guarded `UPDATE` — never independently settable, never editable after the fact (there is no "un-pay" operation).

### 6.4 `sale_status` and cancellation — separate axis, compensating restoration

`sale_status` (`CONFIRMED`/`CANCELLED`) is a distinct concept from `payment_status` — one tracks whether the order itself still stands, the other tracks whether money has been received for it. Cancelling a sale is only defined for the unpaid case (`payment_status = 'PENDING'`); cancelling an already-`PAID` sale is a refund scenario this system does not define (PRD Section 17 Excluded has no refund handling — out of scope, not silently assumed).

Cancelling an unpaid sale is one application transaction that:

1. Sets `sale.sale_status = 'CANCELLED'`, `cancelled_at = now()`, `cancelled_by = :token_id`.
2. Inserts a **compensating** `inventory_transaction` row per original `sale_item`: `type = 'IN'`, `quantity` matching the original `OUT`, `product_id` matching, `note = "Cancelled sale {sale.id}"`.
3. Updates `product.cached_stock` by the same `+quantity` delta per Section 5.3's write-path discipline.

`cancelled_at`/`cancelled_by` are set exclusively by this guarded transition, mirroring `paid_at`/`paid_by`'s treatment in Section 6.3 — both pairs exist specifically so these two important transitions keep their own attribution without a separate audit-log table (`05` §1.1 already rejected adding one; these four columns are the approved substitute for the sales-transition case specifically).

**The original `OUT` transaction is never deleted, edited, or reversed in place.** The ledger stays append-only and fully auditable (Section 5.1/12) — a cancelled sale leaves both the original stock-out and the compensating stock-in visible in `inventory_transactions` history, so an admin reviewing history sees exactly what happened and when, not a sale that silently never occurred.

---

## 7. Access Control Boundary (No Authentication)

**Superseded 2026-09-01 — this section replaces the Supabase-Auth-based design below it in this same document's history.** The business has explicitly confirmed neither the public catalog nor the internal panel will have any login/account/password/PIN flow. This is a deliberate business requirement, not an oversight, and is distinct from "no access control" — the internal panel still must not be an openly writable endpoint that anyone who finds the URL can mutate.

### 7.1 Decision

**Recommended mechanism: obscure admin path + one-time bootstrap capability token establishing a signed, `httpOnly` session cookie, backed by a small revocable token registry** (Option 4 of the access-control analysis performed this session; full comparison against three alternatives — path/token alone, Cloudflare Access, IP allowlisting — available in this session's discussion, summarized here).

**Superseded 2026-09-04 — moved off the admin subdomain to a static obscure path on the same hostname as the public site** (`docs/04-system-design.md`/`06-security.md` previously described `admin.{domain}` as a separate subdomain; that subdomain-based framing is retired below in favor of a path). The token/cookie/revocation mechanism itself is unchanged — only where the admin UI is reachable moved:

- The admin UI lives under a single obscure path, `/x7k9m2/*` (this document's fixed example path — actual production value is deployment configuration, not rotated), on the **same hostname** as the public site (`example.com/` for the storefront, `example.com/x7k9m2/*` for admin). There is no `admin.` subdomain and no separate hostname to configure.
- `/admin/*` is **not** the admin route — it does not exist as a page and returns the same generic 404 as any other invalid admin guess (Section 7.1's hardening bullet below), so it cannot become an alternate, unprotected admin entry point.
- **The obscure path is defense in depth only, not an authentication boundary.** It exists to reduce automated discovery/scanner noise against the admin surface — a bot enumerating `/admin`, `/wp-admin`, etc. won't stumble onto it. It grants no access by itself: visiting `/x7k9m2/` with no valid session cookie is exactly as unauthenticated as visiting `/admin/` was under the old subdomain design, and is rejected identically (generic 404, Section 7.1's hardening bullet). Anyone who learns the path still needs a valid, unrevoked, unexpired credential to do anything.
- The path is **static** — it does not rotate, and rotation is explicitly out of scope; obscurity is a minor speed bump against blind scanning, not the thing keeping the admin panel secure.
- A staff member is given a one-time bootstrap link (`/x7k9m2/access/{long-random-token}`). Visiting it validates the token against a server-side registry and, if valid, issues a signed `httpOnly`, `Secure`, `SameSite=Strict` cookie valid for a **fixed 30 days** (locked 2026-09-01 — not a range, not configurable per-credential), or a permanent credential's remaining lifetime, whichever the credential allows (`05-database-design.md` §2.1). No form is ever shown — not at bootstrap, not on any later visit. After 30 days the cookie is no longer accepted and the device must bootstrap again with a valid, unrevoked, unexpired credential.
- Every subsequent request under `/x7k9m2/*` is gated by middleware checking that cookie, server-side. No client-side-only gate. Revocation (setting `revoked_at`) invalidates the underlying credential — and therefore any session/cookie derived from it — immediately, on the credential's next request, independent of the 30-day cookie lifetime (Section 6.5 architectural note carried from `05-database-design.md` §17: the middleware re-checks `revoked_at`/`expires_at` against the database on every request, not just at bootstrap).
- Each staff member/device holds a distinct token row, so one lost phone or leaked link can be revoked without affecting anyone else or rotating a shared secret.
- Additional zero-cost hardening: generic 404 (not 403) on an invalid/expired token, missing cookie, or a guess at `/admin/*` so the surface doesn't confirm its own existence to a scanner; best-effort in-memory/edge rate limiting on repeated invalid attempts (v1 does not add an external rate-limiting service — see `06-security.md` §13 for the accepted limitation); `noindex` response metadata on the `/x7k9m2/*` route segment (Section 7.1a) — `robots.txt`/`Referrer-Policy` are courtesy signals to well-behaved crawlers, never treated as a security mechanism; structured logging of access attempts (success and failure) as a business-facing audit trail in place of the audit trail a login system would normally provide.

**Local development:** `http://localhost:3000/` for the public site, `http://localhost:3000/x7k9m2/` for admin, bootstrap at `http://localhost:3000/x7k9m2/access/<secret>`. The `admin.localhost:3000` subdomain form is retired — nothing in the running app depends on it.

#### 7.1a `noindex` on the admin path segment

Since admin now shares the public hostname, it can no longer rely on an entirely separate subdomain having no public inbound links. The `/x7k9m2` route segment sets `robots: { index: false, follow: false }` (Next.js metadata) so compliant crawlers are told not to index it — restated per Section 7.1's hardening bullet: this is a courtesy to well-behaved crawlers, not a security control, and grants no protection against a scanner or a person who already has the path.

### 7.2 Why not the alternatives

- **Bare capability URL (token permanently in the URL, no cookie):** rejected as the sole mechanism — leaks through browser history sync, `Referer` headers on any outbound link/asset, and server/proxy logs, with no per-device revocation.
- **Cloudflare Access (user-login mode):** rejected outright — an email magic-link/OTP is itself an authentication flow and would violate the "no login" requirement as stated.
- **Cloudflare Access (service-token mode) / IP allowlisting:** not rejected on security grounds, but not recommended as the primary mechanism — IP allowlisting is brittle for a small business owner working from mobile data or multiple locations (common with Indonesian residential/mobile IPs), and Cloudflare Access adds a second platform dependency for security equivalent to the cookie-based mechanism already chosen, working against PRD Section 18/G6's minimal-infrastructure goal. Either remains available later as an *additional* layer in front of the chosen mechanism if the threat model changes — not needed for MVP.

### 7.3 What this is not

This is access control, not authentication, by design: there is no username, no password, no PIN, no account creation, no "log in" screen a staff member interacts with in normal use. The bootstrap link is visited once (or once per cookie expiry); after that, the admin panel behaves exactly like an unauthenticated app to the person using it. The distinction matters for how this gets built — it must not silently grow into a login system (e.g. adding a password field to the bootstrap flow "for extra safety") without this being raised as a new, separate decision.

### 7.4 Scope boundary

Boundary is exactly the `/x7k9m2/*` path segment (2026-09-04: replacing the earlier separate-admin-subdomain framing — admin and public now share one hostname, distinguished by path rather than by host) — every request there is gated by the middleware in 7.1, never trusted from client state alone, and the path itself confers no trust (Section 7.1). No customer-facing access control exists or is needed — the public catalog remains fully open, no session concept of any kind (PRD Section 13, design brief Section 2/8).

Single access level for v1: any valid admin cookie can perform all admin operations (Product/Category/Brand/Inventory/Sales/Settings CRUD). PRD doesn't request role differentiation (e.g. "staff" vs "owner" with different permissions), and the new token registry doesn't currently carry a role/permission field — adding one now would be unrequested scope. If finer-grained permissions are needed later, that's a schema addition to the token registry at that time, not now.

### 7.5 Downstream impact — applied

This decision replaced the Supabase-Auth-based `admin_user`/`users` design (Section 2.8 of this document, formerly) with `admin_access_token` (Section 2.8, current) — a revocable per-device credential registry, not an identity table. `created_by` (on `inventory_transactions`/`sales`) and `updated_by` (on `settings`) attribute to the access credential/device that performed the action (business decision: device/token attribution, not free-text staff names — resolved and applied). `05-database-design.md` Section 11's admin write path is no longer RLS-`authenticated`-based (no request is ever `authenticated`, since no login flow exists): admin mutations run through server-side routes using the Supabase `service_role` key, gated by the Section 7.1 middleware; RLS for `anon`/`authenticated` grants no admin-table writes at all. Full schema detail and the end-to-end bootstrap → cookie → middleware → `service_role` flow are documented in `05-database-design.md` Sections 2.1, 11, and 17.

---

## 8. Public vs Admin Data Access

**"Admin" below means "request passed the Section 7 access-control middleware," not "authenticated user" — there is no login, so this distinction is enforced entirely by that middleware plus server-side routes using the `service_role` key (Section 7.5), not by Postgres RLS `authenticated`-role policies as an earlier draft of this document assumed.** Public read access is still enforced by RLS against the `anon` role, unaffected by this change.

| Table | Public read | Public write | Admin read | Admin write |
|---|---|---|---|---|
| `category` | Yes (all rows) | No | Yes | Yes |
| `brand` | Yes (all rows) | No | Yes | Yes |
| `product` | Yes, but via the `products_public` view (Section 8.1), not the base table — `is_manually_unavailable`/`cached_stock` are not columns of that view | No | Yes (all statuses, all columns, base table) | Yes |
| `product_image` | Yes (for visible products only, via join) | No | Yes | Yes |
| `inventory_transaction` | No | No | Yes | Yes |
| `sale` / `sale_item` | No | No | Yes | Yes |
| `admin_access_token` | No (never public-readable, under any circumstance) | No | Yes (list/revoke tokens) | Yes (issue/revoke tokens) — no self-service "admin manages admins" UI beyond this token list is requested |
| `settings` | **No direct table read** — only the specific fields needed (`whatsapp_number` + resolved message text) are exposed through a narrow public read path (a view or a server-only helper that renders the WhatsApp link), never the raw table | No | Yes | Yes |

The `settings` row-level restriction matters: `settings` will later hold only these three fields, so exposing the whole row is low-risk today, but the access pattern (narrow computed exposure, not raw table grant) is set now so it doesn't need revisiting if `settings` grows fields that aren't meant for the client (NFR Section 19: "sensitive configuration must not be exposed to the client").

`product.status = INACTIVE` products are invisible to public queries at the query-builder level (a `WHERE status = 'ACTIVE'` clause baked into every public product query/view), not filtered client-side — PRD Section 8/14 requires this to be a hard boundary, not a UI hide.

### 8.1 `products_public` view — explicit public data boundary (resolves audit Finding 6)

The audit correctly identified that RLS alone only governs row visibility, not column visibility — `is_manually_unavailable`/`cached_stock` were readable at the row level even though the public UI never displayed them, leaving the column boundary dependent on every route remembering not to over-select. Resolved by introducing `products_public`, a database view exposing only the columns the public catalog needs plus one derived boolean (`is_available`, computed from the Section 5.4 resolution logic) — `is_manually_unavailable` and `cached_stock` are not columns of this view at all, not masked. All public read paths (catalog listing, search, product detail, pagination) query this view; the admin path continues to query the base `product` table directly via `service_role`, since admin code needs the real operational columns. Full view definition and RLS interaction lives in `05-database-design.md` Section 11.1a.

---

## 9. Pagination Strategy

Cursor-based keyset pagination for the public catalog "Load More" (locked decision, Section 03-design-specification.md 2.2).

- Sort order: `created_at DESC, id DESC` (id as tiebreaker for rows with identical timestamps — guarantees a total order, which offset pagination and a `created_at`-only sort both lack).
- Cursor shape: opaque, base64-encoded JSON `{ "created_at": "...", "id": "..." }`, returned by the API alongside each page and passed back by the client to fetch the next batch. Never a raw offset integer (offset breaks under concurrent inserts; PRD/design brief don't need arbitrary jump-to-page).
- Query shape: `WHERE (created_at, id) < (:cursor_created_at, :cursor_id) ORDER BY created_at DESC, id DESC LIMIT :page_size`.
- `has_more` determined by fetching `page_size + 1` rows and checking if the extra row exists, rather than a separate `COUNT(*)` query (cheaper, avoids a second full-table scan).
- Applies identically whether filters (category/brand/availability) or search are active — the cursor is scoped to the filtered/searched result set, not the whole catalog.
- No numbered pagination, no infinite scroll (locked decision) — the "Load More" button is the only trigger that requests the next page.

---

## 10. Search Strategy

Plain Postgres `ILIKE`/`OR` across joined tables for v1 (locked decision), matching PRD's cost/simplicity goal (G6) and explicitly deferring specialized search infra.

```sql
-- shape, not final SQL
SELECT product.*
FROM product
JOIN brand ON brand.id = product.brand_id
JOIN category ON category.id = product.category_id
WHERE product.status = 'ACTIVE'
  AND (
    product.name ILIKE '%' || :query || '%'
    OR brand.name ILIKE '%' || :query || '%'
    OR category.name ILIKE '%' || :query || '%'
  )
ORDER BY product.created_at DESC, product.id DESC
```

- No `pg_trgm`, no external search service (Algolia/Meilisearch/Elasticsearch) — explicitly out of scope for v1 per the locked decision and PRD G6 (avoid unnecessary infrastructure).
- At catalog sizes implied by "curated" (tens to low hundreds of products, not tens of thousands), unindexed `ILIKE` on a small joined set is fast enough; a plain B-tree index on `product.name`/`brand.name`/`category.name` doesn't even help `ILIKE '%...%'` (leading wildcard), so no index is added speculatively for a query pattern that wouldn't benefit from one. If catalog scale or query latency later demands it, `pg_trgm` + a GIN trigram index is the documented upgrade path — not built now.
- Search and category/brand/availability filters compose with plain `AND` — a search term narrows whatever the active filters already narrowed.

---

## 11. Settings / Configuration Strategy

### 11.1 Singleton table

`settings` is a single-row table (`id` fixed to `1` via CHECK constraint, Section 4) rather than a generic key-value config table. A key-value table would be more "flexible" but there are exactly three known fields today (PRD Section 7, design spec decision 6) — building a generic settings engine for three fields is speculative flexibility this project doesn't need yet. If a fourth genuinely independent setting shows up later, it's one migration to add a column; that's cheaper than a KV abstraction paid for upfront.

### 11.2 Message templates

Both templates are plain text with `{placeholder}` tokens, resolved server-side (or in a shared utility, but never re-implemented per-component) before being URL-encoded into the `wa.me` link:

- `order_message_template` placeholders: `{brand}`, `{product_name}`, `{price}`, `{qty}`.
- `availability_message_template` placeholders: `{brand}`, `{product_name}` (no `{price}`/`{qty}` — an availability inquiry isn't placing an order). **Single template, used for every "Stok Habis" product regardless of cause** (stock-depleted or manually-unavailable) — the customer-facing message never distinguishes the two, matching the collapsed public state in Section 5.4. No separate "sold out" vs. "temporarily unavailable" template exists or is planned.
- `invoice_message_template` placeholders (added — resolves audit Finding 2): `{invoice_number}`, `{customer_name}`, `{item_list}` (a server-rendered multi-line block, one line per sale item), `{subtotal}`, `{shipping_cost}`/`{other_cost}` (resolve to empty/zero — no corresponding schema field exists, this is template-text flexibility only, not a recorded amount), `{total}`. Full placeholder/substitution detail in `05-database-design.md` Section 7.2.

Default seed values match the copy already given in PRD Section 7 / design spec Section 2.6, editable by admin afterward — not hardcoded into any UI component (locked decision 1 and 6). The WhatsApp CTA component (Section 03-design-specification.md 2.6) receives the already-resolved message string and the number as props/config; it contains no template logic itself.

### 11.3 Access

Read: admin settings page (full row) and a narrow public-facing resolver (Section 8) that only ever emits a finished `wa.me` URL, never the raw templates or number as separately queryable public data beyond what's already visible inside that URL.
Write: admin only, via the admin Settings page — no public write path exists.

---

## 12. Explicitly Deferred (not designed here)

- Admin UI layout/components (brief Section 23 — designed after public site, still not reached).
- Exact Supabase RLS policy SQL (approach stated in Section 8, policies themselves are implementation, not design).
- Image upload/resize/transform pipeline mechanics (transform-on-upload vs. on-read, thumbnail generation) — **bucket access policy itself is no longer deferred**, resolving audit Finding 1: bucket visibility, object path convention, read/write/delete policy, file type/size limits, and replace behavior are specified in `05-database-design.md` Section 4a and `06-security.md` Section 9.
- Any role beyond a single flat "admin" role (Section 7).
- Migrations and actual DDL execution (explicitly out of scope per this task's instructions).
