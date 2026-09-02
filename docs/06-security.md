# Security Design Specification

## Curated Product Catalog & Inventory Website — Security Model

**Document:** 06-security.md
**Version:** 1.2 — Architecture audit resolution pass: Storage bucket policy fully specified including replace-behavior (Section 9); the stale `invoice_number` contradiction note removed now that `01`/`04`/`05` define it (Section 7); `paid_at`/`paid_by`/`cancelled_at`/`cancelled_by` threaded into Section 7; duplicate product lines rejected at the DB level (Section 6/7); deterministic lock ordering documented (Section 6); `products_public` view documented as the enforced public data boundary, replacing reliance on app-layer masking alone (Section 5)
**Status:** Draft
**Date:** 2026-09-01
**Source of truth:** `01-product-requirements.md`, `02-design-brief.md`, `03-design-specification.md`, `04-system-design.md`, `05-database-design.md`

No migrations, no application code in this document. This document does not change the approved database architecture — it documents the security model around it.

**Non-negotiable framing, restated from the task brief:** neither public/customer access nor internal/admin access uses authentication. No login, no username/password, no PIN, no Supabase Auth, anywhere. Internal access is protected by the approved no-login access-control mechanism (`04` Section 7, `05` Section 17). This document treats that as fixed, not as a gap to quietly reintroduce a login for — every mitigation below works *within* that constraint, not around it.

---

## 1. Trust Boundaries

```text
[Public Browser]          — fully untrusted. Any input, header, cookie, or request it sends
                             is attacker-controlled until validated server-side.
      │  HTTPS
      ▼
[Next.js Client (public)] — untrusted. Runs in the public browser. Ships only NEXT_PUBLIC_*
                             values (Section 14). Never holds service_role, never performs
                             a mutation directly against Supabase.
      │  HTTPS
      ▼
[Next.js Server]          — trusted, but only after re-validating every input. Holds all
                             server-only secrets. Two sub-boundaries inside it:
      │
      ├── Public route handlers (catalog read, search, WhatsApp link resolution)
      │     — no admin capability, uses the Supabase anon key + RLS, same trust level
      │       as a public client for data access purposes.
      │
      └── [Admin Middleware] (04 §7.1) — the actual admin trust gate. Validates the
            signed session cookie before any admin route/action runs. Everything past
            this point is "trusted admin context" ONLY because this check already ran.
                │
                ▼
          [Protected Admin Server Routes/Actions] — trusted. Holds and uses
            SUPABASE_SERVICE_ROLE_KEY. Never reachable except through the middleware above.

[Admin Browser]            — same trust level as Public Browser. An admin's browser is
                             just a browser; it is trusted only to the extent it carries
                             a valid, unexpired, unrevoked signed cookie. It never receives
                             service_role, never talks to Supabase directly with elevated
                             privilege.
      │  HTTPS
      ▼
[Next.js Client (admin)]   — untrusted, same as public client. Renders admin UI, calls
                             admin server routes/actions. Any client-side check here
                             (disabled button, form validation) is UX only.

[Supabase PostgreSQL]      — trusted data store, protected by RLS (Section 5) for the
                             anon path and by never handing service_role to anything
                             outside "Next.js Server → Protected Admin Routes."

[Supabase Storage]         — same trust model as Postgres: public bucket read is open
                             (product images are public data), all writes go through the
                             same server-side service_role path, never direct
                             browser-to-storage upload (Section 9).

[WhatsApp]                 — external, untrusted, and not integrated via API (02 §13,
                             this document §8). The system only ever constructs a
                             wa.me deep link; WhatsApp itself never calls back into
                             this system, so it is not a data trust boundary at all —
                             it is a one-way handoff.
```

**The one sentence that matters most:** nothing that runs in a browser — public or admin — is ever trusted to assert its own authority. The admin browser is distinguished from the public browser by exactly one thing: whether the signed cookie it presents validates. That check happens once, server-side, at the middleware, every request.

---

## 2. Admin Access-Control Flow

Restated in security terms from `04` §7.1 and `05` §17 (which remain the architectural source of truth — this section is the security analysis of that flow, not a redefinition of it).

```text
1. Issuance (admin-to-admin, out of band, e.g. read aloud or shown on a trusted screen)
2. Bootstrap: GET /access/{secret}  →  hash secret  →  look up admin_access_tokens
   →  reject (generic 404) if no match / revoked / expired
   →  issue signed httpOnly Secure SameSite=Strict cookie
3. Every admin request: middleware verifies cookie signature, then re-checks
   revoked_at IS NULL AND expires_at > now() against the DB (not cache-only)
4. Protected route/action runs, using service_role for the actual mutation
5. Revocation: UPDATE admin_access_tokens SET revoked_at = now() — takes effect
   on the credential's very next request, not on next cookie expiry
```

### 2.1 Token entropy

The bootstrap secret is generated with a cryptographically secure random source (`crypto.randomBytes` / `crypto.getRandomValues`, never `Math.random`), **minimum 256 bits (32 bytes)** of entropy, encoded URL-safely (base64url or hex). At this length, brute-forcing the secret by guessing `/access/{secret}` is computationally infeasible (2^256 keyspace) regardless of any rate limiting — rate limiting (Section 13) is defense-in-depth against automated scanning noise, not the thing making brute force impractical.

### 2.2 Token hashing

**The plaintext secret is never stored.** `admin_access_tokens.token_hash` stores a SHA-256 (or stronger) hash of the secret (`05` §2.1). Bootstrap validation computes `hash(presented_secret)` and compares against stored `token_hash` using a constant-time comparison (`crypto.timingSafeEqual` or equivalent) — a naive `===`/string-equality check on a hash comparison is a timing side channel and must not be used, even though the practical exploitability against a 256-bit secret is low; constant-time comparison is cheap and removes the question entirely. SHA-256 without per-token salt is acceptable here specifically because the input (a 256-bit random secret) has enough entropy that a rainbow-table/precomputation attack is infeasible — this is not password hashing (low-entropy human input needing bcrypt/argon2-style slow hashing), it's a high-entropy token, and a fast hash is the correct tool, not a gap.

