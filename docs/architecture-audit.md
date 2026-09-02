# Architecture Audit

**Document:** docs/architecture-audit.md
**Status:** Audit artifact — NOT a source-of-truth document. Does not modify docs/01–05.
**Scope reviewed:** `01-product-requirements.md`, `02-design-brief.md`, `03-design-specification.md`, `04-system-design.md`, `05-database-design.md` (all dated 2026-09-01, `05` v1.4).
**Method:** Independent read of all five documents end-to-end, cross-checked requirement-by-requirement against system design and database design. No code, no migrations, no document edits performed.

---

## Summary

Overall the five documents are unusually internally consistent — most ambiguities visible in earlier drafts have already been resolved and explicitly logged (e.g. `05` Section 18's own consistency check, the access-control rewrite in `01` Section 13). The findings below are what remained after that existing self-audit.

**1 BLOCKER, 6 IMPORTANT, 5 MINOR, 4 OBSERVATION.**

Not "NO BLOCKERS" — see Finding 1.

---

## Findings

### Finding 1 — Supabase Storage bucket policy is entirely unspecified

**Classification:** BLOCKER

**Document/section:** `04-system-design.md` Section 12 ("Explicitly Deferred") and `05-database-design.md` Section 11 (RLS).

**Problem:** Every table's RLS policy is specified in exhaustive detail (Section 11 of `05`), down to which columns are safe for `anon` to read. But `product_images.url` points at Supabase Storage, and nothing in any document specifies the storage bucket's access policy: whether the bucket is public-read, whether `anon` can write/overwrite/delete objects, what path structure prevents one product's upload flow from overwriting another's file, or any file-type/size validation at the storage layer. `04` Section 12 defers only "upload/resize pipeline mechanics" — bucket-level read/write authorization is a distinct concern from resize mechanics and is not deferred explicitly, just absent.

**Why it matters:** The public catalog requires images to be publicly viewable with no authentication — so the bucket almost certainly needs public-read. Without an explicit policy decision now, this gets improvised during implementation, and the two failure modes are both bad: a public catalog with broken images (bucket too locked down), or a bucket that also grants public *write*, letting anyone overwrite `product_images.url` targets or upload arbitrary files (Storage RLS defaults are not the same defaults as Postgres table RLS and are easy to get wrong under time pressure). This is exactly the class of admin-mutation-surface risk Section 11/17 of `05` was careful about for every table — the same rigor hasn't been applied to Storage.

**Recommended resolution:** Add a Storage-policy subsection (likely in a future `06-security.md`, per `01` Section 1) specifying: bucket public-read / service-role-only-write, the path convention (e.g. `product-images/{product_id}/{uuid}.{ext}`), and that all uploads go through the server-side `service_role`-gated admin route (never a client-direct upload to Storage), consistent with the `service_role`-only admin mutation model already established for the database.

---

### Finding 2 — Sale invoice text has no defined template or schema field

**Classification:** IMPORTANT

**Document/section:** `01-product-requirements.md` Section 12.1 ("Invoice text generated, sent manually via WhatsApp"); `05-database-design.md` Section 2.9/7.2 (`settings`).

**Problem:** The confirmed business flow names "invoice text generated" as an explicit step between sale creation and payment. The `settings` table defines exactly two message templates — `order_message_template` (single-product WhatsApp CTA, PRD Section 7) and `availability_message_template` — neither of which is a multi-line-item sale invoice. There is no field, template, or generation rule anywhere describing what the invoice text contains (customer name? per-item breakdown? total? bank transfer details?) or where it is composed (a third settings template vs. ad-hoc admin-UI string concatenation).

**Why it matters:** This is a named, confirmed-business-process step (not a nice-to-have), yet its content is fully unspecified. Two implementers could reasonably build this two different ways — a hardcoded format in the admin UI, or a third configurable template — with different schema consequences (a `settings.invoice_template` column vs. none). Per this project's own AI Behavior rule ("do not invent business requirements... ask for approval when the decision materially affects architecture or data"), this should be resolved before an admin records its first sale.

**Recommended resolution:** Decide whether invoice text is (a) admin-editable via a third `settings` template field (consistent with how the other two templates are handled), or (b) a fixed format defined once in the admin UI spec (not yet written, per `04` Section 12). Either is valid; the current documents simply don't say which.

---

### Finding 3 — `products.status` conflates "archived" and "never-published draft"

**Classification:** IMPORTANT

**Document/section:** `05-database-design.md` Section 4 ("A minimum of 1 image... is also an application-layer rule... a product can exist in `INACTIVE`/draft state with zero images while being edited").

**Problem:** `products.status` is defined everywhere else (PRD Section 8, `04`/`05` Sections 3.2-3.3) as a two-state **catalog visibility** flag: `ACTIVE` (was live, currently live) vs. `INACTIVE` (archived, was previously live). Section 4 of `05` reuses the same `INACTIVE` value to also mean "draft, never yet published," a semantically different case (a product that was live and got pulled vs. one that has never been complete enough to publish).

**Why it matters:** An admin product list filtered to `INACTIVE` would show both "products we discontinued" and "products still being drafted" indistinguishably, with no way to tell them apart or filter separately. This is a genuinely ambiguous point that two implementations could resolve differently (e.g. one adds a `DRAFT` status value, another just accepts the conflation) — exactly the "requirements ambiguous enough that Claude Code could implement differently" category this audit was asked to flag.

**Recommended resolution:** Either explicitly accept the conflation (state it once, in `05`, as intentional — "draft and archived are not distinguished for MVP") or add a third status value / separate boolean if the business actually needs to tell them apart in the admin product list.

---

### Finding 4 — Sale correction path is undefined beyond full-sale, pre-payment cancellation

**Classification:** IMPORTANT

**Document/section:** `01-product-requirements.md` Section 12.2; `04-system-design.md` Section 6.4; `05-database-design.md` Section 12 ("no other column on an existing `sales` row is ever updated after creation").

**Problem:** The only defined mutation path for a recorded sale is: (a) `payment_status PENDING → PAID`, or (b) cancel the *entire* unpaid sale via compensating stock-in. There is no defined path for: correcting a line-item quantity/product entered wrong before payment, cancelling a single line item out of a multi-item sale, or any correction once `payment_status = PAID`. Section 12.2 explicitly scopes cancellation to "an unpaid sale" as a whole, and says nothing about partial correction.

**Why it matters:** Data-entry mistakes on a manually-recorded sale are a normal occurrence (wrong quantity, wrong product), and staff currently have no documented recourse except "cancel the whole sale and re-enter it" — which is a reasonable answer, but it is not written down anywhere, so an implementer must either invent a correction flow (scope creep against Section 15's "do not invent business requirements") or leave admins stuck when it happens in practice.

**Recommended resolution:** State explicitly (even a single sentence in `01` Section 12.2) that the only supported correction for a mistaken *unpaid* sale is full cancellation + re-entry, and that a mistaken *paid* sale has no defined correction path in v1 (consistent with the existing "refund is out of scope" stance). This costs one sentence now and prevents an implementer from guessing.

---

### Finding 5 — No documented lock-ordering rule for multi-item sale transactions

**Classification:** IMPORTANT

**Document/section:** `05-database-design.md` Section 5.4 (concurrent stock updates) and Section 6.2 (atomic sale recording).

**Problem:** Section 5.4 correctly relies on PostgreSQL's row-level locking for a *single*-product stock update. Section 6.2's multi-line-item sale transaction, however, issues one `UPDATE products ... WHERE id = :product_id` per line item, in whatever order the line items happen to be iterated (presumably insertion/array order, not specified). Two concurrent sales that both touch the same two products in opposite order (Sale A: product X then Y; Sale B: product Y then X) is the textbook Postgres deadlock scenario — each transaction holds one row's lock and blocks waiting for the other's.

**Why it matters:** At this system's stated write volume ("a handful of staff") a deadlock is unlikely but not impossible, and when it happens Postgres aborts one of the two transactions with an error the admin UI must handle (retry or surface a failure) — a case that isn't mentioned anywhere in the sales-recording flow.

**Recommended resolution:** Add one sentence to Section 6.2: line items within a sale are processed in a deterministic order (e.g. `ORDER BY product_id`) before locking, which eliminates the deadlock class entirely at zero cost. Cheap to fix now, easy to forget once implementation starts iterating a JS array in whatever order it arrived in.

---

### Finding 6 — Public RLS exposes `is_manually_unavailable`/`cached_stock` at the row level; masking is API-layer-only

**Classification:** IMPORTANT

**Document/section:** `05-database-design.md` Section 11.1 (`products` public policy).

**Problem:** The document is explicit and self-aware about this: "`is_manually_unavailable` and `cached_stock` are readable columns but the application's public query/view only ever surfaces the resolved label... RLS controls row visibility, not column-level masking." This means the only thing preventing a public client from seeing the raw stock count and the internal override flag is discipline in the Next.js API layer, not a database-enforced boundary — unlike every other sensitive value in the system (e.g. `settings`, which does get a narrow computed view specifically to avoid this exact pattern, per Section 8 of `04`).

**Why it matters:** `NFR Section 19` of the PRD states "sensitive configuration must not be exposed to the client" and the same principle was applied to `settings` but not to `products`. A future refactor, a debug endpoint, or a careless `select('*')` in a public route would leak exact stock counts and the admin override flag — low severity individually (not a security vulnerability, more a business-information leak: competitors/customers could see exact stock levels), but inconsistent with how carefully every other sensitive field in this design was treated.

**Recommended resolution:** Apply the same pattern already used for `settings` — a public-facing view (`products_public`) that only ever selects the resolved availability label and the columns the public site actually needs, instead of relying on every future API route to remember not to over-select from the base table.

---

### Finding 7 — `sale_item` ↔ `inventory_transaction` linkage is ambiguous when a sale has multiple lines for the same product

**Classification:** IMPORTANT

**Document/section:** `04-system-design.md` Section 6.1; `05-database-design.md` Section 1.1 (flagged-and-rejected join table).

**Problem:** The rejection of a join table is reasonable and already justified for the common case. But nothing in the schema prevents a single `sale` from containing two separate `sale_items` rows referencing the *same* `product_id` (e.g. entered as two lines instead of one combined line), and nothing prevents two different sales recorded in the same request/second from producing `inventory_transactions` rows with identical `product_id` and near-identical `created_at`. In either case, the documented reconciliation method — "`product_id` + timestamp proximity + `note`" — degenerates: the `note` field (`"Sale {sale.id}"`) disambiguates *which sale*, but not *which of the sale's own line items* a given `OUT` row corresponds to, because Section 6.1 of `04` inserts one `inventory_transaction` per `sale_item`, but with no `sale_item_id` reference at all.

**Why it matters:** For audit purposes this is fine at the sale level (an admin can still see "this sale caused these N stock-out rows, totaling the sale's total quantity moved"), but it cannot answer "which specific line item caused which specific stock movement" if the two line items are for the same product with different quantities — a real (if rare) admin bookkeeping question with no answer.

**Recommended resolution:** No schema change is necessarily required — this may be an acceptable limitation for MVP — but it should be stated as an accepted limitation explicitly (the way Section 1.1 already does for the rejected join table), rather than left implicit.

---

### Finding 8 — Category/brand archive-selection UX during product edit is underspecified

**Classification:** MINOR

**Document/section:** `05-database-design.md` Section 3.3 ("Admin behavior").

**Problem:** "`INACTIVE` categories/brands are excluded from the product create/edit selection list... but a product that already references one keeps displaying it normally" is clear for *display*, but doesn't say what the edit form does when an admin opens a product that already has an archived category assigned and saves the form *without* touching that field. If the dropdown genuinely excludes the archived option, a naive implementation could accidentally null out or reject the save because the currently-selected value isn't in the allowed option list.

**Why it matters:** This is a real, easy-to-get-wrong implementation detail (the classic "edit form drops a value that's not in the current option list" bug), though it's narrow enough to resolve during implementation rather than blocking it.

**Recommended resolution:** State explicitly that the edit form must special-case: render the currently-assigned archived category/brand as a selectable (but visually marked "archived") option in that product's own edit form, distinct from the create-flow dropdown which excludes archived entries entirely.

---

### Finding 9 — WhatsApp number format is described but not enforced at the database level

**Classification:** MINOR

**Document/section:** `05-database-design.md` Section 2.9 (`settings.whatsapp_number`, "E.164 format").

**Problem:** Every other business-rule constraint in the schema (price non-negative, quantity positive, status enums) is backed by a `CHECK` constraint. `whatsapp_number`'s E.164 format is documented in prose only, with no corresponding `CHECK (whatsapp_number ~ '^\+[1-9]\d{1,14}$')` or equivalent.

**Why it matters:** Low severity — this is a singleton, admin-only-editable field, not a customer-input field, so the blast radius of a malformed value is "the WhatsApp CTA link is broken until an admin notices," not a security or data-integrity issue.

**Recommended resolution:** Optional: add a regex `CHECK` constraint at migration time, or accept application-layer validation only (also defensible for a singleton row).

---

### Finding 10 — Search has no minimum-query-length or result-count safeguard

**Classification:** MINOR

**Document/section:** `05-database-design.md` Section 9 (Search).

**Problem:** A 1-character search query (`ILIKE '%a%'`) against `name`/`brand.name`/`category.name` will match nearly every row in a small catalog, returning a large, low-relevance result set. This isn't a performance problem at the documented "tens to low hundreds of products" scale, but it is a UX gap the design brief's search-and-filter section doesn't address.

**Why it matters:** Minor UX rough edge, not an architectural risk — worth a one-line mention (e.g. "no minimum length enforced, acceptable at MVP catalog scale") so it isn't mistaken for an oversight later.

**Recommended resolution:** No schema/architecture action needed; optionally note the accepted limitation in `03-design-specification.md`'s search section.

---

### Finding 11 — Admin session cookie has no device/IP binding

**Classification:** MINOR

**Document/section:** `05-database-design.md` Section 17 (Access Control Flow).

**Problem:** The signed cookie, once issued, is a bearer credential — anyone who obtains it (via XSS, physical device access, or a synced browser profile) has full admin access indistinguishable from the legitimate holder until someone notices and manually revokes it. This is inherent to the chosen no-login model and is not a flaw in the design's own terms, but it is the single point of failure for the entire admin surface and isn't explicitly named as an accepted trade-off anywhere.

**Why it matters:** Worth surfacing once, explicitly, rather than leaving it implicit — it's the kind of thing a future security reviewer (`06-security.md`, once written) should confirm is a deliberately accepted risk, not a missed one.

**Recommended resolution:** No architecture change required for MVP at this business's scale. Recommend one explicit sentence in the future `06-security.md`: "the access-control cookie is a bearer credential; device/IP binding was considered and rejected as unnecessary complexity for this scale."

---

### Finding 12 — Three stale "authentication" mentions remain in `01-product-requirements.md`

**Classification:** OBSERVATION

**Document/section:** `01-product-requirements.md` Sections 1, 17, 19 — already self-flagged in `05-database-design.md` Section 18.2/18.3.

**Problem:** `05`'s own consistency check already identifies this: Section 1's "Requires authentication," Section 17's "Admin authentication" MVP-scope bullet, and Section 19's "Admin routes must require authentication" all predate the Section 13 rewrite and now read as stale duplicates.

**Why it matters:** Purely cosmetic — the authoritative Section 13 and the system/database design documents are already consistent with the no-login decision. No functional ambiguity results. Carried forward here only because this audit was asked to check for exactly this class of issue.

**Recommended resolution:** Already correctly identified by the source documents themselves as a future documentation-harmonization pass, not an implementation blocker.

---

### Finding 13 — `categories`/`brands` status transitions have no timestamp

**Classification:** OBSERVATION

**Document/section:** `05-database-design.md` Section 14 (Timestamps).

**Problem:** `categories`/`brands` have `created_at` only, no `updated_at`, so "when was this archived" is not answerable from stored data, unlike the equivalent gap already explicitly flagged for `sales.payment_status` transitions.

**Why it matters:** Low — no requirement currently asks for this. Noted only for completeness since the identical pattern was already flagged for `sales` in the same document.

**Recommended resolution:** None needed now; add `updated_at` if this reporting need ever surfaces, same as the existing `sales` note already recommends.

---

### Finding 14 — No documented CORS/CSRF stance for admin server actions

**Classification:** OBSERVATION

**Document/section:** Not covered in any of `01`–`05`; would belong in the not-yet-written `06-security.md`.

**Problem:** Next.js Server Actions/Route Handlers have partial built-in CSRF mitigations (same-origin checks on mutating requests in recent Next.js versions), but nothing in the documents states this is relied upon, tested, or considered sufficient given the admin surface has no traditional session/CSRF-token pairing to layer on top of.

**Why it matters:** Not a gap unique to this project's unusual access-control model, but worth a line in the eventual security document rather than silent reliance on framework defaults.

**Recommended resolution:** Defer to `06-security.md` as planned; no action needed against `01`–`05`.

---

### Finding 15 — `product_images` upload has no `created_by`/attribution column

**Classification:** OBSERVATION

**Document/section:** `05-database-design.md` Section 2.5.

**Problem:** Every other admin-mutated table (`inventory_transactions`, `sales`, `settings`) carries a `created_by`/`updated_by` attribution FK to `admin_access_tokens`. `product_images` does not — there's no record of which credential/device uploaded a given image.

**Why it matters:** No requirement currently asks for image-upload attribution, and product images are explicitly treated as "pure presentation data" with no audit requirement (Section 12 of `05`). Flagged only because it's the one admin-writable table that breaks the otherwise-consistent attribution pattern.

**Recommended resolution:** None needed; consistent with the documents' own stated reasoning that images carry no business history.

---

## Categories Explicitly Checked With No Findings

- **Requirements not represented in system design:** none found — all PRD functional/non-functional requirements trace to a system-design and database-design counterpart.
- **System-design concepts absent from database design:** none found — all nine entities and every access-control/pagination/search concept in `04` has a corresponding table/index/RLS policy in `05`.
- **Database fields without clear business purpose:** none found — every column traces to a stated requirement or a justified operational need (e.g. `cached_stock` as a documented denormalization, not an orphan field).
- **Cancellation edge cases beyond Finding 4:** the defined unpaid-sale-cancellation path itself (compensating `IN` transaction, `sale_status` transition, idempotency guard via `WHERE` clause) is internally sound and race-safe.
- **Cursor-pagination edge cases beyond what's covered:** the `(created_at, id)` composite ordering and row-value comparison correctly handle concurrent inserts and same-timestamp ties; no additional gap found.

---

## Conclusion

The documents are close to implementation-ready. Resolve Finding 1 (storage bucket policy) before writing any Storage-touching code, since it's a security-shaped gap in an otherwise carefully-specified access model. Findings 2–7 (IMPORTANT) are worth explicit one-line decisions before or during early implementation phases (Sales, Inventory) so they aren't silently resolved differently than the business intends. Findings 8–15 can be resolved inline during implementation without blocking the build.
