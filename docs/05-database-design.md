# Database Design Specification

## Curated Product Catalog & Inventory Website — Exact PostgreSQL/Supabase Data Model

**Document:** 05-database-design.md
**Version:** 1.6 — Architecture audit resolution pass: Storage bucket policy specified (Section 4a); `settings.invoice_message_template` added (Section 2.9, 7.2); `sale_items` unique on `(sale_id, product_id)` to reject duplicate product lines (Section 2.8, 6.1b); deterministic lock ordering documented for multi-item sales (Section 6.2); explicit public-columns view (`products_public`) replaces reliance on app-layer masking alone (Section 11.1a); `products.status` DRAFT question resolved without a schema change (Section 3.4)
**Status:** Draft
**Date:** 2026-09-01
**Source of truth:** `01-product-requirements.md`, `02-design-brief.md`, `03-design-specification.md`, `04-system-design.md`

No migrations, no application code in this document. All DDL below is a design sketch for review, not a migration file.

**Naming note:** `04-system-design.md` used singular table names (`product`, `category`, `admin_user`, ...). This document adopts the plural names given in this task's instructions (`users`, `categories`, `brands`, `products`, `product_images`, `inventory_transactions`, `sales`, `sale_items`, `settings`) as the final naming convention — Supabase/PostgreSQL community convention favors plural table names, and this is treated as an explicit naming refinement directed by this task, not a silent resolution of a design contradiction. No entity, column, or relationship from `04-system-design.md` changes meaning, only table names pluralize.

Exactly 9 tables, matching the approved list. No table added beyond it (see Section 1.1 for one flagged consideration that was deliberately rejected).

---

## 1. Entity Relationship Model

```text
admin_access_tokens (no Supabase Auth — per-device credential registry, 04-system-design.md Section 7)
      │
      ├──< inventory_transactions.created_by
      ├──< sales.created_by
      ├──< sales.paid_by
      ├──< sales.cancelled_by
      └──< settings.updated_by

categories ──┐
             │
brands ──────┼──< products >── product_images
             │        │
             │        ├──< inventory_transactions
             │        │
             │        └──< sale_items >── sales

settings (singleton, one FK to admin_access_tokens for updated_by)
```

Nine tables. `categories` and `brands` have no relation to each other (flat, independent taxonomies — PRD Sections 9-10, design brief Section 7 category-agnostic requirement). `admin_access_tokens` replaces the earlier Supabase-Auth-backed `users` table (v1.1) — it has no relation to any Supabase `auth.users` table because no login flow exists (`04-system-design.md` Section 7).

### 1.1 Flagged: table NOT added

A `sale_item_inventory_transaction` join table (linking each `sale_items` row to the exact `inventory_transactions` row it generated) was considered for stronger auditability. Rejected: `04-system-design.md` Section 6 already resolves this link by `product_id` + timestamp proximity + a `note` referencing the sale id, which satisfies PRD's audit requirements without a tenth table. Flagging this explicitly per this task's instruction rather than adding it silently.

---

## 2. Exact Table Specifications

Conventions applied to every table unless noted otherwise:
- Primary key: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()` (requires the `pgcrypto` extension, standard on Supabase).
- All `CHECK`/`UNIQUE`/`FOREIGN KEY` constraints are named explicitly at migration time (sketched here unnamed for readability).
- `status`/`type` fields use `text` + `CHECK (... IN (...))` rather than native PostgreSQL `ENUM` types — enum types require `ALTER TYPE ... ADD VALUE` (which cannot run inside a transaction pre-PG12 and still has edge cases with concurrent use) to add a value later; a `CHECK` constraint is a plain migration. This is the one deliberate deviation from `04-system-design.md`'s loose `enum product_status` phrasing — same behavior, safer evolution path, flagged here rather than silently applied.

### 2.1 `admin_access_tokens`

Replaces the Supabase-Auth-backed `users` table from v1.1, per `04-system-design.md` Section 7 (no login/account/password/PIN, ever). This table is a **revocable per-device credential registry**, not a user/account table — a row identifies a registered access credential (e.g. "Owner's Phone"), not a cryptographically verified human identity. See Section 17 for the full bootstrap-to-cookie-to-mutation flow this table supports.

| Column | Type | Null | Default | Key | Purpose |
|---|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK | Referenced by `created_by`/`updated_by` elsewhere for attribution |
| `label` | `text` | NOT NULL | — | | Human-readable device/credential name, e.g. `"Owner's Phone"`, `"Store Laptop"`, `"Admin Phone 1"` — admin-entered at issuance, purely descriptive |
| `token_hash` | `text` | NOT NULL | — | UNIQUE | SHA-256 (or equivalent) hash of the bootstrap secret; the plaintext secret is shown once at issuance and never stored |
| `created_at` | `timestamptz` | NOT NULL | `now()` | | When this credential was issued |
| `expires_at` | `timestamptz` | NOT NULL | — | | Hard expiry (e.g. `created_at + 90 days`); past this, the credential is invalid regardless of `revoked_at` — forces periodic re-bootstrap rather than indefinite validity |
| `revoked_at` | `timestamptz` | NULL | — | | Set when an admin manually revokes this credential (lost device, staff departure); `NULL` = not revoked |

A credential is valid only when `revoked_at IS NULL AND expires_at > now()` — checked on every admin request by the access-control middleware (Section 18), not just at bootstrap time, so a mid-session revocation takes effect immediately rather than waiting for the cookie to expire.

**No `name`/`email`/identity fields** — deliberately, per the task's distinction: this registers *a device/credential*, not *a person*. If the business later wants to know who physically used a shared device, that's a free-text field on the mutation itself (e.g. a `note`), not an identity system layered onto this table.

### 2.2 `categories`

| Column | Type | Null | Default | Key | Purpose |
|---|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK | |
| `name` | `text` | NOT NULL | — | | Display name |
| `slug` | `text` | NOT NULL | — | UNIQUE | URL segment, `/kategori/{slug}` |
| `status` | `text` | NOT NULL | `'ACTIVE'` | CHECK (`status IN ('ACTIVE','INACTIVE')`) | Soft archive state, see Section 3.3 |
| `created_at` | `timestamptz` | NOT NULL | `now()` | | |

### 2.3 `brands`

| Column | Type | Null | Default | Key | Purpose |
|---|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK | |
| `name` | `text` | NOT NULL | — | | Display name |
| `slug` | `text` | NOT NULL | — | UNIQUE | URL segment / filter value |
| `status` | `text` | NOT NULL | `'ACTIVE'` | CHECK (`status IN ('ACTIVE','INACTIVE')`) | Soft archive state, see Section 3.3 |
| `created_at` | `timestamptz` | NOT NULL | `now()` | | |

Same `text` + `CHECK` pattern as `products.status` (Section 2 preamble reasoning: avoids native `ENUM` `ALTER TYPE` friction). Not a shared/reused enum type across tables — each table's `CHECK` is independent, so `categories`/`brands`/`products` could in principle diverge in allowed values later without a cross-table migration; today they intentionally use the identical two values.

### 2.4 `products`

| Column | Type | Null | Default | Key | Purpose |
|---|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK | |
| `name` | `text` | NOT NULL | — | | Product title |
| `slug` | `text` | NOT NULL | — | UNIQUE | `/produk/{slug}` |
| `brand_id` | `uuid` | NOT NULL | — | FK → `brands(id)` ON DELETE RESTRICT | |
| `category_id` | `uuid` | NOT NULL | — | FK → `categories(id)` ON DELETE RESTRICT | |
| `description` | `text` | NULL | — | | Optional long-form copy |
| `price` | `numeric(12,2)` | NOT NULL | — | CHECK (`price >= 0`) | IDR unit price, see Section 13 |
| `status` | `text` | NOT NULL | `'ACTIVE'` | CHECK (`status IN ('ACTIVE','INACTIVE')`) | **Catalog visibility** — PRD Section 8 |
| `is_manually_unavailable` | `boolean` | NOT NULL | `false` | | **Internal-only** operational override, see Section 3.2 |
| `cached_stock` | `integer` | NOT NULL | `0` | CHECK (`cached_stock >= 0`) | Denormalized ledger total, see Section 5 |
| `created_at` | `timestamptz` | NOT NULL | `now()` | | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | | Maintained by trigger (Section 14) |

### 2.5 `product_images`

| Column | Type | Null | Default | Key | Purpose |
|---|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK | |
| `product_id` | `uuid` | NOT NULL | — | FK → `products(id)` ON DELETE CASCADE | |
| `url` | `text` | NOT NULL | — | | Supabase Storage object path (not a bare filename — see Section 4a for the path convention and bucket policy) |
| `alt_text` | `text` | NULL | — | | Falls back to `"{brand} {product name}"` at render time if null |
| `sort_order` | `smallint` | NOT NULL | `0` | CHECK (`sort_order >= 0`) | Gallery display order, 0 = first |
| `is_primary` | `boolean` | NOT NULL | `false` | | Card thumbnail selector |
| `created_at` | `timestamptz` | NOT NULL | `now()` | | |

Constraints (see Section 4 for full reasoning):
- `CREATE UNIQUE INDEX ON product_images (product_id) WHERE is_primary = true;` — at most one primary image per product.
- 1-5 images per product: **not** a table-level constraint, see Section 4.

### 2.6 `inventory_transactions`

| Column | Type | Null | Default | Key | Purpose |
|---|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK | |
| `product_id` | `uuid` | NOT NULL | — | FK → `products(id)` ON DELETE RESTRICT | |
| `type` | `text` | NOT NULL | — | CHECK (`type IN ('IN','OUT')`) | |
| `quantity` | `integer` | NOT NULL | — | CHECK (`quantity > 0`) | Direction from `type`, never a signed number |
| `note` | `text` | NULL | — | | Free-text reason/reference (e.g. `"Sale {sale_id}"`) |
| `created_by` | `uuid` | NOT NULL | — | FK → `admin_access_tokens(id)` ON DELETE RESTRICT | Which access credential/device performed this mutation — device attribution, not verified human identity (Section 2.1) |
| `created_at` | `timestamptz` | NOT NULL | `now()` | | |

Append-only. No `UPDATE`/`DELETE` in normal operation (Section 12).

### 2.7 `sales`

| Column | Type | Null | Default | Key | Purpose |
|---|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK | |
| `invoice_number` | `text` | NOT NULL | see Section 6.1a | UNIQUE | Server-generated at creation, human-readable, stable for the sale's lifetime — never client-suppliable |
| `customer_name` | `text` | NULL | — | | |
| `customer_phone` | `text` | NULL | — | | |
| `note` | `text` | NULL | — | | |
| `payment_status` | `text` | NOT NULL | `'PENDING'` | CHECK (`payment_status IN ('PENDING','PAID')`) | Manual-only field, see Section 6.3 — never set by any automated process |
| `paid_at` | `timestamptz` | NULL | — | | Set only by the `PENDING`→`PAID` transition (Section 6.3); `NULL` while `PENDING` |
| `paid_by` | `uuid` | NULL | — | FK → `admin_access_tokens(id)` ON DELETE RESTRICT | Which access credential made the `PAID` transition |
| `sale_status` | `text` | NOT NULL | `'CONFIRMED'` | CHECK (`sale_status IN ('CONFIRMED','CANCELLED')`) | Order lifecycle, deliberately independent of `payment_status` — see Section 6.4 |
| `cancelled_at` | `timestamptz` | NULL | — | | Set only by the cancellation transition (Section 6.4); `NULL` while `CONFIRMED` |
| `cancelled_by` | `uuid` | NULL | — | FK → `admin_access_tokens(id)` ON DELETE RESTRICT | Which access credential cancelled this sale |
| `created_by` | `uuid` | NOT NULL | — | FK → `admin_access_tokens(id)` ON DELETE RESTRICT | Which access credential/device recorded this sale |
| `created_at` | `timestamptz` | NOT NULL | `now()` | | |

Additional table-level `CHECK` constraints tie each pair to its governing status, enforced by the database rather than trusted to application code:

```sql
CHECK ( (payment_status = 'PENDING' AND paid_at IS NULL AND paid_by IS NULL)
     OR (payment_status = 'PAID'    AND paid_at IS NOT NULL AND paid_by IS NOT NULL) )