### 2.3 Token expiration

`expires_at` (hard cap, e.g. 90 days from issuance per `05` §2.1) is checked on **every** request, not just at bootstrap — an expired credential stops working immediately, without requiring a revocation action. This bounds how long a leaked-but-undetected credential stays valid, independent of whether anyone notices the leak.

### 2.4 Token revocation

`revoked_at` is admin-settable at any time (`UPDATE ... SET revoked_at = now()`), checked against the DB on every request (Section 2, step 3) — not just cached in the signed cookie, which by itself has no way to reflect a revocation that happened after the cookie was issued. This DB check on every admin request is a deliberate small latency cost in exchange for revocation actually working instantly; caching it (e.g. in the cookie payload only) would mean a revoked device keeps working until its cookie naturally expires, which defeats the purpose of having revocation at all.

### 2.5 Cookie properties

- `httpOnly` — inaccessible to JavaScript, closing the most common XSS-to-cookie-theft path (Section 12).
- `Secure` — never sent over plain HTTP; combined with HTTPS-only deployment (Section 19), the cookie never travels in cleartext.
- `SameSite=Strict` — not sent on any cross-site request, including top-level cross-site navigation (stricter than `Lax`); this is the primary CSRF mitigation, analyzed fully in Section 11.
- Signed (HMAC, server-only secret distinct from any token hash) — the cookie payload (`{ token_id, issued_at }`) cannot be forged or tampered with by a client; a modified cookie fails signature verification and is treated as absent.
- Scoped to the admin subdomain only (`Domain`/`Path` restricted) — never set on the public catalog domain, so a public-site XSS (however unlikely, Section 12) has no admin cookie to steal in the first place.

### 2.6 Session lifetime

Cookie `Max-Age` is capped at the credential's remaining time to `expires_at` — a cookie is never issued with a lifetime that would outlive its underlying credential. Within that bound, a practical session length (e.g. matching the 30-90 day credential expiry, `05` §2.1) trades off convenience against exposure window; shorter is more secure, longer is less friction for a small non-technical team. No sliding/rolling refresh is defined for v1 — the cookie lifetime is fixed at issuance, re-bootstrap is required after expiry, keeping the model simple and matching "no login flow to maintain."

### 2.7 Invalid token behavior

Any invalid state — malformed secret, no matching hash, revoked, expired, tampered/unsigned cookie, missing cookie — produces the **same generic 404**, never a distinguishing 401/403/redirect-to-login. A 401/403 (or a login-page redirect) confirms to a prober that a protected admin surface exists at that path; a 404 gives an attacker nothing to distinguish "wrong guess" from "right path, wrong credential" from "nothing here at all."

### 2.8 `noindex`/robots protections

The admin subdomain serves `X-Robots-Tag: noindex, nofollow` on every response and a `robots.txt` disallowing the entire subdomain, so it is never crawled, cached, or surfaced in search results — reduces the odds of the admin path itself becoming discoverable through indexing rather than through a deliberate leak.

### 2.9 Referrer leakage

