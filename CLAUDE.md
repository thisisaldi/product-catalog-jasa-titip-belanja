# CLAUDE.md

## Project

This project is a curated multi-brand retail catalog and internal inventory management web application for an Indonesian retail business.

The public website is a product discovery/catalog experience.

The actual sales conversation and payment process happen through WhatsApp.

Core philosophy:

> Browse independently, purchase personally.

---

# 1. Source of Truth

Before making architectural or implementation decisions, read the relevant documents in `/docs`.

Current documentation:

* `docs/01-product-requirements.md`
* `docs/02-design-brief.md`
* `docs/03-design-specification.md`
* `docs/04-system-design.md`
* `docs/05-database-design.md`

Additional documents will be added before production implementation:

* `docs/06-security.md`
* `docs/07-deployment.md`
* `docs/08-ai-development-guidelines.md`

When documents conflict, do NOT silently choose an interpretation.

Stop and report the contradiction.

---

# 2. Product Scope

The public website provides:

* Product catalog
* Product search
* Category filtering
* Brand filtering
* Product detail
* Product availability
* Customer cart (order composition — quantity/consolidation, no account, no payment)
* Self-service order submission (creates a PENDING sale, no payment collected)
* WhatsApp ordering

The internal system provides:

* Admin authentication
* Product management
* Category management
* Brand management
* Inventory management
* Sales recording
* Application settings

The website does NOT provide:

* Customer authentication
* Customer accounts
* Online/gateway payment (the cart and order submission above are not a checkout/payment system — no payment is ever collected on the site)
* Payment gateway
* QRIS
* Online payment
* Payment verification
* PDF invoices
* Customer reviews
* Wishlist
* Loyalty system
* Recommendation engine
* Complex CRM
* Social feed

Do not introduce these features unless explicitly requested.

**Cart/checkout terminology, revised 2026-09-02 (Milestone 4 — direct client
requirement change, superseding the earlier "admin-only cart" interpretation):**
the public site now has a real customer-facing cart and self-service order
submission. Keep these distinct:

* **Public cart** — client-side only (never persisted server-side, never a
  DB table), lets a customer assemble products/quantities before submitting.
* **Order submission ("checkout")** — the customer's cart becomes a real,
  persisted `Sale` (`payment_status = PENDING`) via the *same* `createSale()`
  path the admin cart already uses (`docs/05-database-design.md` Section 6,
  `create_sale()` RPC) — collects name/phone/note only, never payment
  details. This is not "checkout" in the payment-processing sense; no money
  moves and no payment method is collected here.
* **Admin cart** — unchanged, still exists, for an admin composing a sale on
  a customer's behalf (e.g. a phone-in order).
* **Invoice / WhatsApp** — unchanged: generated from the persisted sale
  after creation, sent manually, payment confirmed manually by an admin.

---

# 3. Architecture Principles

Prefer:

* Simple solutions
* Type-safe implementation
* Clear separation of concerns
* Reusable components
* Server-side authorization
* Database-enforced integrity
* Transactional inventory operations
* Minimal infrastructure
* Free/low-cost infrastructure where practical

Avoid:

* Premature abstraction
* Unnecessary dependencies
* Microservices
* External services when PostgreSQL/Supabase is sufficient
* Over-engineering
* Features not required by the product

Do not introduce a new library or service without a concrete reason.

---

# 4. Design Principles

The public website uses the approved:

> Warm Modern Boutique

direction.

Design priorities:

1. Usability
2. Clarity
3. Product visibility
4. Trust
5. Curated visual identity
6. Subtle interaction

The target audience is Indonesian millennial mothers, primarily using mobile devices.

Do not redesign the public experience into:

* Marketplace UI
* Generic SaaS UI
* Gen-Z-oriented UI
* Experimental/Awwwards-style UI

Do not add unnecessary visual effects.

Use the approved design specification as the visual source of truth.

---

# 5. Public Availability

The public website has exactly two customer-facing availability states:

### Available

Condition:

```text
stock > 0 AND product is not manually unavailable
```

CTA:

```text
Pesan via WhatsApp
```

### Stok Habis

Condition:

```text
stock == 0
OR product is manually unavailable
```

CTA:

```text
Tanya Ketersediaan
```

The reason for unavailability is an internal operational concern.

Do not expose "Temporarily Unavailable" to customers.

---

# 6. WhatsApp

WhatsApp is the primary conversion mechanism.