CHECK ( (sale_status = 'CONFIRMED' AND cancelled_at IS NULL AND cancelled_by IS NULL)
     OR (sale_status = 'CANCELLED' AND cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL) )
```

`payment_status` and `sale_status` are two independent `CHECK`-constrained columns, not one combined status enum — a sale is `CONFIRMED`+`PENDING` (normal in-progress), `CONFIRMED`+`PAID` (done), or `CANCELLED`+`PENDING` (Section 6.4's only defined cancellation path). `CANCELLED`+`PAID` is not modeled — cancelling a paid sale is a refund scenario, explicitly out of scope (PRD Section 17 Excluded).

`paid_at`/`paid_by` and `cancelled_at`/`cancelled_by` are the approved substitute for a separate audit-log table on these two specific transitions (`05` §1.1 already rejected adding one generally) — both pairs are written exclusively by the two guarded `UPDATE`s in Section 6.3/6.4, never independently client-settable.

### 2.8 `sale_items`

| Column | Type | Null | Default | Key | Purpose |
|---|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK | |
| `sale_id` | `uuid` | NOT NULL | — | FK → `sales(id)` ON DELETE CASCADE | |
| `product_id` | `uuid` | NOT NULL | — | FK → `products(id)` ON DELETE RESTRICT | |
| `quantity` | `integer` | NOT NULL | — | CHECK (`quantity > 0`) | |
| `unit_price` | `numeric(12,2)` | NOT NULL | — | CHECK (`unit_price >= 0`) | **Snapshot** of `products.price` at sale time, see Section 6 |
| `subtotal` | `numeric(12,2)` | NOT NULL | — | CHECK (`subtotal >= 0`) | App-computed `quantity * unit_price`, stored plainly (not a generated column — kept identical to `04-system-design.md`'s explicit choice; a `GENERATED ALWAYS AS` column was considered and is flagged as a possible future refinement, not adopted here to avoid silently overriding the prior document) |

**Constraint (resolves audit Finding 7 — duplicate product lines):** `UNIQUE (sale_id, product_id)`. A single sale may contain a given product only once. See Section 6.1b for the required application-side consolidation behavior this constraint backstops.

### 2.9 `settings`

| Column | Type | Null | Default | Key | Purpose |
|---|---|---|---|---|---|
| `id` | `smallint` | NOT NULL | `1` | PK, CHECK (`id = 1`) | Singleton enforcement, see Section 7 |
| `whatsapp_number` | `text` | NOT NULL | — | | E.164 format |
| `order_message_template` | `text` | NOT NULL | — | | Placeholders: `{brand} {product_name} {price} {qty}` |
| `availability_message_template` | `text` | NOT NULL | — | | Placeholders: `{brand} {product_name}` — single template for all "Stok Habis" cases |
| `invoice_message_template` | `text` | NOT NULL | — | | Multi-line invoice text sent manually via WhatsApp after a sale is recorded, see Section 7.2 for placeholders and substitution rules |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | | |
| `updated_by` | `uuid` | NULL | — | FK → `admin_access_tokens(id)` ON DELETE RESTRICT | Which access credential/device last edited settings; nullable only to cover the seeded initial row (Section 15), never set to `NULL` by an application update |

---

## 3. Products

### 3.1 Field coverage

All required fields present per PRD Section 8 and design spec: `name`, `slug`, `brand_id`, `category_id`, `description`, `price`, `status`, `created_at`, `updated_at` — plus the two operational additions justified below.

### 3.2 Manual availability override

`is_manually_unavailable boolean` is internal-only, per the locked decision. It is never queried or exposed on any public route as its own field or state — the public API/view only ever returns a resolved two-value label. Resolution logic (unchanged from `04-system-design.md` Section 5.4, restated here for the database document's completeness):

```text
public_available = (products.status = 'ACTIVE')
                    AND NOT products.is_manually_unavailable
                    AND products.cached_stock > 0