Admin pages set `Referrer-Policy: no-referrer` (or at minimum `same-origin`) — without this, navigating from an admin page to any external link (a product's brand website, a support doc, anything) would leak the current admin URL (and, worse, the one-time bootstrap URL if a staff member clicked through from it before it converted to a cookie) into that third party's server logs via the `Referer` header. This closes the exact leak vector Section 7.2 of `04` flagged against the "bare capability URL" alternative — applying it here as defense-in-depth even though the bootstrap URL is meant to be visited once and not linked from anywhere.

### 2.10 Per-device credential attribution

Each `admin_access_tokens` row is one device/credential, labeled descriptively (`05` §2.1). This is device attribution, not identity verification — see Section 15 and the explicit limitation in Section 18.

---

## 3. Public Access

Public catalog routes (`03` component set: catalog grid, search, filters, product detail, WhatsApp CTA) require no session, no cookie, no token — fully open, matching PRD Section 13/14.

**Public users must be able to:**
- Browse the catalog (paginated, `05` §10).
- Search (`05` §9) and filter by category/brand/availability.
- View product detail pages, including the resolved two-state availability label (`05` §3.2 in `04`; `04`'s own Section 3.2).
- Assemble a client-side cart and submit it as a new sale (`01` §5.1a, Milestone 4) — the one deliberate, narrow exception to "no public mutation," covered below.
- Initiate a WhatsApp message via the pre-filled deep link (Section 8).

**Public users must never be able to directly mutate a table.** This is enforced at two independent layers (defense-in-depth, not redundancy for its own sake):
1. **RLS** (Section 5) — the `anon` role has zero `INSERT`/`UPDATE`/`DELETE` grants on any table, full stop. This still holds unconditionally — nothing in Milestone 4 grants `anon` any table privilege.
2. **No direct-write route exists on the public surface** — public route handlers/Server Components only ever perform `SELECT`-shaped queries. The one exception is the public order-submission Server Action (`createPublicSale()`, Section 4), which is not a direct table write: it calls the same validated, atomic `create_sale()` RPC the admin path uses, accepting only `product_id`/`quantity`/`customer_name`/`customer_phone`/`note` — never price, stock, status, or attribution. A public visitor still cannot reach `sales`/`sale_items`/`inventory_transactions` directly, cannot read them back (Section 5's RLS still applies), and cannot invoke any other admin mutation (product/category/brand/inventory/settings/payment/cancellation all remain behind the Section 2 middleware, unchanged).

---

## 4. Admin Mutation Boundary

All admin mutations (product/category/brand CRUD, inventory transactions, `payment_status`/`sale_status` transitions, settings updates, token issuance/revocation) happen exclusively in Next.js **Server Components/Route Handlers/Server Actions**, gated by the Section 2 access-control middleware — server-side code that never ships to the browser.

**Sale *creation* is the one deliberate exception to "admin-gated," added in Milestone 4 (`01` §5.1a):** a public Server Action (`createPublicSale()`) lets an unauthenticated customer submit their cart directly, alongside the pre-existing admin-gated `createSale()` — both are thin wrappers around the same `create_sale()` Postgres RPC (`05` §6), so the atomicity/consolidation/stock-check guarantees are identical regardless of entry point. What differs: the public path takes no admin session (there isn't one to check) and attributes `created_by` to a sentinel, permanently-revoked `admin_access_tokens` row that exists solely as that column's required FK target — it authenticates nothing and cannot be used to obtain admin access. The public path still never accepts client-supplied price, stock, invoice number, or attribution — only `product_id`/`quantity`/`customer_name`/`customer_phone`/`note`, exactly like the admin path.

**`SUPABASE_SERVICE_ROLE_KEY` must never appear in:**
- Client bundles (any file imported by a `"use client"` component or client-side entry point).
- Public environment variables (anything prefixed `NEXT_PUBLIC_*` is bundled into client JS by Next.js — the service_role key is never given that prefix, and no code ever re-exports it under one).
- Browser requests (never sent as a header, query param, or body field from client-side `fetch`).
- HTML (never interpolated into server-rendered markup, meta tags, or inline scripts).
- Serialized props (never passed as a prop from a Server Component to a Client Component — Next.js serializes props across that boundary into the client bundle, so anything passed this way is browser-visible by definition).
- Frontend source (not referenced anywhere under a client-reachable code path, and not committed to the repository — read only from server-side environment configuration, e.g. Vercel's server-only environment variables).

**Why this matters:** `service_role` bypasses Row Level Security entirely by Supabase design (Section 5) — it is the single most powerful credential in this system, equivalent to unrestricted database access. If it ever reached a browser, every protection described in this document (access-control middleware, RLS, input validation) becomes irrelevant simultaneously, because the browser could simply talk to Supabase directly with full privilege. This is why Section 19's pre-production checklist treats "grep the client bundle for the service_role key" as a mandatory, non-optional step, not a nice-to-have.

---

## 5. Row Level Security (RLS)

Full policy detail already lives in `05` §11 — this section restates the *security intent*, not new policy.

**Public (`anon`) intent:** read the minimum data required for the public catalog, nothing else.
- `categories`/`brands`: `SELECT` only, `status = 'ACTIVE'` or referenced by a visible product (`05` §11.1's two-branch rule).
- `products`: base-table `SELECT` restricted to `status = 'ACTIVE'` rows as a backstop, but public application code queries the `products_public` view (`05` §11.1a), not the base table — the view has no `is_manually_unavailable`/`cached_stock` columns at all, closing the column-level exposure gap flagged by the architecture audit (base-table RLS controlled *row* visibility only; the view now controls *column* visibility too, so the boundary no longer depends on every route remembering not to over-select).
- `product_images`: `SELECT` only, joined to a visible product.
- `inventory_transactions`, `sales`, `sale_items`, `admin_access_tokens`, `settings`: **no `anon` policy at all** — not "restricted," genuinely absent, meaning RLS's default-deny closes them entirely.
- No `INSERT`/`UPDATE`/`DELETE` grant for `anon` on any table, anywhere.

**Admin intent:** mutations occur exclusively through protected server-side operations using `service_role` — **not** through an RLS policy for an `authenticated` role, because no such role is ever issued (no login exists to issue one). There is deliberately no "admin RLS policy table" to point to, because RLS is not the mechanism gating admin writes at all.

**This is the sentence this document must not soften:** `service_role` bypasses RLS entirely. RLS provides zero protection against a request that already holds `service_role`. The only thing standing between "the internet" and an admin mutation is the Section 2 access-control middleware running before any server code touches `service_role`. If that middleware is ever missing from one route, misconfigured, or bypassable, RLS does not catch the mistake — there is no policy layer underneath it to fall back on for that route. This is a real, load-bearing architectural fact, not a caveat to bury: **every admin route/action must be verified to sit behind the middleware, individually, as part of any code review or pre-production check (Section 19)** — RLS cannot be relied upon as a safety net for a forgotten check.

---

## 6. Inventory Security

Inventory correctness rules from `05` §5 restated as security controls:

- **The client never has a write path to `cached_stock`.** No public or admin client-side code constructs a query that touches this column — all writes happen inside server-side transactional code (`05` §5.3-5.4), and that code is the *only* thing capable of writing it. `05` §5.6 already establishes this as an architectural rule ("not permitted from normal application code"); this section restates it as a security boundary: even a compromised/malicious admin credential cannot set `cached_stock` to an arbitrary value directly — it can only trigger the same trusted server-side flow every other stock mutation goes through (Stock In/Out action, or a sale), which is itself bounded by the `CHECK (cached_stock >= 0)` constraint and quantity validation (Section 10).
- **No arbitrary `inventory_transactions` insert path.** Every insert into this table happens as part of one of exactly two server-side flows: the Stock In/Out admin action, or sale recording/cancellation (`05` §6.1-6.4). There is no generic "create an inventory transaction" endpoint accepting free-form `product_id`/`type`/`quantity` from a client — the two legitimate flows are the entire surface area.
- **Quantities cannot be manipulated to bypass the negative-stock rule.** `quantity > 0` is DB-enforced (`CHECK`) independent of any application-level validation, and the `cached_stock >= 0` CHECK is the final backstop inside the same transaction as any write (`05` §5.3) — even a bug in server-side validation logic cannot commit a transaction that would violate this, because the database itself refuses it.
- **No fake sales.** Sale creation is one atomic server-side transaction (`05` §6.2) requiring valid `product_id`s and quantities against real product rows, executed only through the admin mutation boundary or the public order-submission action (Section 4) — never a direct client write. There is no client-reachable path that inserts a `sales`/`sale_items` row without also going through the real stock-out logic and its constraints, regardless of which of the two entry points is used.
- **No duplicate product lines.** `sale_items` carries `UNIQUE (sale_id, product_id)` (`05` §2.8/6.1b) — a sale can only ever move stock for a given product once per sale, at the database level, regardless of what a client requests; the server consolidates duplicate line-item requests before insert, and the constraint is the backstop if that consolidation is ever buggy.
- **Deadlock-resistant, not just deadlock-detected.** Multi-product sale/cancellation transactions lock `products` rows in ascending `product_id` order (`05` §6.2/6.4) before mutating `cached_stock` — this is a correctness/availability property more than a confidentiality/integrity one, but it's listed here because an unordered-lock deadlock under concurrent admin activity would otherwise be a self-inflicted denial-of-service on the inventory write path, worth closing structurally rather than leaving to Postgres's deadlock detector to abort one side.

---

## 7. Sales / Payment Security

**The client cannot directly modify `sale_status`, `payment_status`, `paid_at`/`paid_by`, `cancelled_at`/`cancelled_by`, `invoice_number`, sale totals, or sale items.** All of these change through exactly the server-side operations `05` §6.1a/6.2-6.4 define — a Server Action/route handler that accepts a `sale_id` (and, for payment, nothing else — no arbitrary status value is accepted from the client beyond triggering the one defined `PENDING → PAID` transition, which also sets `paid_at`/`paid_by` server-side from the authenticated request context, never from client input) and performs the corresponding guarded `UPDATE`. There is no generic "update this sale's fields" endpoint; each defined transition is its own narrow operation. `invoice_number` is never client-suppliable at all — it is a database `DEFAULT` expression drawing from a Postgres sequence (`05` §6.1a), computed at `INSERT` time; there is no code path, admin or otherwise, that passes a value for this column.

**Sale totals (`sale_items.subtotal`, `unit_price`) are computed and snapshotted server-side at sale creation** (`05` §2.8, §6.1) from the product's current price — never accepted as client-supplied values. A client cannot submit an arbitrary `unit_price` or `subtotal`; it can only submit `product_id` + `quantity`, and the server looks up the real price.

**The approved workflow is unchanged and re-stated here as the security-relevant sequence:**

```text
Sale created/confirmed (server-side, admin mutation boundary)
    → invoice_number generated server-side (DB sequence DEFAULT, 05 §6.1a)
    → inventory OUT recorded atomically (same transaction, 05 §6.1, line items
      locked in ascending product_id order, 05 §6.2)
    → payment_status = PENDING (default, never client-supplied)
    → invoice text generated server-side from the sale's real data, using the
      admin-configurable invoice_message_template (05 §7.2), including invoice_number
    → invoice sent manually via WhatsApp (human action, outside the system)
    → customer transfers manually (outside the system)
    → customer sends proof via WhatsApp (outside the system, never uploaded)
    → seller verifies manually (human judgment, outside the system)
    → admin triggers the one defined PENDING → PAID transition, recording paid_at/
      paid_by server-side from the request context (05 §6.3)
```

**There is no automated payment verification anywhere in this flow** — no step in this sequence is triggered by anything other than a deliberate human action through the admin mutation boundary. This is a repeated architectural fact (also stated in `01` §12.1, `04` §6.3, `05` §6.3) restated here specifically as a security property: there is no payment-adjacent code path an attacker could feed false data into to mark a sale falsely `PAID`, because no code path *reads* payment evidence at all — the only input to the transition is an authenticated-by-access-control admin's deliberate click.

---

## 8. WhatsApp Security

The system integrates with WhatsApp only via **deep links** (`wa.me/{number}?text={encoded_message}`) — never the WhatsApp Business API, never a webhook, never a callback. This means WhatsApp is a one-way handoff (Section 1) with no credentials to protect on that side and no inbound trust boundary to secure.

- **WhatsApp destination number:** stored in `settings.whatsapp_number` (`05` §2.9), never hardcoded in any component (`04`/`05` locked decision). Not directly public-readable (`05` §11.1 — no `anon` policy on `settings`); exposed to the public browser only as an already-assembled `wa.me` link constructed server-side, never as a queryable field a public client could read independent of that link.
- **Message templates:** `order_message_template`/`availability_message_template`/`invoice_message_template` (`05` §2.9/7.2), admin-editable, resolved server-side by substituting plain-text placeholders (`{brand}`, `{product_name}`, `{price}`, `{qty}` for the first two; `{invoice_number}`, `{customer_name}`, `{item_list}`, `{subtotal}`, `{shipping_cost}`/`{other_cost}`, `{total}` for the invoice template) — resolution is string substitution into a URL-encoded query parameter (or plain text for admin-UI display/copy), not HTML rendering, so there is no injection surface into a rendered page from this data (Section 12 covers the general no-untrusted-HTML rule this also satisfies). An unrecognized `{placeholder}` in an admin-edited template is rejected or stripped at save time (Section 10), never passed through blindly.
- **Customer phone number:** `sales.customer_phone` is entered either by an admin recording a sale, or **by the customer themselves during public order submission** (`01` §5.1a/§12, Milestone 4) — validated server-side the same way regardless of source (Section 10), never trusted as anything more than a free-text contact field, and never used to send the customer anything automatically (it's stored for the admin's manual WhatsApp follow-up, nothing calls or messages it programmatically). The public side still only ever *sends* the business's WhatsApp number to the customer via the deep link — it does not message the customer's own number on its own. Minimum retention discussed in Section 16.
- **Generated invoice messages:** assembled server-side from real sale data at generation time, sent manually by a human — the system does not auto-send anything to WhatsApp (no API integration exists to do so), so there is no automated-message-abuse surface.
- **Preventing accidental exposure:** the narrow public read path (Section 5, `settings` has no direct `anon` `SELECT`) ensures the raw `whatsapp_number`/templates are never fetchable as data by a public client independent of the one resolved link they're meant to produce — closing the gap NFR Section 19 (`01`) already calls out ("sensitive configuration must not be exposed to the client").

**No WhatsApp API integration is introduced by this document** — reaffirming the constraint explicitly, since it would be the most natural-seeming "upgrade" to reach for and is explicitly out of scope.

---

## 9. Storage Security (Supabase Storage — product images)

Supabase Storage has its own RLS-style policy system on `storage.objects`, keyed the same way Postgres RLS is (by role) — since no `authenticated` role is ever issued (no login), the same architectural pattern from Section 5 applies here: **no direct browser-to-storage write path, for either public or admin browsers.**

- **Public read:** the product-images bucket is public-readable (`SELECT` on `storage.objects` for that bucket granted to `anon`, or the bucket marked public) — product photos are not sensitive data, and this matches `03`'s requirement that images render directly from Storage URLs on the public catalog.
- **Admin upload/replace/delete:** performed exclusively through a server-side admin route (Section 4's boundary) using `service_role` — never a client-side direct-to-Storage upload using a public/anon key. This means the file itself passes through server-side code before landing in Storage, which is what makes the validation below enforceable at all; a direct browser-to-Storage upload would have no server-side checkpoint to validate through.
- **File type restrictions:** server-side allow-list on MIME type/magic-byte sniffing (not just trusting the client-supplied `Content-Type` header, which is attacker-controlled) — `image/jpeg`, `image/png`, `image/webp` only. Anything else is rejected before it reaches Storage.
- **File size restrictions:** a server-enforced maximum (e.g. 5 MB per image) rejected before upload — bounds storage cost and rules out trivial denial-of-service-by-large-file.
- **Safe paths/naming:** generated server-side as `product-images/{product_id}/{uuid}.{ext}` (`05` §4a.2), never derived from user-supplied filenames — closes path-traversal (`../../`) and filename-collision/overwrite risks entirely, since the client never controls the stored path.
- **Replacement deletes the old object (resolves audit Finding 1's open sub-question):** replacing one of a product's images is upload-new-then-update-DB-row-then-delete-old-object, in that order (`05` §4a.7) — never delete-then-upload, so a mid-operation failure can never leave `product_images.url` pointing at nothing. If the final delete fails, the operation is still treated as successful (the DB already points at the new, live image) and the orphaned object is a logged cleanup item, not a request failure — a few stray KB of Storage cost is an acceptable trade against failing a visible admin action over a housekeeping step.
- **Bucket visibility:** the `product-images` bucket is configured public-read at the Supabase bucket level (`05` §4a.1), not via a `storage.objects` RLS `SELECT` policy for `anon` — the simpler, equivalent mechanism for data that is uniformly public with no per-object visibility rule.
- **Prevention of arbitrary file uploads:** the combination of "no direct client-to-Storage path exists" + "server validates type/size before ever calling Storage" means there is no route, public or admin, capable of storing an arbitrary file (executable, script, oversized blob) — the validation isn't a check that can be bypassed by hitting Storage directly, because Storage itself has no client-reachable write grant to bypass to.
- **Public users can never upload** — there is no public-facing upload UI or route anywhere in the approved component set (`03`); this is a structural absence, not a permission that happens to be denied.

---

## 10. Input Validation

**Server-side validation is the security boundary. Client-side validation (`03`'s form states, disabled buttons, inline errors) is UX only** — every server route/action re-validates independent of whatever the client already checked, because the client cannot be trusted to have run its own checks honestly.

| Data | Validation |
|---|---|
| Product name | Required, non-empty after trim, reasonable max length (e.g. 200 chars) |
| Product price | Required, numeric, `>= 0`, matches `numeric(12,2)` scale — reject non-numeric input, reject negative, reject absurd magnitudes as a sanity bound |
| Quantity (inventory, sale items) | Required, integer, `> 0` — mirrors the DB `CHECK`, checked before the query even runs so the error is a clean validation message, not a raw constraint-violation error surfaced to the UI |
| Category / Brand references | Must reference an existing row by `id`; for product assignment, must currently be `status = 'ACTIVE'` (`05` §3.3) — a stale/tampered client request naming an archived or nonexistent id is rejected |
| Sale | `customer_name`/`customer_phone` optional but length-bounded and trimmed; at least one `sale_item` required; every `product_id` in items must exist and be a real product |
| Sale items | `quantity > 0`; `product_id` must exist; `unit_price` is never accepted from the client (Section 7) — always server-derived from `products.price` at creation time; duplicate `product_id`s in the incoming request are consolidated (summed quantity) before insert, never submitted as two rows (`05` §6.1b) — the `UNIQUE (sale_id, product_id)` constraint is the DB-level backstop if this consolidation is ever buggy |
| Settings | `whatsapp_number` validated against E.164 format (`05` §2.9); message templates (`order_message_template`/`availability_message_template`/`invoice_message_template`) checked for well-formed placeholder tokens (unknown `{placeholder}` rejected or stripped, not passed through blindly) and a reasonable max length |
| Customer phone numbers | Loose format validation (digits, optional `+`/spaces/dashes normalized) — this is a free-text field entered by an admin from a WhatsApp conversation, not a field requiring strict international-format enforcement, but still bounded in length and stripped of control characters |
| Image metadata | `alt_text` length-bounded, `sort_order` non-negative integer, `is_primary` boolean coerced (not accepted as an arbitrary string) — actual file validated per Section 9, separate from this metadata |

All validation happens **inside the same server-side route/action that performs the mutation**, before any query is constructed — never assumed to have already happened because "the form checked it."

---

## 11. CSRF / Request Protection

The admin session is cookie-based, which makes CSRF a real threat class to analyze explicitly, not wave away.

**Threat model:** a malicious third-party page, visited by someone with a valid admin cookie in their browser, attempts to trigger a state-changing request (e.g. a forged `<form>` POST or `fetch`) against an admin mutation route — the browser would normally attach cookies automatically to same-origin-looking requests regardless of which page initiated them, which is exactly what CSRF exploits.

**Primary mitigation: `SameSite=Strict` (Section 2.5).** With `Strict`, the browser does not attach the cookie to *any* cross-site request, including a top-level navigation from an external link (stricter than `Lax`, which still allows cookie-attachment on top-level GET navigations). This defeats the classic forged-form-POST and forged-`fetch` CSRF pattern outright for any browser correctly implementing the modern `SameSite` spec (all current major browsers).

**Why `SameSite=Strict` alone is not treated as sufficient, and what's added:**
- **Browser/edge-case coverage:** older or misconfigured user agents, browser extensions that alter cookie behavior, or a future regression in this exact configuration are all realistic enough that a cookie attribute should not be the *only* layer for a mutation boundary this sensitive.
- **Defense-in-depth: Origin/Referer verification on every state-changing admin request.** The server checks that the request's `Origin` (or `Referer` as fallback) header matches the admin subdomain before processing any mutation — a cross-site-originated request fails this check independent of cookie behavior.
- **Next.js Server Actions' built-in protections:** Server Actions include their own same-origin enforcement (an encrypted, non-guessable action reference tied to the origin that rendered it) — using Server Actions for admin mutations (rather than hand-rolled API routes accepting arbitrary POST bodies) gets this protection by construction, and is the preferred implementation pattern for this reason, not just convenience.
- **No CSRF-token-in-cookie pattern is introduced** — that pattern exists specifically to work around session cookies that lack `SameSite` protection; it would be redundant machinery layered on top of a mechanism (`Strict` + Origin check) that already covers the same threat more simply, and adding it would itself require yet another value to protect, for no additional real protection at this system's scale.

**GET requests never mutate.** Every admin route that changes data is a `POST`/Server Action, never a `GET` with side effects — closes the (separate, older) CSRF-via-image-tag/link-prefetch class of attack that targets naive GET-based mutations.

---

## 12. XSS / Injection

**No untrusted content is ever rendered as HTML.** React's default JSX rendering escapes all interpolated text content automatically; `dangerouslySetInnerHTML` is not used anywhere in this system's approved component set (`03`) for any user- or admin-supplied string — product names/descriptions, admin-entered settings/templates, and customer names all render as plain escaped text, never parsed as markup.

- **Product names/descriptions:** admin-entered, rendered as text content only — even if an admin (accidentally or maliciously, Section 18) enters `<script>` in a description, it renders as literal visible text on the public catalog, not executable script.
- **Admin-entered settings/templates:** same treatment — a message template containing HTML-looking text is only ever used as a plain-text WhatsApp message body (Section 8), never rendered into a webpage as HTML, and is URL-encoded when placed into the `wa.me` link (encoding neutralizes it as markup regardless of destination).
- **Customer names:** admin-entered from a WhatsApp conversation, same escape-by-default rendering wherever displayed (admin sales list/detail).
- **WhatsApp message content:** constructed via string substitution into a URL-encoded parameter (Section 8) — not HTML at any point in its lifecycle, so classic HTML-injection XSS doesn't apply to this specific output path; if the WhatsApp app itself renders any markup from message text is outside this system's control and outside this document's scope.
- **Database query parameters:** every query (including the `ILIKE` search, `05` §9) uses parameterized queries via the Supabase client library / prepared statements — user input is never string-concatenated into a raw SQL string. This closes SQL injection structurally: the search term is bound as a parameter, so characters like `%`, `_`, `'`, or `--` in a search query are treated as literal search text, not SQL syntax, regardless of what a user types.

---

## 13. Rate Limiting / Abuse

v1 protections, deliberately not reaching for new paid infrastructure beyond what the stack already provides (PRD Section 18/G6):

- **Bootstrap access attempts (`/access/{secret}`):** rate-limited per source IP (e.g. a sliding window at the edge/middleware layer — a small number of attempts per minute) before even reaching the token-hash lookup. Given 256-bit token entropy (Section 2.1), this is defense-in-depth against scanning noise and accidental hammering, not the thing preventing brute force (brute force is already infeasible at this entropy) — its real value is reducing log noise and slowing down any automated prober enough that the generic-404 behavior (Section 2.7) is the more interesting signal to notice first.
- **Public catalog endpoints (listing, search, product detail):** light rate limiting per IP on the search endpoint specifically (the one endpoint doing a non-trivial query, `05` §9) to bound accidental or deliberate scraping load; plain catalog/detail reads are cheap, indexed, cacheable reads and don't need aggressive limiting beyond whatever Vercel's platform-level protections already provide.
- **Admin mutation routes:** rate-limited per access token (not just per IP, since a staff member's IP is expected to vary — mobile/home networks) — bounds the damage rate if a credential is compromised and used for automated abuse (e.g. scripted rapid stock manipulation), without needing to know *who* is behind the credential (consistent with Section 18's limitation).
- **Implementation approach for v1:** a lightweight in-memory or edge-based counter (e.g. Vercel Edge Middleware with a short-lived counter, or Next.js middleware with a simple fixed-window check) is sufficient and adds no new infrastructure dependency. **Known limitation, flagged rather than hidden:** a purely in-memory counter is per-serverless-instance and does not share state across concurrent instances, so it under-counts under high concurrency — acceptable for this system's realistic traffic (a small curated catalog, a handful of admin devices), with a documented upgrade path to a shared store (e.g. Upstash Redis, which has a free tier) if real abuse patterns are ever observed. Not built now, per YAGNI — this is a note for future-you, not a requirement to implement speculatively.

---

## 14. Secrets and Environment Variables

| Variable | Scope | May reach browser? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Yes — Supabase project URL is not sensitive; it's the address of a service protected by RLS |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Yes — the anon key is designed by Supabase to be public; it identifies the `anon` role, and all of that role's actual access is bounded entirely by RLS (Section 5). Exposing it is not a leak, it's the intended usage |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | **Never.** See Section 4 in full — this is the one secret whose exposure compromises the entire system |
| Admin cookie signing secret (HMAC key) | Server-only | Never — if exposed, an attacker could forge a valid signed cookie for any `token_id` without ever possessing a real bootstrap secret, fully defeating Section 2 |
| Admin bootstrap secrets (plaintext, per-credential) | Never stored anywhere, including env vars | N/A — these are generated at issuance time, shown once, and only their hash persists (Section 2.2); there is no "the" bootstrap secret to configure as an environment variable, since each device has its own |
| `whatsapp_number` / message templates | Stored in `settings` (DB), not env | Not directly — only reaches the browser as an already-resolved `wa.me` link, never as a raw queryable value (Section 8) |
| Supabase direct DB connection string (if ever used outside the Supabase client library, e.g. for a migration tool) | Server-only / CI-only | Never in application runtime code reachable by a browser |

**Explicit rule:** any environment variable prefixed `NEXT_PUBLIC_` is bundled into client-side JavaScript by Next.js at build time — this is a hard platform behavior, not a convention that can be "mostly" followed. The only two variables in this system that should ever carry that prefix are the Supabase URL and anon key, both listed above as intentionally public. Every other secret is read only in server-side code (Route Handlers, Server Actions, Server Components that don't pass it to a client boundary) and never given that prefix.

---

## 15. Auditability

No new audit-log table is introduced — the existing architecture already carries attribution everywhere it matters, via `admin_access_tokens` (`05` §2.1) as the FK target for every `created_by`/`updated_by` column.

**The label identifies an access credential/device, not a cryptographically verified human identity** — restated here exactly as required, and consistent with `04`/`05`'s framing throughout (Section 18 expands on the consequence of this).

**Actions that retain attribution today, per the approved schema:**
- Every `inventory_transactions` row — `created_by` (which credential performed a Stock In/Out, or triggered a sale's automatic stock-out/cancellation restoration).
- Every `sales` row — `created_by` (which credential recorded the sale).
- `settings.updated_by` — which credential last edited WhatsApp number/templates.

**Not currently attributed, flagged rather than silently added (mirrors `05` §14's already-flagged note):** the `PENDING → PAID` and `CONFIRMED → CANCELLED` transitions on an existing `sales` row don't have their own `updated_by`/timestamp column — `sales.created_by`/`created_at` only capture who created the sale, not who later marked it paid or cancelled it. This is the same gap `05` v1.4 already surfaced and deliberately left open (no `sales.updated_at`) rather than deciding unilaterally; this document does not silently add a column to close it, consistent with this task's constraint against silently changing the approved architecture. If per-transition attribution becomes a real requirement, it's a small schema addition (e.g. `sales.payment_updated_by`, `sales.payment_updated_at`) at that time.

---

## 16. Data Privacy

Minimum viable data, per PRD's own sales schema (`01` §12) — nothing beyond what the approved fields already capture:

- **Customer name:** `sales.customer_name`, optional/nullable. Free text, entered by an admin from a WhatsApp conversation — not a required field, since the business doesn't need it to complete the workflow (only the WhatsApp conversation itself does).
- **Customer WhatsApp number:** `sales.customer_phone`, optional/nullable, admin-entered — never collected from an unauthenticated public form or stored anywhere on the public/catalog side. The public side never asks a customer for identifying information at all (`02`'s "browse independently, purchase personally" principle).
- **Sales records:** exactly the fields in `05` §2.7/2.8 — no additional customer metadata (no address, no email, no ID/KTP number, no date of birth) is collected anywhere in the approved schema, and this document does not propose adding any.
- **Payment status:** `PENDING`/`PAID` only (Section 7) — no payment method detail, no card/bank account number, no transaction reference number is stored; the proof itself lives and stays in the WhatsApp conversation, never uploaded to or referenced by this system (Section 9 has no payment-proof-image handling, matching `01` §12.1's explicit exclusion).

**No unnecessary customer information is collected, by construction** — the schema simply has no field for anything beyond name/phone, and this document does not introduce one.

---

## 17. Threat Model

| Threat | Practical mitigation |
|---|---|
| Leaked admin access URL/token | 256-bit entropy makes guessing infeasible (2.1); per-device tokens mean one leak requires revoking one row, not a global rotation (2.4); hard expiry bounds exposure window even if undetected (2.3); generic 404 means a leaked-but-wrong guess teaches an attacker nothing (2.7) |
| Stolen admin session cookie (device compromise, e.g. malware, physical access) | `httpOnly` prevents JS-based theft via XSS (2.5, 12); `Secure` + HTTPS-only prevents network interception (19); revocation stops the specific credential immediately once noticed (2.4); this is the scenario Section 18 explicitly acknowledges has no further mitigation beyond these — see that section |
| Malicious public user | No mutation capability exists on the public surface at all (Section 3) — not a permission check to defeat, a capability that isn't present; RLS closes every table to `anon` writes as a second layer |
| Malicious admin/device (an otherwise-legitimate credential used maliciously) | Rate limiting per token bounds automated abuse rate (13); attribution (15) identifies *which device*, enabling revocation of that specific credential once noticed; this is fundamentally an insider-risk scenario this system cannot fully prevent given the no-authentication requirement — see Section 18 |
| XSS | No `dangerouslySetInnerHTML`, all user/admin content rendered as escaped text (12); `httpOnly` cookie limits the blast radius of any XSS that did occur (can't steal the admin cookie via `document.cookie` even if a script executes) |
| CSRF | `SameSite=Strict` cookie + Origin/Referer verification + Server Actions' built-in same-origin enforcement (Section 11) |
| Unauthorized inventory manipulation | No client write path to `cached_stock`/`inventory_transactions` exists outside the two defined server-side flows (Section 6); DB `CHECK` constraints are the final backstop even against a bug in that server code |
| Unauthorized sales/payment manipulation | No client-settable `payment_status`/`sale_status`/`invoice_number`/totals — only narrow, guarded server-side transitions exist (Section 7); prices are always server-derived, never client-supplied; duplicate product lines rejected at the DB level (Section 6) |
| Malicious image upload | Server-side MIME/magic-byte + size validation before Storage write; no direct browser-to-Storage path exists to bypass that validation (Section 9); generated (not user-supplied) storage paths prevent traversal/overwrite |
| Internal operational data leaking to public clients (`cached_stock`, `is_manually_unavailable`) | `products_public` view exposes neither column, structurally, rather than relying on API-layer discipline to never select them (Section 5, `05` §11.1a) |
| Database credential exposure | `service_role` never reaches the browser (Section 4); anon key is safe-by-design to expose (Section 14); no DB connection string used in browser-reachable code |

---

## 18. Security Limitations

**This must be stated plainly, not softened:**

Because the business has explicitly refused authentication/login/password/PIN, **possession of a valid admin access credential (the bootstrap secret, or the signed cookie derived from it) effectively grants full admin access.** If a credential leaks, or an admin's session cookie is stolen (e.g. via a compromised device), **the system cannot identify the human being using it.** It can identify *which registered device/credential* is being used (Section 2.10, 15) — it cannot verify that the person currently holding that device is the person it was originally issued to.

**This is a fundamentally different security property than normal user authentication, and this document does not claim otherwise.** A conventional login system can (with MFA, password rotation, session invalidation tied to a verified identity) distinguish "the legitimate user" from "someone who obtained their credential" with more confidence than a bearer-credential-only model can. This system cannot make that distinction at all, by design, because the business requirement removes the mechanism (verified identity) that would make it possible.

**What mitigates this, without pretending to solve it:**
- High-entropy credentials (2.1) — makes obtaining a credential without being given it computationally infeasible; the realistic leak vectors are social/physical (a shared screenshot, a lost unlocked device), not brute force.
- HTTPS everywhere (19) — the credential/cookie never travels in cleartext, closing network-interception leak vectors.
- `httpOnly` + `Secure` cookies (2.5) — closes the JS-exfiltration and cleartext-transmission leak vectors specifically.
- Expiration (2.3) — bounds exposure duration even for an undetected leak.
- Revocation (2.4) — stops a *known-compromised* credential immediately, once noticed.
- Per-device credentials (2.10) — contains the blast radius of one leak to one device, and makes "who/what was compromised" answerable at the device level even though "which human" is not.
- Minimal exposure (Section 4, 14) — the credential/cookie is the only thing capable of reaching admin capability; nothing else (like a service_role key) is *also* exposed alongside it, so a leak's ceiling is "everything an admin device could do," not "everything, unconditionally."
- Generic error responses (2.7) — reduces the odds a credential gets discovered by scanning in the first place.

**None of this restores the property a login system provides: proof that the request came from an authorized human, not merely from a device holding an authorized bearer credential.** That gap is the accepted cost of the business's explicit "no login" requirement, not an oversight in this design.

---

## 19. Pre-Production Security Checklist

- [ ] **Secrets:** `SUPABASE_SERVICE_ROLE_KEY` and the cookie-signing secret confirmed present only in server-side environment configuration (not committed to the repo, not in any `NEXT_PUBLIC_*` variable).
- [ ] **Client bundle audit:** grep the built client JS output for the service_role key and the cookie-signing secret — confirm zero matches, as a mechanical check, not just a code-review assumption.
- [ ] **Cookies:** admin session cookie verified `httpOnly`, `Secure`, `SameSite=Strict`, correctly scoped to the admin subdomain only, signed and tamper-checked.
- [ ] **Admin access:** bootstrap flow tested for generic-404 behavior on every invalid case (bad secret, revoked, expired, malformed); token entropy confirmed ≥256 bits at generation.
- [ ] **RLS:** policies applied and tested for every table per Section 5/`05` §11 — confirm `anon` cannot write anywhere, confirm `anon` read scope matches exactly the public catalog's needs (no over-broad `SELECT *` grants).
- [ ] **`service_role` isolation:** every admin route/action confirmed to sit behind the access-control middleware individually — no route reachable that uses `service_role` without that check running first.
- [ ] **Storage:** bucket policies confirmed (public read on product images, no public write); server-side file type/size validation confirmed active before any Storage write; image replacement confirmed to delete the old object after the new one is live and the DB row is updated (`05` §4a.7).
- [ ] **Sale items:** `UNIQUE (sale_id, product_id)` constraint confirmed present and enforced; server-side consolidation of duplicate product-line requests confirmed active before insert.
- [ ] **Public data boundary:** `products_public` view confirmed to omit `is_manually_unavailable`/`cached_stock`; confirmed every public route queries the view, not the base `products` table.
- [ ] **Input validation:** every mutation route confirmed to re-validate server-side (Section 10), independent of client-side checks.
- [ ] **CSRF:** `SameSite=Strict` + Origin/Referer check confirmed on all state-changing admin routes; confirmed no admin mutation is reachable via a plain `GET`.
- [ ] **XSS:** confirmed no `dangerouslySetInnerHTML` (or equivalent) anywhere in the codebase touching user/admin-supplied content.
- [ ] **Inventory transactions:** confirmed append-only in practice (no `UPDATE`/`DELETE` code path against `inventory_transactions`), confirmed the negative-stock CHECK is active in the deployed database.
- [ ] **Sales/payment mutation:** confirmed `payment_status`/`sale_status` transitions are the only write paths to those columns, confirmed prices are always server-derived at sale creation.
- [ ] **HTTPS:** confirmed enforced end-to-end (no HTTP fallback) on both the public domain and the admin subdomain.
- [ ] **Robots/noindex:** confirmed `X-Robots-Tag: noindex` and `robots.txt` disallow active on the admin subdomain in the production deployment specifically (not just in local/staging config that might not carry over).
- [ ] **Production environment:** confirmed no seed/test data (`05` §15), no local-dev bootstrap credential, present in production; confirmed production `settings` row is populated with real values before launch, not left as seed placeholders.

---

## Contradictions Found — Flagged, Not Silently Resolved

**`invoice_number` — resolved, no longer a contradiction.** An earlier revision of this document flagged `invoice_number` as named in a task brief but undefined in the schema. That gap has since been closed: `invoice_number` is now specified consistently in `01` §12/12.1, `04` §2.6/6.1a, and `05` §2.7/6.1a (server-generated via a Postgres sequence, `NOT NULL UNIQUE`, never client-suppliable). This section's Section 7 restatement above reflects that resolved state. Left here, updated rather than deleted, so the resolution is traceable rather than silently vanishing from the document's history.

No other contradiction between this security model and `01`-`05` was found as of this revision — every mechanism described here (access control, RLS intent, inventory/sales transactional model, WhatsApp deep-link-only integration, no-auth framing, the Storage bucket policy and `products_public` view added in this revision) is a direct restatement of what `04`/`05` already establish, viewed through a security lens, not a new architectural decision introduced by this document.