The destination number must be configurable through application settings.

Do not hardcode the WhatsApp number in components.

WhatsApp message templates must be configurable through application settings.

The website must not implement payment processing.

---

# 7. Inventory

Inventory uses an immutable transaction ledger plus cached current stock.

Conceptually:

```text
cached_stock =
SUM(IN transactions)
-
SUM(OUT transactions)
```

Inventory mutations must be transactional.

Do not allow normal application code to arbitrarily modify cached stock without preserving ledger consistency.

Never allow stock to become negative.

Sales and their corresponding inventory OUT transaction must be atomic.

---

# 8. Product Images

Products support 1–5 images.

Images use a dedicated relational `product_images` table.

Do not store product images as a JSON/array field on products.

---

# 9. Public Catalog

The public catalog uses:

* Cursor-based pagination
* Auto-load on scroll (revised 2026-09-06 — client requirement change, superseding the earlier "Load More" button-only rule; see `docs/03-design-specification.md` §2.2/§4.4 and `docs/04-system-design.md` §9)
* PostgreSQL ILIKE/OR search for v1

Do not introduce:

* Numbered pagination
* External search engines

unless requirements are explicitly changed.

---

# 10. Categories and Brands

Categories and brands use:

```text
ACTIVE
INACTIVE
```

Inactive categories/brands:

* Do not appear in public filters.
* Cannot normally be selected for new products.
* May remain referenced by existing products.
* Must preserve historical data.

Prefer archive/restore over destructive deletion.

---

# 11. Security

Security is enforced server-side.

Never rely solely on client-side authorization.

Public users may read only data required for the public catalog.

Public users must never be able to mutate:

* Products
* Categories
* Brands
* Inventory
* Sales
* Settings

Admin operations require authentication and appropriate authorization.

Follow `docs/06-security.md` once it exists.

---

# 12. Database

Supabase PostgreSQL is the intended database.

Follow:

```text
docs/04-system-design.md
docs/05-database-design.md
```

Do not modify the database schema casually.

If a schema change becomes necessary:

1. Explain why.
2. Identify affected documents.
3. Update the relevant specification.
4. Only then implement the migration.

Never silently change the schema to make implementation easier.

---

# 13. Implementation Discipline

Implement incrementally.

Do not attempt to build the entire application in one step.

Preferred sequence:

```text
Foundation
↓
Database
↓
Authentication
↓
Public Catalog
↓
Product Detail
↓
WhatsApp Flow
↓
Admin Catalog
↓
Inventory
↓
Sales
↓
Settings
↓
Testing
↓
Polish
```

After each phase:

* Run relevant tests.
* Check TypeScript.
* Check linting.
* Verify behavior.
* Compare implementation against the specifications.

Do not proceed past a broken phase without reporting the problem.

---

# 14. Change Management

When requirements change:

1. Identify the affected documents.
2. Explain the impact.
3. Update documentation before implementation when practical.
4. Keep all documents internally consistent.

Do not silently reinterpret requirements.

Do not remove existing functionality merely to simplify implementation.

---

# 15. AI Behavior

You are an implementation agent, not the product owner.

Do not invent business requirements.

Do not add "nice-to-have" features without approval.

When there are multiple technically valid approaches:

1. Prefer the simplest approach.
2. Prefer the approach already specified in the documentation.
3. Explain meaningful trade-offs.
4. Ask for approval when the decision materially affects architecture, UX, security, or data.

Before large changes, summarize what you intend to change.

---

# 16. Design Skill

When a frontend design decision is required, use the available design skill where appropriate.

The design skill should help improve:

* Visual hierarchy
* Typography
* Spacing
* Density
* Interaction quality
* Responsive behavior
* Overall visual polish

However, the design skill must remain subordinate to the approved product requirements and design specification.

Do not use design taste as justification for adding features outside scope.

---

# 17. Definition of Done

A feature is not considered complete merely because the UI renders.

A feature is complete when:

* It matches the relevant specification.
* TypeScript passes.
* Linting passes.
* Relevant tests pass.
* Loading/error/empty states are handled where applicable.
* Responsive behavior is verified.
* Authorization is correctly enforced where applicable.
* Database constraints are respected.
* No unintended scope has been introduced.

---

# 18. Important Rule

When uncertain:

> Do not guess silently.

Identify the uncertainty, explain the options, and ask for a decision when it materially affects the product or architecture.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