-- products.status = 'INACTIVE'  -> row excluded entirely from public queries (not a label, a WHERE clause)
-- public_available = true       -> "Available" / "Pesan via WhatsApp"
-- public_available = false      -> "Stok Habis" / "Tanya Ketersediaan"
```

This can be expressed as a plain boolean expression in the public product query/view (Section 11) — no stored generated column needed, since it's cheap to compute and must never leak `is_manually_unavailable` as a separately inspectable field to public clients (a generated column would still be a column a public `SELECT *` could expose by accident; keeping it as a query-time expression in the public view is the safer default).

### 3.3 Category / Brand status field

`categories.status` and `brands.status` (`ACTIVE` / `INACTIVE`, default `ACTIVE`) resolve the archive gap flagged in `05-database-design.md` v1.0's consistency check, per the approved option (a).

**Allowed values / default:** `ACTIVE`, `INACTIVE`; `CHECK (status IN ('ACTIVE','INACTIVE'))`; defaults to `ACTIVE` on insert, matching `products.status`'s pattern exactly.

**Public visibility behavior:** the public category/brand filter lists (`03-design-specification.md` Section 2.4) query `WHERE status = 'ACTIVE'` only — an archived category/brand disappears from public filter options immediately. Products that still reference an archived category/brand are **not** hidden or altered by this — a product's own `products.status` is the only thing that controls its public catalog visibility (Section 3.2); an archived category is purely a filter-list exclusion, not a cascading product-visibility rule. This keeps the two concerns (product visibility vs. taxonomy-entry visibility) independent, matching how `products.status` and category/brand were already designed as unrelated axes in `04-system-design.md`.

**Admin behavior:**
- `ACTIVE` categories/brands appear in the product-create/edit selection dropdown and can be assigned to new or edited products.
- `INACTIVE` categories/brands are **excluded from the product create/edit selection list** — cannot be newly assigned — but a product that already references one keeps displaying it normally in the admin product list/detail (no forced reassignment, no broken reference).
- Admin UI uses "Archive" / "Restore" as the action labels (never "Delete") for both `categories` and `brands`, since a hard `DELETE` is never issued by the application against either table once this status field exists — "Archive" sets `status = 'INACTIVE'`, "Restore" sets it back to `'ACTIVE'`, both plain `UPDATE`s, not `DELETE`s.

**Relationship / deletion behavior:** `products.brand_id`/`products.category_id` remain `ON DELETE RESTRICT` (Section 12) — this is now a pure safety backstop against an accidental direct `DELETE`, not the primary archive mechanism anymore. The application never attempts to `DELETE` a `categories`/`brands` row that has any `products` referencing it (or, in practice, never attempts to `DELETE` a `categories`/`brands` row at all — archive via `status` fully replaces delete as the admin-facing operation, matching PRD Sections 9-10's "Delete/archive" requirement through archival). Historical `products`, `sale_items`, and `inventory_transactions` referencing an archived category/brand (via the product) remain fully intact and unaffected — nothing about this status field touches those tables.

### 3.4 `products.status` — DRAFT considered and rejected (resolves audit Finding 3)

An earlier pass of this document (Section 4, the 1-image-minimum note) loosely described a product being edited with zero images as existing in an "`INACTIVE`/draft state," which read as if `INACTIVE` carries two different meanings (archived-after-being-live vs. never-yet-published). That wording is imprecise, not a schema decision — restated precisely here:

- **No `DRAFT` value is added.** PRD Section 8 defines exactly two product statuses, `ACTIVE`/`INACTIVE`, and nothing in `01`-`04` describes a workflow that requires distinguishing "never published" from "was published, now archived" as separate states — no admin list, filter, or report is specified anywhere that needs to tell them apart. Adding a third value would be exactly the kind of unrequested schema expansion this project's standing rule (Section 15 of the PRD, "do not invent business requirements") warns against.
- **What `INACTIVE` actually means, precisely:** "not currently visible in the public catalog," full stop — covering both a product an admin is still assembling (incomplete fields, fewer than the eventual image count) and a product that was once `ACTIVE` and has since been archived. The two cases are administratively identical from the database's point of view: neither is publicly queryable (Section 3.2's `WHERE status = 'ACTIVE'` boundary), and an admin distinguishes them, if at all, by inspection (e.g. an `INACTIVE` product with `created_at` far in the past and a full field set reads as "archived"; one just created with missing fields reads as "still being drafted") rather than by a stored flag.
- **Publishing status stays independent of stock availability**, unchanged from Section 3.2/5.4 — `status` gates catalog visibility, `cached_stock`/`is_manually_unavailable` gate the resolved availability label, and this decision does not touch that separation.
- **If this ever becomes a real requirement** (e.g. the admin product list needs a "Drafts" view distinct from "Archived"), that is a new column (most likely a boolean, since it is orthogonal to `status`, not a third `status` value) added at that time as its own flagged schema decision — not something this document adds speculatively now.

---

## 4. Product Images

`product_images` as specified (Section 2.5). The 1-5 image bound:

- **Not enforced by a table CHECK** — Postgres cannot express "at most 5 rows referencing this FK" as a column-level or table-level constraint; the mechanism would be a trigger (`AFTER INSERT` on `product_images`, `SELECT COUNT(*)` and raise an exception past 5) or a deferred constraint trigger.
- **Decision: enforce in the application layer** (admin upload flow rejects a 6th image, disables the upload control at 5). This matches `04-system-design.md` Section 2.4.1's stance and this task's own instruction to avoid unnecessary DB complexity when app-layer enforcement is sufficient — a trigger here guards against a scenario (direct SQL bypassing the app) that doesn't exist in this system's threat model (only the admin app writes to this table, behind RLS in Section 11).
- **What the DB does enforce:** the primary-image partial unique index (at most one `is_primary = true` per product) and `sort_order >= 0`, `product_id NOT NULL` — real relational integrity, not a business-rule count.
- A minimum of 1 image (a product must have at least one) is also an application-layer rule (enforced at product-publish time — a product can exist with zero images while an admin is still assembling it, before it is ever made `ACTIVE`), not a DB constraint — a `CHECK` can't reach across tables to require "at least one child row exists." (See Section 3.4 for why this in-progress state stays `INACTIVE` rather than getting its own `products.status` value.)

---

## 4a. Storage Policy (Supabase Storage — resolves audit BLOCKER Finding 1)

`product_images.url` (Section 2.5) points into a Supabase Storage bucket. Every other table in this document has an exhaustively specified RLS policy (Section 11); this section gives Storage the same rigor, since a public catalog with public product photography is exactly the kind of surface that gets improvised wrong under time pressure. Full security rationale (threat model, why no direct browser upload) lives in `06-security.md` Section 9 — this section is the schema-adjacent policy decision itself.

### 4a.1 Bucket

One bucket, `product-images`, marked **public** (public read) at the Supabase Storage bucket-configuration level — not gated by a `storage.objects` RLS `SELECT` policy for `anon`, since the bucket's own public flag is the simpler, equivalent mechanism for "every object in this bucket is public data" (product photography carries no per-object visibility rule the way `products.status = ACTIVE` gates row visibility — an uploaded image is public as soon as it exists, matching Section 11.1's product-image join-based public policy at the database-row level for `product_images.url` references, independent of the file itself).

### 4a.2 Object path convention

```text
product-images/{product_id}/{uuid}.{ext}
```

- `{product_id}` — the owning product's UUID, giving every object a natural, collision-free namespace and making "all images for this product" a simple prefix list if ever needed outside the `product_images` table.
- `{uuid}` — a fresh server-generated UUID per file, never derived from the original filename. This closes path-traversal (`../`) and filename-collision/overwrite risk structurally: the client's filename is never part of the stored path.
- `{ext}` — derived from the validated MIME type (Section 4a.5), not from the client-supplied filename's extension (a client could name a `.php` file `photo.jpg`; the extension written to Storage matches what the server actually verified the bytes to be).

### 4a.3 Read policy

**Public, unconditional, no upload/update/delete.** Anyone (public catalog visitor or admin) can `GET` an object's public URL directly — this matches `product_images`' own public-read RLS policy (Section 11.1) and PRD's requirement that product photos render on the public catalog with no authentication. No public write policy of any kind exists on this bucket.

### 4a.4 Write policy (upload / replace / delete)

**Admin-only, and never directly from the browser.** All three operations (upload, replace, delete) are performed exclusively by a server-side admin route/action (the same `service_role`-gated boundary as every other admin mutation, `04` Section 7.5 / `06-security.md` Section 4) — there is no Supabase Storage RLS policy granting `anon` or any client-side key `INSERT`/`UPDATE`/`DELETE` on `storage.objects` for this bucket, and the admin browser is never handed a client-side upload token. The file passes through server code before it ever reaches Storage, which is what makes the validation below enforceable at all — a direct browser-to-Storage upload would have no server-side checkpoint to validate through.

### 4a.5 File type restrictions

Server-side allow-list validated against the file's actual bytes (magic-byte/MIME sniffing), never the client-supplied `Content-Type` header alone (attacker-controlled): `image/jpeg`, `image/png`, `image/webp` only. Anything else is rejected before the upload call to Storage is ever made.

### 4a.6 File size restrictions

Server-enforced maximum of **5 MB per image**, rejected before the Storage call — bounds storage cost on Supabase's free/low tier and rules out a trivial large-file abuse vector, consistent with PRD G6's minimal-infrastructure-cost goal.

### 4a.7 Replacement behavior — old object deletion

Replacing an image (admin swaps one of a product's existing 1-5 images) is one server-side operation that:

1. Uploads the new file to a fresh path (Section 4a.2 — a new UUID, not a reused one).
2. Updates the corresponding `product_images.url` row to the new path (same `id`, same `sort_order`/`is_primary` unless the admin also changed those).
3. Deletes the old Storage object at the previous path, **after** step 2 commits — upload-then-delete, not delete-then-upload, so a mid-operation failure never leaves a product with a broken image reference pointing at nothing. If the delete in step 3 fails (e.g. a transient Storage error), the operation is still considered successful (the DB row already points at the new, live image) and the orphaned old object is logged as a cleanup item rather than failing the whole admin action — a stray unreferenced file costs a few KB of storage and is not a correctness problem, whereas failing the visible edit over a cleanup step would be a worse trade for this system's scale.

### 4a.8 What this section does not add

No signed/expiring URLs (public data doesn't need them), no per-product-image RLS policy beyond the bucket-level public/admin-only split (a finer-grained policy would be speculative complexity for data that is uniformly public-read, admin-write), no image transformation/resize pipeline (still explicitly deferred, `04-system-design.md` Section 12 — this section specifies *access control*, not *processing*).

---

## 5. Inventory Model

### 5.1 Invariant

```text
cached_stock = SUM(quantity WHERE type = 'IN') - SUM(quantity WHERE type = 'OUT')
```

`inventory_transactions` is the immutable ledger and source of truth. `products.cached_stock` is a denormalized read-optimization that must always equal the ledger sum for that `product_id`.

### 5.2 Allowed transaction types & quantity constraints

- `type IN ('IN', 'OUT')` only (CHECK constraint, Section 2.6).
- `quantity > 0` always — direction is carried entirely by `type`. A negative quantity or a zero-quantity transaction is rejected at the database level (CHECK constraint), not just validated in application code.

### 5.3 Negative-stock prevention

`products.cached_stock` carries `CHECK (cached_stock >= 0)`. Every stock mutation runs inside one database transaction that inserts the `inventory_transactions` row(s) and updates `products.cached_stock` by the same delta before committing. If an `OUT` would drive `cached_stock` below zero, the `UPDATE` violates the CHECK constraint and the entire transaction rolls back atomically — the `inventory_transactions` row is never committed either, so the ledger and the cache can never disagree because of a rejected write.

### 5.4 Concurrent stock updates

Two admins recording stock-out for the same product at the same time is the concurrency case that matters here (small internal team, not high-throughput). Strategy:

```sql
-- inside one transaction
UPDATE products
SET cached_stock = cached_stock - :quantity
WHERE id = :product_id;
-- CHECK(cached_stock >= 0) evaluated here; violation aborts the transaction

INSERT INTO inventory_transactions (product_id, type, quantity, note, created_by)
VALUES (:product_id, 'OUT', :quantity, :note, :created_by);
```

`UPDATE ... SET cached_stock = cached_stock - :quantity` (a relative update, not a read-then-write of a previously fetched value) takes a row-level lock on the `products` row for the duration of the transaction under PostgreSQL's default `READ COMMITTED` isolation — a second concurrent transaction updating the same row blocks until the first commits or rolls back, then re-evaluates against the now-current value. This is standard PostgreSQL row-lock behavior, not a custom locking scheme, and it's sufficient at this system's write volume (a handful of staff, not a high-concurrency checkout flow) — no `SELECT ... FOR UPDATE`, advisory locks, or serializable isolation needed.

### 5.5 What happens when a sale is recorded

See Section 6 — a sale's stock-out is one instance of the same write path (Section 5.3/5.4), executed once per `sale_items` row within the sale's own transaction.

### 5.6 Direct `cached_stock` modification

**Not permitted from normal application code.** The only two writers to `cached_stock` are: (a) the Stock In/Out admin action, and (b) the sale-recording flow — both always paired with an `inventory_transactions` insert in the same transaction (Sections 5.3, 6). No code path updates `cached_stock` alone. The one justified exception is a future admin-only "recalculate from ledger" maintenance action (`04-system-design.md` Section 5.4/5.5) that recomputes `cached_stock` as `SUM(...)` from `inventory_transactions` and overwrites it directly — this is a reconciliation tool against drift, not a normal write path, is not built for MVP, and if built later must itself run inside a transaction with the same row lock discipline.

---

## 6. Sales

### 6.1 Price snapshot

`sale_items.unit_price` is copied from `products.price` at the moment the sale is recorded and stored independently. `products.price` can change afterward (a price update, a promotion) without altering any historical sale record — `sale_items` never joins to `products.price` to display a past transaction's value.

### 6.1a `invoice_number` generation

```sql
CREATE SEQUENCE sales_invoice_seq;
```

`sales.invoice_number` defaults to an expression built from this sequence, e.g.:

```sql
'INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('sales_invoice_seq')::text, 6, '0')
-- produces: INV-2026-000042
```

Set as the column's `DEFAULT`, computed by Postgres at `INSERT` time — the application never constructs or passes a value for this column. `nextval()` on a sequence is atomic under concurrent transactions by Postgres design, so no application-level "generate, check uniqueness, retry on collision" logic is needed (the DB-native sequence is the simpler, race-free choice over an app-generated random/UUID-derived number). The `UNIQUE` constraint (Section 2.7) is a backstop, not the primary uniqueness mechanism. Once assigned, `invoice_number` is never regenerated or edited — stable for the sale's lifetime, matching PRD Section 12.1's requirement that the invoice text sent via WhatsApp carries a stable reference.

### 6.1b Duplicate product lines — consolidation (resolves audit Finding 7)

**A single sale may contain a given product only once**, enforced at the database level by `sale_items`' `UNIQUE (sale_id, product_id)` constraint (Section 2.8). This closes the ambiguity the audit identified: with at most one `sale_items` row per `(sale, product)` pair, the existing `product_id` + `note` reconciliation against `inventory_transactions` (Section 6.1) is unambiguous — there is exactly one line item, and therefore exactly one `OUT` transaction, per product per sale.

If an admin adds the same product to a sale twice (e.g. scans/selects it a second time before submitting), the server-side sale-creation code **consolidates line items by `product_id` before insert**, summing quantities into a single line: two requested lines of `product_id = X, quantity = 2` and `product_id = X, quantity = 3` become one `sale_items` row with `quantity = 5`. This is application-layer request normalization, not a database concern — the `UNIQUE` constraint is the backstop that makes a consolidation bug fail loudly (a constraint violation) rather than silently insert two conflicting rows. Consolidation happens before, not instead of, the existing stock/price logic: the combined quantity is what gets checked against `cached_stock` and what the resulting `OUT` transaction moves.

### 6.2 Atomic sale recording

Recording a sale with N line items (already consolidated per Section 6.1b, so at most one line per distinct product) is one database transaction. Line items are processed **in ascending `product_id` order** before any lock is taken — this resolves audit Finding 5 (deadlock risk): two concurrent sales that both touch products X and Y always attempt to lock them in the same order (X before Y, by UUID comparison), so neither transaction can hold X while waiting for Y while the other holds Y while waiting for X. This costs one `ORDER BY` on an already-small, in-memory list of line items and eliminates the deadlock class entirely, rather than relying on Postgres's deadlock detector to abort one side after the fact.

```sql
BEGIN;

INSERT INTO sales (customer_name, customer_phone, note, created_by)
VALUES (:customer_name, :customer_phone, :note, :created_by)
RETURNING id, invoice_number INTO :sale_id, :invoice_number;

-- line items already consolidated (Section 6.1b) and sorted by product_id ascending;
-- repeated per line item, in that order:
INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal)
VALUES (:sale_id, :product_id, :quantity, :unit_price, :quantity * :unit_price);

UPDATE products
SET cached_stock = cached_stock - :quantity
WHERE id = :product_id;
-- CHECK(cached_stock >= 0) — insufficient stock aborts the whole sale here

INSERT INTO inventory_transactions (product_id, type, quantity, note, created_by)
VALUES (:product_id, 'OUT', :quantity, 'Sale ' || :sale_id, :created_by);

COMMIT;
```

If any product in the sale has insufficient stock, the `products.cached_stock` CHECK fails, the transaction rolls back in full, and **no** `sales`, `sale_items`, or `inventory_transactions` rows are committed — never a partial sale with some line items recorded and others not. The admin UI performs a client-side pre-check against currently known stock for fast feedback, but the database transaction is the actual guarantee (Section 04's stated position, unchanged).

If the same product appears twice in the *incoming request* despite consolidation (a bug, not the normal path), the second `INSERT INTO sale_items` attempt fails the `UNIQUE (sale_id, product_id)` constraint and the whole transaction rolls back — a loud failure during development/testing rather than a silently wrong sale record.

`INSERT INTO sales (...)` above relies on `payment_status` and `sale_status` defaulting to `'PENDING'` and `'CONFIRMED'` (Section 2.7), and `invoice_number` defaulting per Section 6.1a — the column list intentionally omits all three, no explicit value is passed at sale-creation time for any of them. **Inventory moves in this same transaction, unconditionally of payment state** — a sale is never "reserved" separately from "committed"; recording it is committing the stock (matches PRD Section 12.1's confirmed flow: seller confirms → sale created → inventory OUT → payment starts at `PENDING`).

### 6.3 `payment_status` — manual transition only

```sql
UPDATE sales
SET payment_status = 'PAID', paid_at = now(), paid_by = :token_id
WHERE id = :sale_id AND payment_status = 'PENDING';
```

Issued only from an admin route/action via `service_role`, gated by the Section 17 access-control middleware — the same pattern as every other admin mutation. No trigger, cron, webhook, or background job ever writes to `payment_status`, `paid_at`, or `paid_by`; there is no payment gateway, bank API, or QRIS integration to call one from, and no payment-proof upload/OCR pipeline to trigger one (PRD Section 12.1). The `WHERE payment_status = 'PENDING'` guard makes the transition idempotent-safe (a second identical `UPDATE` simply matches zero rows) rather than a source of duplicate-transition bugs, and pairs with Section 2.7's `CHECK` constraint tying `paid_at`/`paid_by` to `payment_status = 'PAID'` — the database itself refuses a state where one is set without the others.

No states beyond `PENDING`/`PAID` exist in the schema (Section 2.7's `CHECK` constraint is exhaustive) — `REFUNDED`, `FAILED`, `PARTIAL`, `EXPIRED`, `WAITING_VERIFICATION` are deliberately not modeled; adding any of them is a future schema change if a future requirement explicitly calls for it, not something this design anticipates speculatively.

### 6.4 `sale_status` and cancellation — compensating restoration, not deletion

Cancellation is defined only for an unpaid sale (`payment_status = 'PENDING'`); cancelling a `PAID` sale is an undefined refund scenario, out of scope (PRD Section 17 Excluded). One database transaction:

```sql
BEGIN;

UPDATE sales
SET sale_status = 'CANCELLED', cancelled_at = now(), cancelled_by = :token_id
WHERE id = :sale_id AND payment_status = 'PENDING' AND sale_status = 'CONFIRMED';
-- zero rows matched (already paid, already cancelled) -> application treats as a no-op/conflict, not silently retried

-- per original sale_item row for this sale, in ascending product_id order (Section 6.2's
-- lock-ordering rule applies identically here — cancellation is a multi-product write too):
UPDATE products
SET cached_stock = cached_stock + :quantity
WHERE id = :product_id;

INSERT INTO inventory_transactions (product_id, type, quantity, note, created_by)
VALUES (:product_id, 'IN', :quantity, 'Cancelled sale ' || :sale_id, :created_by);

COMMIT;
```

**The original `OUT` transaction from Section 6.2 is never touched** — not deleted, not updated, not reversed in place. `inventory_transactions` stays strictly append-only (Section 5.1); a cancelled sale leaves both the original stock-out and this compensating stock-in permanently visible in the ledger, so admin-facing inventory history shows exactly what happened (a sale was made, then cancelled and restored) rather than erasing that a sale was ever attempted. This is the same "correction is a new offsetting transaction" principle already established for ordinary stock corrections (Section 2.6's append-only note), applied to the sales-cancellation case specifically.

---

## 7. Settings

### 7.1 Singleton enforcement

`settings.id` is `smallint` with `CHECK (id = 1)` and is the primary key. A second row would need `id = 1` (violates PK uniqueness) or `id != 1` (violates the CHECK) — both are impossible, so exactly one row can ever exist. The application never runs `INSERT` for settings after initial seed (Section 15); all writes are `UPDATE settings SET ... WHERE id = 1`.

A generic key-value config table was considered and rejected here too, matching `04-system-design.md` Section 11.1's reasoning — three known fields don't justify a KV abstraction.

### 7.2 Fields

`whatsapp_number`, `order_message_template`, `availability_message_template`, `invoice_message_template` — all admin-editable via `UPDATE`, never hardcoded in any frontend component (locked decision, carried through unchanged).

**`invoice_message_template` (resolves audit Finding 2):** the text invoice generated at sale creation (PRD Section 12.1) and sent manually via WhatsApp. Same substitution model as the other two templates (`{placeholder}` tokens, resolved server-side, never client-side) but with sale-shaped placeholders instead of single-product ones:

- `{invoice_number}` — `sales.invoice_number` (Section 6.1a).
- `{customer_name}` — `sales.customer_name`, substituted as an empty string if `NULL` (the field is optional per Section 2.7).
- `{item_list}` — a server-rendered multi-line block, one line per `sale_items` row: `{quantity} x {product name} @ {unit_price} = {subtotal}` (exact per-line format is a UI/copy detail, not specified further here; the point is that this placeholder is a pre-rendered block, not a single scalar substitution like the others).
- `{subtotal}` — `SUM(sale_items.subtotal)` across the sale's line items, computed server-side at generation time (not a stored column — Section 6 already stores per-line `subtotal`; the sale-level total is a query-time sum, avoiding a denormalized total that could drift from its line items).
- `{shipping_cost}` / `{other_cost}` — **not schema fields.** No column for shipping or other additional cost exists anywhere in the approved `sales`/`sale_items` schema (Section 2.7/2.8), and PRD Section 12 does not define one. If the placeholder is referenced in an admin-authored template with no corresponding value, it resolves to an empty string / `Rp0` rather than being rejected — this keeps the template flexible for a business that sometimes charges shipping and sometimes doesn't, without requiring a schema change now. If shipping/other-cost ever needs to be a real per-sale recorded amount (not just optional template text), that is a new `sales` column and a new decision at that time, not implied by this template field.
- `{total}` — `{subtotal}` plus any additional-cost value substituted into the template's own text (since there is no stored total field distinct from the summed line items, `{total}` and `{subtotal}` are computed identically for v1 unless/until a real additional-cost field exists per the point above).

**Safe substitution (resolves the "how is this substituted safely" requirement):** identical mechanism to `order_message_template`/`availability_message_template` (`04-system-design.md` Section 11.2) — plain string substitution of known `{placeholder}` tokens performed server-side in one shared utility (never re-implemented per call site), with any unrecognized `{placeholder}` token in an admin-edited template rejected or stripped at save time rather than passed through blindly (`06-security.md` Section 10 already states this validation rule for the existing two templates; it applies identically here, not as a new rule). The resolved text is then used two ways: (a) URL-encoded into the `wa.me` deep link the same way the other templates are, for the "open WhatsApp with this invoice" action, and (b) displayed as plain text in the admin UI so staff can review/copy it before sending. Never rendered as HTML in either path — plain text substitution only, closing the same non-issue Section 12 of `06-security.md` already establishes for the other templates (no HTML parsing occurs anywhere in this pipeline, so there is no injection surface regardless of what an admin or customer name contains).

---

## 8. Indexes

| Index | Table / columns | Access pattern it serves |
|---|---|---|
| `products_slug_key` | `products(slug)` UNIQUE | Product detail page lookup by slug (`WHERE slug = :slug`); unique constraint already creates this index, no separate index needed |
| `idx_products_public_listing` | `products(status, created_at DESC, id DESC)` | The public catalog's primary query: `WHERE status = 'ACTIVE' ORDER BY created_at DESC, id DESC` — also the exact shape cursor pagination needs (Section 10) |
| `idx_products_category` | `products(category_id)` | Category filter (`WHERE category_id = :id`), combined with the status/order index via a bitmap-and plan, or promoted to a composite `(category_id, status, created_at DESC, id DESC)` if query-plan review after real data shows the single-column index insufficient — starting with the single-column index per YAGNI, composite is a one-line upgrade if needed |
| `idx_products_brand` | `products(brand_id)` | Brand filter, same reasoning as category |
| `idx_categories_status` | `categories(status)` | Public filter-list query (`WHERE status = 'ACTIVE'`) and the RLS policy's own `status = 'ACTIVE'` branch (Section 11.1); low-cardinality column but the table itself is tiny so this is a cheap, correct index rather than a meaningful optimization either way |
| `idx_brands_status` | `brands(status)` | Same reasoning as `idx_categories_status` |
| `idx_product_images_product_sort` | `product_images(product_id, sort_order)` | Gallery fetch: "all images for this product, in display order" |
| `product_images_primary_uidx` | `product_images(product_id) WHERE is_primary = true` UNIQUE | Already listed in Section 2.5/4 — doubles as the card-thumbnail lookup index |
| `idx_inventory_product_created` | `inventory_transactions(product_id, created_at DESC)` | Admin inventory history view: "all transactions for this product, newest first" |
| `idx_sales_created` | `sales(created_at DESC)` | Admin sales list, newest first |
| `sales_invoice_number_uidx` | `sales(invoice_number)` UNIQUE | Already implied by the `UNIQUE` constraint (Section 2.7) — doubles as the lookup index for "find this sale by its invoice number" (e.g. looking up a sale from a WhatsApp conversation referencing an invoice) |
| `idx_sale_items_sale` | `sale_items(sale_id)` | Fetch line items for one sale (join target; PostgreSQL does **not** auto-index foreign keys, so this is added explicitly) |
| `sale_items_sale_product_uidx` | `sale_items(sale_id, product_id)` UNIQUE | Already implied by the `UNIQUE (sale_id, product_id)` constraint (Section 2.8/6.1b) — one product per sale, and doubles as the index Postgres uses to check that constraint on every insert |
| `idx_sale_items_product` | `sale_items(product_id)` | "Sales history for this product" lookups from the admin product view |
| `idx_inventory_created_by` | `inventory_transactions(created_by)` | Not added by default — no requirement asks for "transactions by staff member" filtering yet; flagged as a likely future index, not built speculatively |

No index is added on `products.name`, `brands.name`, or `categories.name` for search — see Section 9, an unindexed leading-wildcard `ILIKE` gets no benefit from a plain B-tree index.

---

## 9. Search

### 9.1 Query pattern

```sql
SELECT products.*
FROM products
JOIN brands ON brands.id = products.brand_id
JOIN categories ON categories.id = products.category_id
WHERE products.status = 'ACTIVE'
  AND (
    products.name ILIKE '%' || :query || '%'
    OR brands.name ILIKE '%' || :query || '%'
    OR categories.name ILIKE '%' || :query || '%'
  )
ORDER BY products.created_at DESC, products.id DESC
LIMIT :page_size;
```

### 9.2 Indexing decision

No dedicated search index for v1 (locked decision, `04-system-design.md` Section 10). A leading-`%` `ILIKE` pattern cannot use a standard B-tree index regardless of whether one exists, so adding one on `name` would be dead weight. At the catalog scale implied by "curated" (PRD/design brief — tens to low hundreds of products, not a mass marketplace), a sequential scan across a small joined set is fast enough on Supabase's free/low tiers.

### 9.3 Documented upgrade path (not built now)

If catalog size or query latency later demands it: `CREATE EXTENSION pg_trgm;` plus `CREATE INDEX ... USING GIN (name gin_trgm_ops)` on the searched columns makes `ILIKE '%...%'` index-accelerated. This is a future migration, not part of this design.

---

## 10. Cursor Pagination

### 10.1 Ordering

`ORDER BY created_at DESC, id DESC` — `created_at` alone is not a total order (two products can share a timestamp at insert-batch or seed time), so `id` (UUID, unique) breaks every tie deterministically. This is the same composite the `idx_products_public_listing` index (Section 8) is built for, so the sort is index-backed, not a runtime sort.

### 10.2 Cursor shape

Opaque, base64-encoded JSON: `{"created_at": "2026-08-30T10:00:00Z", "id": "..."}`. Returned by the API with each page, passed back verbatim by the client for the next "Load More" request. Never a raw integer offset.

### 10.3 Query strategy

```sql
SELECT *
FROM products
WHERE status = 'ACTIVE'
  AND (created_at, id) < (:cursor_created_at, :cursor_id)
  -- plus any active category/brand/search filters, ANDed in
ORDER BY created_at DESC, id DESC
LIMIT :page_size + 1;   -- fetch one extra row to compute has_more without a separate COUNT(*)
```

The row-value comparison `(created_at, id) < (:cursor_created_at, :cursor_id)` is what makes the cursor stable under concurrent inserts: a new product inserted after a client fetched page 1 never shifts already-fetched rows or causes a duplicate/skip on page 2, which offset-based (`LIMIT/OFFSET`) pagination is prone to.

### 10.4 First page

No cursor supplied: the `WHERE (created_at, id) < (...)` clause is simply omitted, same `ORDER BY` and `LIMIT`.

---

## 11. Security / RLS

**No Supabase Auth exists in this system (`04-system-design.md` Section 7) — every request Supabase's data API ever sees is `anon`. There is no `authenticated` role in play, ever, for any request.** This is the central change from v1.1: RLS is no longer the admin-write gate. It is used only to (a) grant public read access and (b) close every write path for `anon`, full stop. Admin mutations happen exclusively through server-side Next.js routes/actions using the Supabase `service_role` key, which bypasses RLS by design — the actual admin gate is the access-control middleware described in Section 18, not a Postgres policy.

Supabase Row Level Security is still enabled on every table (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`), so public read boundaries hold even if a client calls the database directly.

### 11.1 Public (anonymous / `anon` role) policies — read-only, unchanged in substance from v1.1

| Table | Public policy |
|---|---|
| `categories` | `SELECT` — `status = 'ACTIVE'` **OR** the row is referenced by at least one publicly-visible product (`EXISTS (SELECT 1 FROM products WHERE products.category_id = categories.id AND products.status = 'ACTIVE')`). See note below. |
| `brands` | `SELECT` — same two-branch rule as `categories`, against `products.brand_id` |
| `products` | `SELECT` on the base table restricted to `WHERE status = 'ACTIVE'`, as before — but the public application code never queries the base table directly. It queries `products_public` (Section 11.1a), a view that never exposes `is_manually_unavailable`/`cached_stock` as columns at all. RLS still confines `anon`'s base-table access to `ACTIVE` rows as a backstop, but the *column* boundary is now enforced by the view definition, not by API-layer discipline alone. |
| `product_images` | `SELECT` — only images whose `product_id` joins to a `status = 'ACTIVE'` product |
| `inventory_transactions` | No policy (no `anon` access) |
| `sales` | No policy (no `anon` access) |
| `sale_items` | No policy (no `anon` access) |
| `admin_access_tokens` | No policy (no `anon` access, under any circumstance — this table must never be readable by a public client) |
| `settings` | No policy (no `anon` access) — the resolved WhatsApp link is generated by a server-side function/route using the `service_role` key, never a direct public `SELECT` on `settings` (NFR Section 19: sensitive configuration must not reach the client) |

### 11.1a Public data boundary: the `products_public` view (resolves audit Finding 6)

The audit correctly identified that RLS alone only controls *row* visibility, not *column* visibility — `is_manually_unavailable` and `cached_stock` were readable at the row level even though the public UI never displayed them, leaving the boundary dependent on every public API route remembering not to over-select. That reliance is removed here, the same way `settings`' sensitive fields were already handled (Section 11.1's `settings` row, unchanged): a narrow, explicit database object defines exactly what public code is allowed to select, rather than a policy elsewhere.

```sql
CREATE VIEW products_public AS
SELECT
  id,
  name,
  slug,
  brand_id,
  category_id,
  description,
  price,
  created_at,
  (NOT is_manually_unavailable AND cached_stock > 0) AS is_available
FROM products
WHERE status = 'ACTIVE';
```

- `is_manually_unavailable` and `cached_stock` are **not columns of this view** — not masked, not nulled-out, structurally absent. A public route that does `SELECT * FROM products_public` (or the Supabase client-library equivalent) cannot leak either value, because there is nothing to leak; this is a stronger guarantee than "the API layer remembers not to include them," which is what the flagged finding objected to.
- `is_available` is the single derived boolean the public site actually needs (Section 3.2's resolution logic, computed once in the view rather than re-implemented in every route) — the public UI maps `true → "Available"/"Pesan via WhatsApp"` and `false → "Stok Habis"/"Tanya Ketersediaan"` (Section 5.4 of `04-system-design.md`), with `updated_at` intentionally left off the view (not needed publicly) though it may be added if a future public "recently added/updated" feature needs it.
- The view is granted `SELECT` to `anon` (Postgres views run with the querying role's own permissions by default unless declared `SECURITY DEFINER`, which this view does **not** use — it relies on the caller already having `SELECT` on the underlying `products` row per the base-table RLS policy above, so RLS and the view compose rather than one bypassing the other); a public request that somehow bypassed the view and queried `products` directly is still confined to `ACTIVE` rows with all columns technically visible, same as before this section, since the view is an *additional* boundary the application is expected to route all public reads through — not a replacement for the base-table RLS policy, which stays as the backstop described in the row above.
- `product_images`, `categories`, `brands` public reads are unaffected — none of those tables have a sensitive-but-currently-readable column the way `products` did, so no equivalent view is introduced for them (adding one would be unrequested scope; the "simplest solution compatible with the current architecture" this task asked for is one narrow view where the actual gap exists, not a blanket view-everything pattern).
- Pagination (Section 10) and search (Section 9) queries are rewritten against `products_public` instead of `products` for the public code path — the `ORDER BY created_at DESC, id DESC` / cursor shape is unchanged since `created_at`/`id` remain view columns; the admin code path continues to query the base `products` table directly (via `service_role`, which needs `is_manually_unavailable`/`cached_stock` as real editable fields).

**Why the `categories`/`brands` public policy has two branches:** a plain `status = 'ACTIVE'` policy would also hide an archived category/brand from the join a product-detail page performs to display that product's category/brand name — breaking `04-system-design.md`'s requirement that "existing products may continue referencing it" (an archived category shouldn't blank out or 403 on a still-visible product's detail page). The `OR EXISTS (...)` branch keeps an archived row readable exactly when it's still attached to a publicly-visible product, while the filter-list query (`03-design-specification.md` Section 2.4) simply adds its own explicit `WHERE status = 'ACTIVE'` on top and never sees archived entries as filter options.

**No `INSERT`/`UPDATE`/`DELETE` policy exists for the `anon` role on any table, on any table, for any reason.** By default, RLS denies all writes once enabled unless a policy explicitly grants them — public write access is closed by omission, and this is now the *only* thing standing between the public data API and a mutation, since no `authenticated` role path exists at all. This is explicitly called out because it's now doing more work than it was in v1.1: it must hold as an absolute, not a defense-in-depth layer behind an RLS-authenticated admin path that no longer exists.

### 11.2 Admin mutations — `service_role`, not an `authenticated` RLS policy

There is no Section-11.2 RLS policy table for admin operations, because there is no role for one to attach to. Instead:

- Every admin mutation (create/edit/archive a product, record stock, record a sale, edit settings, issue/revoke an access token) is performed by a Next.js server route/action that holds the Supabase `service_role` key server-side only.
- `service_role` bypasses RLS entirely by Supabase design — it is a deliberately maximal-trust key, so **the only thing gating whether that server code path even runs is the Section 18 access-control middleware** (valid, unexpired, unrevoked `admin_access_tokens` cookie). If that middleware check is ever missing or buggy on one route, RLS provides no backstop for that route — this is a real shift in where the security burden sits compared to the v1.1 RLS-admin-policy model, and is called out explicitly rather than glossed over.
- **The `service_role` key must never reach browser/client code** — not in a client component, not in a public env var (`NEXT_PUBLIC_*`), not serialized into any response. It exists only in server-side environment configuration read by server route handlers/actions.
- `admin_access_tokens` itself is only ever read/written by `service_role`-backed server code (issuing a new token, checking validity, revoking one) — never exposed through any RLS-`anon` or client-reachable path (Section 11.1).

### 11.3 Why RLS is still enabled even though admin bypasses it

Public read boundaries (Section 11.1) still benefit from RLS as a backstop independent of the Next.js app layer — if a public client ever queried Supabase directly, RLS still confines it to `anon`'s granted `SELECT`s and nothing else. For admin operations, the equivalent backstop is architectural, not a Postgres policy: `service_role` is never shipped to any client, so there is no client-reachable path that could bypass the Section 18 middleware to reach it in the first place. Two different mechanisms for two different trust boundaries, both real, neither one "the same as before, just relabeled."

---

## 12. Referential Integrity

| Entity | Delete/archive behavior | Reasoning |
|---|---|---|
| `products` | Never hard-deleted by the app. "Delete" in the admin UI sets `status = 'INACTIVE'`. FK `ON DELETE RESTRICT` from `sale_items.product_id` and `inventory_transactions.product_id` makes a hard delete fail loudly if ever attempted directly against the DB. | PRD Section 8 says "archive/delete," design intent is archival; hard delete would orphan or cascade-destroy sales/inventory history |
| `categories` | Never hard-deleted by the app. "Archive" sets `status = 'INACTIVE'` (Section 3.3); "Restore" sets it back. `ON DELETE RESTRICT` from `products.category_id` remains as a backstop against a direct `DELETE`, which the app never issues | Satisfies PRD Section 9's "Delete/archive category" via true soft-archival, not a blocked-until-reassigned workaround |
| `brands` | Same as `categories` — `status` archive/restore, `ON DELETE RESTRICT` from `products.brand_id` as backstop | Satisfies PRD Section 10's "Delete/archive brand" the same way |
| `product_images` | Hard `DELETE` is fine — an image has no downstream history dependent on it. `ON DELETE CASCADE` from `products` (deleting a product's images when the product itself is ever hard-deleted, e.g. a dev/test cleanup) is safe since images carry no business history | Images are pure presentation data |
| `inventory_transactions` | Never deleted or updated by the app (Section 5, "append-only"). No `DELETE`/`UPDATE` RLS policy exists at all for this table (Section 11.2) | Ledger integrity — PRD Section 11 "retain transaction history" |
| `sales` | Never deleted. **Updated only** for the two narrow, explicitly-defined transitions in Section 6.3/6.4: `payment_status` `PENDING` → `PAID` (also sets `paid_at`/`paid_by`), and `sale_status` `CONFIRMED` → `CANCELLED` (also sets `cancelled_at`/`cancelled_by`; unpaid sales only). No other column on an existing `sales` row is ever updated after creation — `invoice_number`/`customer_name`/`customer_phone`/`note`/line items are immutable once recorded | PRD Section 12.1's confirmed manual payment workflow requires a real status transition; this supersedes the earlier "sales are never updated" statement from `05` v1.2, narrowed to exactly these two fields (plus their four attribution columns) rather than reopened generally |
| `sale_items` | Same as `sales`; `ON DELETE CASCADE` from `sales` exists only so that if a `sales` row is ever removed (not exposed in any admin flow, would require direct DB access), its line items don't orphan — not a feature, a data-integrity backstop. `UNIQUE (sale_id, product_id)` rejects a second line item for a product already on the sale (Section 6.1b) | |

`categories`/`brands` now carry a `status` column beyond PRD Sections 9-10's literal `id, name, slug, created_at` field list — a deliberate, approved addition (option (a), Section 3.3) to actually satisfy those sections' "Delete/archive" requirement, rather than a silent schema drift.

---

## 13. Money / Currency

`numeric(12,2)` for `products.price`, `sale_items.unit_price`, `sale_items.subtotal`.

- **Not `float`/`double precision`** — binary floating point cannot represent most base-10 decimals exactly (e.g. `0.1 + 0.2 !== 0.3` in IEEE 754), which is unacceptable for money regardless of currency; this is a correctness rule, not an IDR-specific one.
- **Not `integer` storing the smallest unit** (e.g. cents-equivalent) — IDR has no subunit in practical use (no sen in circulation), and PRD's example prices (`Rp1.250.000`) are always whole rupiah, so a scale-2 `numeric` is more headroom than needed, not less; `numeric(12,2)` is chosen anyway over `numeric(12,0)` to keep the type generic/future-proof (e.g. if a promotional or wholesale-fraction price scheme is ever needed) at effectively zero storage cost difference in PostgreSQL's variable-length `numeric` encoding.
- `numeric(12,2)` allows values up to 9,999,999,999.99 — far beyond any realistic single-product IDR price, headroom chosen generously since `numeric`'s storage cost scales with actual digits used, not the declared precision.
- Display formatting (`Rp1.250.000` grouping/currency symbol) is an application-layer/UI concern, not a database concern — the column stores a plain decimal number.

---

## 14. Timestamps

- All timestamp columns are `timestamptz` (`timestamp with time zone`), never bare `timestamp`. PostgreSQL stores `timestamptz` internally as UTC and converts on input/output based on the session's `TimeZone` setting — this avoids the entire class of bugs where a naive `timestamp` silently means different things depending on server/client timezone assumptions.
- Application/API layer treats all timestamps as UTC on the wire (ISO 8601 with `Z` or explicit offset) and converts to Asia/Jakarta (WIB, UTC+7) only at display time in the UI — consistent with the business operating in Indonesia (Section 13 context) without baking a fixed offset into stored data (correct even if the business later operates across WIB/WITA/WIT).
- `products.updated_at` is maintained by a trigger (`BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at()`) rather than relying on every application code path to remember to set it — a well-established Postgres pattern, one small function shared by any future table that needs the same behavior (none currently do, so only `products` gets it now).
- No table has a generic `updated_at` beyond `products` — `categories`, `brands` have no mutable fields worth tracking beyond `created_at` per their approved field list (Section 12); `inventory_transactions`/`sale_items` are fully append-only and never updated, so a generic `updated_at` on them would always equal `created_at` and add nothing. **`sales` is a narrow exception, now resolved rather than flagged-open:** instead of a single generic `updated_at`, it carries `paid_at` and `cancelled_at` (Section 2.7) — one timestamp per specific transition, each paired with its own `paid_by`/`cancelled_by` attribution. This is a more precise answer than a single `updated_at` could give ("when did this become PAID" and "when was this cancelled" are two different, independently meaningful questions for a sale, not one generic "last touched" fact) — the v1.4 flag asking whether `sales.updated_at` was worth adding is closed by this more specific pair of columns rather than by adding the generic one.

---

## 15. Seed Data

Development-only seed, never run against production:

- A `supabase/seed.sql` (or equivalent) file, executed only by `supabase db reset` / local dev setup — Supabase's convention keeps this file out of the production migration path entirely (migrations and seed are separate concerns in the Supabase CLI).
- Seed contents: 2-3 `categories`, 2-3 `brands`, 5-10 `products` with placeholder data and 1-2 `product_images` each (placeholder image URLs), a small number of `inventory_transactions` establishing non-zero `cached_stock` on most seeded products and zero on at least one (to exercise the "Stok Habis" state), one seeded `settings` row with a placeholder WhatsApp number and the default message templates from PRD Section 7 (including a placeholder `invoice_message_template`, Section 7.2), and one `admin_access_tokens` row (`label = 'Local Dev'`, a known plaintext secret hashed into `token_hash`, generous `expires_at`) so local development has a working bootstrap credential without needing to hit the real issuance flow.
- The `settings` singleton is **seeded exactly once** (`INSERT` in the seed script only) — reinforces Section 7.1, the application code path never runs `INSERT INTO settings`.
- No production business data (real product names, real prices, the real WhatsApp number) is ever placed in a seed file — production `settings`/`products` are entered through the admin UI after deployment, not migrated in from a script.

---

## 16. Migration Order

Dependency-ordered (a table can only be created after every table it foreign-keys to):

1. `admin_access_tokens` (no dependencies — no longer waits on Supabase-managed `auth.users`, since none is used)
2. `categories` (no dependencies)
3. `brands` (no dependencies)
4. `settings` (no dependencies — placed here for convenience, order relative to 2-3 doesn't matter)
5. `products` (depends on `brands`, `categories`)
6. `product_images` (depends on `products`)
7. `inventory_transactions` (depends on `products`, `admin_access_tokens`)
8. `sales` (depends on `admin_access_tokens`)
9. `sale_items` (depends on `sales`, `products`)

Each of the above is one migration file when implementation begins; RLS policies (Section 11), the `products_public` view (Section 11.1a), and the `updated_at` trigger (Section 14) are separate migrations applied after their target table exists, per standard Supabase migration practice (not written yet, per this task's scope). The `product-images` Storage bucket (Section 4a) is created via Supabase project configuration (dashboard or CLI `supabase/config.toml`), not a SQL migration — bucket creation and SQL migrations are separate mechanisms in Supabase's tooling.

---

## 17. Access Control Flow

End-to-end flow this schema supports, per `04-system-design.md` Section 7 (no code yet, sequence only):

```text
1. Issuance (one-time, admin-to-admin, out of band)
   An existing admin generates a new credential for a new device:
   - Application generates a random secret S (e.g. 32 bytes, cryptographically random).
   - Application computes token_hash = SHA-256(S).
   - INSERT INTO admin_access_tokens (label, token_hash, expires_at)
     VALUES (:label, :token_hash, now() + interval '90 days');
   - The plaintext bootstrap URL (containing S) is shown once and handed to the
     new device's user (e.g. read aloud, shown on screen) — S itself is never stored.

2. Bootstrap (one-time per device, or whenever the 30-day cookie session expires)
   Staff visits /access/{S} on the admin subdomain:
   - Server computes SHA-256(S) and looks up admin_access_tokens WHERE token_hash = :hash.
   - Reject (generic 404, Section 17.1) if no match, or revoked_at IS NOT NULL, or expires_at <= now().
   - On success: issue a signed, httpOnly, Secure, SameSite=Strict cookie containing
     { token_id: admin_access_tokens.id, issued_at }, signed with a server-only HMAC
     secret (env var, unrelated to token_hash). Cookie max-age is a FIXED 30 days
     (locked 2026-09-01 — not a range), further capped down to the credential's
     remaining time-to-expires_at if less than 30 days of credential validity remain.
     The credential itself (expires_at, e.g. 90 days from issuance) and the cookie
     session (always 30 days per issuance) are two independent lifetimes — a device
     re-bootstraps with the same secret S as needed within the credential's own
     expires_at window, each time getting a fresh 30-day cookie.
   - Redirect into the admin panel. No form was ever shown.

3. Subsequent admin requests (every request to the admin subdomain)
   - Middleware reads the signed cookie, verifies the HMAC signature (rejects tampering
     without a DB hit), then looks up admin_access_tokens WHERE id = :token_id AND
     revoked_at IS NULL AND expires_at > now().
   - Any failure -> generic 404 (Section 17.1), never a distinguishing 401/403 that would
     confirm the admin surface exists to an unauthenticated prober.
   - Success -> request proceeds to the route/action, with token_id available to it.

4. Mutation
   - The route/action (server-side only) performs the write using the Supabase
     service_role client, passing token_id as created_by/updated_by (Section 2.1/3).
   - service_role bypasses RLS by design; the only gate that mattered already ran in step 3.

5. Revocation (admin-initiated, any time)
   - UPDATE admin_access_tokens SET revoked_at = now() WHERE id = :token_id;
   - Takes effect on that credential's very next request (step 3 re-checks revoked_at
     every time, not just at bootstrap) — no wait for cookie expiry.
```

### 17.1 Hardening carried through unchanged from `04-system-design.md` Section 7.1

- **Generic 404, not 403/401,** on any invalid/expired/revoked/missing credential — the admin surface never confirms its own existence to an unauthenticated request.
- **Per-device revocation** — one compromised/lost device is one `UPDATE`, not a rotation affecting every other credential (Section 2.1).
- **Hard expiry** (`expires_at`) forces periodic re-bootstrap regardless of `revoked_at`, bounding how long a leaked-but-not-yet-detected credential stays valid. **Fixed 30-day cookie session lifetime** (locked 2026-09-01) forces re-bootstrap on that shorter cadence regardless of the credential's own longer `expires_at`, and revocation invalidates the credential — and any cookie session derived from it — immediately on the next request, independent of both lifetimes (step 3, step 5 above).
- **`noindex`/`robots.txt` disallow and `Referrer-Policy: no-referrer`** on the admin subdomain — outside this document's schema scope but restated here as a requirement this schema must not undermine (e.g. no admin data ever rendered in a way that would be indexable or leak via referrer).
- **Rate limiting on repeated invalid bootstrap attempts is best-effort v1** (in-memory/edge counter, no external service such as Upstash Redis added for v1) — accepted limitation: does not share state consistently across concurrent serverless/edge instances, so it is not a globally accurate rate limiter. Acceptable because it is one layer among several (256-bit token entropy, hashed storage, expiry, revocation, generic 404) rather than the sole defense against brute force, which is already computationally infeasible at that entropy regardless of rate limiting. Full analysis in `06-security.md` Section 13.
- None of the above is a database concern to enforce beyond what's already in Section 2.1's constraints (`UNIQUE token_hash`, `expires_at`/`revoked_at` columns) — the rest is middleware/route behavior, listed here only so the schema's reasoning stays traceable to the access-control requirement it exists to support.

---

## 18. Consistency Check Against `01`–`06`

### 18.1 What changed this pass (v1.5)

Four decisions locked and threaded through every relevant document:
- `invoice_number`: added to `sales`, server-generated via a Postgres sequence (Section 6.1a), `NOT NULL UNIQUE`, never client-suppliable.
- Admin session cookie lifetime: fixed at 30 days (Section 17), distinct from and independent of the credential's own `expires_at` (e.g. 90 days).
- Transition attribution: `paid_at`/`paid_by` and `cancelled_at`/`cancelled_by` added to `sales` (Section 2.7, 6.3, 6.4), closing the gap `05` v1.4 had deliberately left open rather than silently deciding — no separate audit-log table introduced.
- Rate limiting: confirmed best-effort in-memory/edge for v1, no external service added, limitation documented explicitly (Section 17.1).

All prior open items from `05` v1.2's consistency check (stale `admin_user` references, the three residual "authentication" mentions in `01`) were already resolved in the sessions between v1.2 and this one — nothing outstanding from that round remains.

### 18.2 Full verification across all six documents

- **`invoice_number` exists consistently** — present and identically specified (server-generated, `NOT NULL UNIQUE`, never regenerated) in `01` §12, `04` §2.6/6.1a, `05` §2.7/6.1a, and referenced in `06`'s flagged-contradiction section (now resolved rather than open).
- **`invoice_number` generation is server-controlled** — confirmed; the Postgres sequence + `DEFAULT` expression approach (Section 6.1a) means the application never constructs or passes this value, closing `06` §7's requirement that the client cannot supply it.
- **30-day session lifetime is consistent** — stated identically in `01` §13, `04` §7.1, `05` §17 (bootstrap step 2 and §17.1), with the credential-vs-session lifetime distinction spelled out in each to prevent the two concepts being conflated again.
- **`paid_at`/`paid_by` consistent** — same column names, same nullability/CHECK pairing, same "set only by the guarded `PENDING→PAID` UPDATE" rule in `01` §12/12.1, `04` §2.6/6.3, `05` §2.7/6.3.
- **`cancelled_at`/`cancelled_by` consistent** — same treatment, `01` §12.2, `04` §2.6/6.4, `05` §2.7/6.4.
- **Payment status remains manual** — unchanged; no automated write path introduced anywhere by this pass.
- **Cancellation remains limited to unpaid sales** — unchanged; the `payment_status = 'PENDING'` guard is present in every SQL sketch across `04`/`05`.
- **Inventory restoration remains via compensating IN transaction** — unchanged; Section 6.4 in both `04` and `05` still never touches the original `OUT` row.
- **No audit-log table introduced** — confirmed; `paid_at`/`paid_by`/`cancelled_at`/`cancelled_by` are columns on the existing `sales` table, not a new table. Table count remains 9.
- **No payment gateway/automated verification introduced** — confirmed; `invoice_number` generation is the only new mechanism, and it's a formatting/reference concern, not a payment-processing one.
- **No Supabase Auth, no login/password/PIN introduced** — confirmed; nothing in this pass touches the access-control model's fundamentals, only its session lifetime parameter.
- **`02`/`03` unchanged** — confirmed no genuine customer-facing requirement was affected by any of the four decisions (invoice numbers, session lifetime, transition attribution, and rate limiting are all internal/admin-side concerns); per the task's own instruction, these two documents were left untouched.

### 18.3 Result

**`docs/01` through `docs/06` are fully consistent.** No open contradictions remain from this pass or carried over from prior rounds. Ready for migration implementation.

### 18.4 Architecture audit resolution pass (this revision, v1.6)

`docs/architecture-audit.md` (an independent audit performed against `01`-`05`) raised one BLOCKER and six IMPORTANT findings. Resolved in this revision:

- **Finding 1 (BLOCKER — Storage bucket policy undefined):** resolved, Section 4a — bucket visibility, path convention, read/write/delete policy, file type/size limits, and replace-deletes-old-object behavior all specified; `06-security.md` Section 9 updated to match.
- **Finding 2 (invoice text has no template/schema field):** resolved, Section 7.2 — `settings.invoice_message_template` added, placeholders and safe substitution documented.
- **Finding 3 (`products.status` conflates archived/draft):** resolved as a documentation clarification, no schema change — Section 3.4. No `DRAFT` value added; PRD/design docs don't require distinguishing the two cases.
- **Finding 4 (no correction path for a mistaken sale beyond full pre-payment cancellation):** resolved as a documentation clarification in `01-product-requirements.md` Section 12.2 — no new state or mechanism introduced, existing cancel-and-re-enter path stated explicitly as the only one.
- **Finding 5 (no lock-ordering rule for multi-item sale transactions, deadlock risk):** resolved, Section 6.2 (and mirrored into the cancellation transaction, Section 6.4) — line items locked in ascending `product_id` order.
- **Finding 6 (public RLS exposes `cached_stock`/`is_manually_unavailable` at the row level, masking was app-layer-only):** resolved, Section 11.1a — `products_public` view is now the explicit public data boundary; public routes query the view, never the base table.
- **Finding 7 (`sale_item` ↔ `inventory_transaction` linkage ambiguous for duplicate product lines):** resolved, Sections 2.8/6.1b — `UNIQUE (sale_id, product_id)` plus server-side consolidation; duplicate lines are not supported in v1.

Findings 8-15 of the audit (invoice_number, minor/observation items) were either already resolved by the v1.5 pass (invoice_number) or classified in the task's resolution report as not requiring a schema/documentation change — see that report rather than this document for the full disposition of each.
