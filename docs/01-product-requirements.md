# Product Requirements Document

## Curated Product Catalog & Inventory Website

**Document:** 01-product-requirements.md
**Version:** 1.1 — Architecture audit resolution pass: invoice text explicitly tied to an admin-configurable template (Section 12.1); duplicate product lines in a sale disallowed/consolidated (Section 12); sale correction scope for a mistaken unpaid sale stated explicitly (Section 12.2)
**Status:** Draft
**Date:** 2026-09-01

---

## 1. Product Overview

A lightweight web-based product catalog and inventory management system for a curated retail business.

The website serves two primary purposes:

1. **External/Public Catalog**

   * Allows customers to browse available products.
   * Does not require authentication.
   * Does not process payments.
   * Does not provide online checkout.
   * Directs customers to WhatsApp to continue the purchasing process.

2. **Internal/Admin System**

   * Allows the business owner/staff to manage the product catalog.
   * Allows internal users to manage inventory and record stock movement.
   * Allows internal users to record completed sales.
   * No login/username/password/PIN — protected instead by the approved no-login access-control mechanism (Section 13).

The website is intended to replace or complement social-media-based product cataloging, particularly because the business sells products from various international brands and wants to reduce dependency on Instagram for displaying its catalog.

The overall product experience should resemble a **clean, curated digital boutique catalog** rather than a conventional large-scale e-commerce marketplace.

---

# 2. Product Goals

## Primary Goals

### G1 — Provide a centralized product catalog

Customers should be able to independently browse the business's available products without having to ask the seller for the catalog through WhatsApp.

### G2 — Make product discovery easy

Customers should be able to quickly find products using simple search, categories, and brand filters.

### G3 — Move purchasing conversations to WhatsApp

The website should facilitate product discovery but should not replace the existing direct-sales workflow.

The intended flow is:

Customer discovers product → Customer reviews product → Customer clicks WhatsApp → Seller completes transaction.

### G4 — Simplify internal catalog management

The owner/staff should be able to add, edit, remove, and update products without modifying code.

### G5 — Track inventory

The system should provide basic stock tracking and historical stock movements.

### G6 — Keep the system simple and inexpensive

The first version should use free or low-cost infrastructure and avoid unnecessary e-commerce functionality.

---

# 3. Target Users

## 3.1 External Customer

Primary customer profile:

* Primarily millennial mothers.
* Not necessarily highly technically proficient.
* Usually accesses the website from a smartphone.
* Wants a simple way to browse curated products.
* Prefers direct communication with the seller.
* Does not need or want a complicated checkout process.

### Customer UX Principle

> The customer should not need to understand how the system works.

The interface should feel familiar, simple, trustworthy, and visually curated.

---

## 3.2 Admin / Owner

The internal user manages:

* Products
* Categories
* Brands
* Inventory
* Sales records

The admin interface can prioritize functionality over visual sophistication.

---

# 4. Core User Journeys

## 4.1 Customer Browses Catalog

```text
Open Website
    ↓
Browse Catalog
    ↓
Search / Filter
    ↓
Select Product
    ↓
View Product Detail
```

---

## 4.2 Customer Contacts Seller

```text
Product Detail
    ↓
"Pesan via WhatsApp"
    ↓
WhatsApp Opens
    ↓
Pre-filled Product Message
    ↓
Customer Continues Conversation
    ↓
Seller Handles Transaction
```

The website does not process payment.

---

## 4.3 Admin Adds Product

```text
Admin Login
    ↓
Admin Dashboard
    ↓
Catalog
    ↓
Add Product
    ↓
Enter Product Information
    ↓
Upload Product Image
    ↓
Save
    ↓
Product Appears in Public Catalog
```

---

## 4.4 Admin Records Stock

```text
Admin
    ↓
Inventory
    ↓
Select Product
    ↓
Stock In / Stock Out
    ↓
Enter Quantity
    ↓
Save Transaction
    ↓
Current Stock Updated
```

---

## 4.5 Admin Records Sale

```text
Customer completes purchase through WhatsApp
    ↓
Admin records sale internally
    ↓
Sale Items created
    ↓
Inventory Stock Out created
    ↓
Current stock decreases
```

---

# 5. Functional Requirements

## 5.1 Public Catalog

The public catalog MUST allow users to:

* View products.
* Search products.
* Filter products by category.
* Filter products by brand.
* Open product detail pages.
* See product price.
* See product availability.
* Open WhatsApp ordering flow.

The public catalog MUST NOT require authentication.

---

## 5.1a Customer Cart and Order Submission

**Added 2026-09-02 (Milestone 4) — supersedes any earlier reading of this
document as excluding a customer-facing cart.** The client explicitly
requested a real public cart and self-service order flow; this section is
the resolved requirement, not a silent reinterpretation.

The public site MUST provide:

* A client-side cart (not persisted server-side, not a database table) that
  lets a customer add products, adjust quantity, and remove items while
  browsing.
* At most one cart line per product — adding an already-in-cart product again
  increases its quantity rather than creating a second line.
* A visible cart indicator (item count) reachable from any public page.
* An order-submission action that collects customer name, phone number, and
  an optional note only — never payment details, never an account/password.
* On submission, the cart is turned into a real, persisted `Sale` via the
  same server-side sale-creation path Section 12.1 already defines
  (`payment_status = PENDING`, inventory `OUT` recorded atomically,
  `invoice_number` generated) — a customer-initiated sale is not a separate
  mechanism from an admin-initiated one, only a different entry point into
  the same authoritative operation.
* After successful submission, the invoice text and WhatsApp CTA (Section 7)
  are presented so the customer can send the prepared message manually.

This is **not** checkout in the payment sense. No payment gateway, no card
or bank details, no payment confirmation happens here — `payment_status`
still starts `PENDING` and is still moved to `PAID` only by a manual admin
action (Section 12.1), unchanged. Only the *order-initiation* step moves
from "admin re-enters what the customer said over WhatsApp" to "customer
submits it directly"; the manual payment conversation and verification in
Section 12.1 are otherwise unchanged.

The public site MUST NOT expose exact stock quantities on the cart or add-
to-cart control — only the existing two-state availability label (Section
16 design brief / Section 5.4 of `04-system-design.md`) gates whether a
product can be added.

---

# 6. Product Detail

A product detail page SHOULD contain:

* Product image.
* Product name.
* Brand.
* Price.
* Availability.
* Description.
* Category.
* Optional product metadata.
* WhatsApp ordering CTA.

Example:

```text
[Product Image]

BRAND

Product Name

Rp1.250.000

Available

Product description...

[ PESAN VIA WHATSAPP ]
```

---

# 7. WhatsApp Ordering

The system should generate a pre-filled WhatsApp message.

Example:

```text
Halo Kak, saya tertarik dengan produk berikut:

Produk:
[Brand] Product Name

Harga:
Rp1.250.000

Qty:
1

Mohon info ketersediaan dan cara pembayarannya ya.

Terima kasih 🙏
```

The WhatsApp destination number MUST be configurable through the admin/system configuration rather than hard-coded throughout the application.

The website MUST NOT:

* Process payment.
* Verify payment.
* Create payment transactions.
* Integrate payment gateways.
* Generate PDF invoices.

---

# 8. Product Management

Admin MUST be able to:

* Create product.
* View products.
* Edit product.
* Delete/archive product.
* Upload product images.
* Set product price.
* Set product category.
* Set product brand.
* Set product description.
* Set product availability.
* View current stock.

Potential product fields:

```text
Product
├── id
├── name
├── slug
├── brand_id
├── category_id
├── description
├── price
├── status
├── created_at
└── updated_at
```

Product status may include:

```text
ACTIVE
INACTIVE
```

Inventory availability should be determined separately from catalog visibility.

---

# 9. Category Management

Admin MUST be able to:

* Create category.
* Edit category.
* Delete/archive category.
* View categories.

Example:

```text
Category
├── id
├── name
├── slug
└── created_at
```

---

# 10. Brand Management

Admin MUST be able to:

* Create brand.
* Edit brand.
* Delete/archive brand.
* View brands.

Example:

```text
Brand
├── id
├── name
├── slug
└── created_at
```

---

# 11. Inventory Management

The inventory system should use stock transactions rather than only storing a mutable stock number.

Supported transaction types:

```text
IN
OUT
```

Example:

```text
+10 Stock In
-2 Stock Out
-3 Stock Out
----------------
Current Stock = 5
```

The system should retain transaction history.

Inventory transaction:

```text
InventoryTransaction
├── id
├── product_id
├── type
├── quantity
├── note
├── created_by
└── created_at
```

Current stock:

```text
SUM(IN) - SUM(OUT)
```

The system MUST prevent stock from becoming negative.

---

# 12. Sales Management

Sales are internal records only.

A sale may contain:

```text
Sale
├── id
├── invoice_number   (system-generated, unique, human-readable — see 12.1)
├── customer_name
├── customer_phone
├── note
├── payment_status        (PENDING | PAID — default PENDING, manual transition only)
├── paid_at               (set only when payment_status becomes PAID)
├── paid_by               (which access credential/device made the change — see Section 13)
├── sale_status           (CONFIRMED | CANCELLED — default CONFIRMED)
├── cancelled_at          (set only when an unpaid sale is cancelled)
├── cancelled_by          (which access credential/device made the change)
├── created_by
└── created_at
```

`payment_status` and `sale_status` are separate fields — a sale's payment state and its order/lifecycle state are different concepts and change independently (see 12.1/12.2). `paid_at`/`paid_by` and `cancelled_at`/`cancelled_by` exist so each transition keeps its own record of when and by which credential it happened, without a separate audit-log table — `created_by`/`created_at` alone only capture who created the sale, not who later acted on it.

Sale items:

```text
SaleItem
├── id
├── sale_id
├── product_id
├── quantity
├── unit_price
└── subtotal
```

A sale may contain a given product only once — a product requested twice is consolidated into one line with the combined quantity, not stored as two lines (resolves an ambiguity flagged by the architecture audit; see `05-database-design.md` Section 2.8/6.1b for the enforcing constraint).

Recording a sale should create the corresponding stock-out transaction **immediately, at sale creation** — not deferred until payment is confirmed. See 12.1 for the full confirmed order-to-payment sequence.

## 12.1 Payment Workflow

Confirmed business process, MUST be reflected in any future schema/implementation work:

```text
Customer order
    ↓
Seller confirms
    ↓
Sale created — system generates invoice_number, sale_status = CONFIRMED, payment_status = PENDING
    ↓
Inventory stock-out transaction recorded immediately, atomically with the sale
    ↓
Invoice text generated (includes invoice_number), sent manually via WhatsApp
    ↓
Customer transfers payment manually (bank transfer, e-wallet, etc.)
    ↓
Customer sends payment proof via WhatsApp (e.g. a screenshot)
    ↓
Internal user (seller) manually reviews the proof in WhatsApp
    ↓
Internal user manually updates payment_status to PAID in the admin system
    (records paid_at and which credential made the change)
```

* Invoice text sent via WhatsApp is composed from an admin-configurable template (`invoice_message_template` — see `04-system-design.md`/`05-database-design.md` for placeholders and generation detail), the same pattern already used for the ordering and availability-inquiry message templates, rather than a hardcoded string.
* `invoice_number` is generated by the system at the moment the sale is created — never entered or editable by the customer or by the public side, and never re-generated afterward (stable for the life of the sale). It exists so the invoice text sent via WhatsApp has a stable, human-readable reference. Exact generation strategy is a system-design decision (`04-system-design.md`/`05-database-design.md`), not specified further here.
* Inventory is committed when the sale is created (seller confirms the order), not when payment is confirmed — stock does not wait on payment.
* Payment proof is exchanged and reviewed entirely within WhatsApp — the system does not accept, store, or display an uploaded proof file.
* `payment_status` starts at `PENDING` for every new sale and is moved to `PAID` only by a manual admin action — never derived automatically from anything. That action also records `paid_at` and which access credential performed it.
* Allowed values are exactly `PENDING` and `PAID`. No other payment states (e.g. refunded, failed, partial, expired, awaiting verification) are defined; adding one is a future decision if a future requirement explicitly calls for it.
* The system does NOT perform automatic payment verification, does NOT integrate a payment gateway, bank API, or QRIS, and does NOT parse a payment proof via OCR or any automated means.
* This is consistent with Section 7 (WhatsApp Ordering) and Section 17 (MVP Scope, Excluded) — the system handles discovery and record-keeping only; the payment conversation and its verification stay a fully human, WhatsApp-based process (Section 21 — "Browse independently, purchase personally").

## 12.2 Cancellation

An unpaid sale (`payment_status = PENDING`) may be cancelled by an internal user, setting `sale_status = CANCELLED` and recording `cancelled_at` and which access credential performed it. Cancelling a sale does not delete or edit the original inventory stock-out record — inventory is restored through a new, separate stock-in transaction, so the inventory history stays a complete, unaltered record of everything that happened, including the cancellation itself. Cancelling an already-paid sale is not defined as a workflow (a refund scenario), and is out of scope. For v1, the only supported correction for a mistaken *unpaid* sale (wrong product/quantity entered) is cancelling it and re-entering it correctly — there is no partial/line-item correction, and a mistaken *paid* sale has no defined correction path at all (consistent with the refund exclusion above); this is a deliberate scope boundary, not an oversight, restated explicitly here per the architecture audit's request to close the ambiguity. No separate audit-log table is introduced for this — `paid_at`/`paid_by`, `cancelled_at`/`cancelled_by`, and the existing inventory ledger together carry the attribution these two transitions need.

---

# 13. Access Control

**Revised 2026-09-01:** the business has explicitly confirmed that neither public/customer access nor internal/admin access will use authentication — no login, no username/password, no PIN, no account flow of any kind, anywhere in the system. This section originally called for admin authentication; that requirement has been overridden by direct business decision and is restated below to reflect what was actually approved.

Public customers MUST NOT need an account. This is unchanged.

Internal/admin users MUST NOT be required to log in, authenticate with a username/password, or enter a PIN. This is a deliberate business requirement, not an oversight.

Internal access MUST nevertheless be protected by an access-control mechanism — the system MUST NOT expose an openly writable admin endpoint that anyone who discovers its URL can use to mutate products, inventory, sales, or settings without any protection. The approved mechanism is a non-login access-control scheme (unguessable admin path, per-device bootstrap credential, signed session cookie valid for **30 days**, server-side middleware) — full detail in `04-system-design.md` Section 7, `05-database-design.md` Section 17, and `06-security.md` Section 2. Expiration after 30 days requires bootstrapping again with a credential; revocation invalidates a credential (and any session derived from it) immediately, before natural expiry. This satisfies the original intent of this section (internal operations must be protected) without describing or implementing that protection as authentication.

Unauthorized requests MUST NOT be able to perform administrative operations — restated from "unauthenticated" to "unauthorized" since there is no authentication state to reference, only whether a request carries a valid, unrevoked, unexpired access credential.

---

# 14. Public vs Internal Access

| Function               | Public | Admin |
| ---------------------- | -----: | ----: |
| View catalog           |    Yes |   Yes |
| View product           |    Yes |   Yes |
| Search                 |    Yes |   Yes |
| Filter                 |    Yes |   Yes |
| WhatsApp order         |    Yes |   Yes |
| Create product         |     No |   Yes |
| Edit product           |     No |   Yes |
| Delete/archive product |     No |   Yes |
| Manage categories      |     No |   Yes |
| Manage brands          |     No |   Yes |
| Manage inventory       |     No |   Yes |
| Record sales           |     No |   Yes |
| View inventory history |     No |   Yes |

---

# 15. UX Requirements

The public website should be:

* Mobile-first.
* Clean.
* Simple.
* Curated.
* Visually trustworthy.
* Easy to understand.
* Low cognitive load.
* Fast to browse.

The design SHOULD feel closer to:

> A curated digital boutique/catalog

than:

> A large marketplace/e-commerce platform.

Avoid excessive:

* Popups.
* Animations.
* Promotional banners.
* Flashy gradients.
* Gamification.
* Complex navigation.
* Excessive badges.
* Dense dashboards on the customer-facing side.

---

# 16. Responsive Design

Primary device:

> Smartphone

Secondary devices:

* Tablet.
* Desktop.

The design MUST prioritize mobile usability.

Important interactive elements should be easy to tap.

WhatsApp CTA should remain visually prominent on product detail pages.

---

# 17. MVP Scope

## Included

* Public catalog.
* Product detail.
* Product search.
* Category filtering.
* Brand filtering.
* Product availability.
* WhatsApp CTA.
* Pre-filled WhatsApp message.
* Customer cart (client-side order composition — Section 5.1a).
* Customer self-service order submission (creates a PENDING sale — Section 5.1a).
* Admin access control (no login — Section 13).
* Product CRUD.
* Category CRUD.
* Brand CRUD.
* Product image management.
* Stock in.
* Stock out.
* Inventory history.
* Basic sales recording.
* Responsive design.

## Excluded

* Customer authentication.
* Customer accounts.
* Admin login / username / password / PIN (Section 13 — access control without authentication).
* Online/payment checkout (the customer cart and order submission in Section 5.1a are not a checkout system — no payment is collected on the site).
* Payment gateway.
* QRIS integration.
* Automated payment verification.
* Payment-proof upload / OCR (Section 12 — proof is reviewed manually via WhatsApp, not uploaded to or parsed by the system).
* PDF invoices.
* Shipping integration.
* Loyalty system.
* Customer reviews.
* Recommendation engine.
* Social-media integration.
* Complex CRM.
* Advanced analytics.

---

# 18. Infrastructure Requirements

Initial deployment should prioritize free-tier infrastructure.

Expected architecture:

```text
Customer
   │
   ▼
Public Web App
   │
   ├── Product Catalog
   └── WhatsApp
           
Admin
   │
   ▼
Admin Web App
   │
   ▼
Backend / Database
   │
   ├── PostgreSQL
   └── Image Storage
```

Recommended initial infrastructure:

* Next.js
* TypeScript
* Tailwind CSS
* shadcn/ui
* Supabase PostgreSQL
* Supabase Storage
* Vercel
* WhatsApp deep links

A free deployment domain may be used initially.

---

# 19. Non-Functional Requirements

## Performance

Public catalog pages should load quickly on typical mobile internet connections.

Images should be optimized.

## Security

* Admin routes carry no login/username/password/PIN — access is controlled by the approved no-login mechanism (Section 13), and admin routes MUST NOT be openly writable to anyone who finds the URL.
* Public users must only have access to public catalog data.
* Admin operations must be protected server-side.
* Database access policies must prevent unauthorized mutations.
* Sensitive configuration must not be exposed to the client.

## Maintainability

The codebase should:

* Use clear domain boundaries.
* Avoid unnecessary abstractions.
* Keep business logic separate from UI components.
* Use TypeScript.
* Use reusable UI components.
* Use environment variables for configuration.

## Scalability

The architecture should be sufficient for a small-to-medium product catalog without introducing unnecessary infrastructure complexity.

---

# 20. Acceptance Criteria

The MVP is considered functional when:

### Catalog

* A customer can open the website without authentication.
* A customer can browse products.
* A customer can search products.
* A customer can filter products.
* A customer can view product details.

### WhatsApp

* Customer can click the WhatsApp CTA.
* WhatsApp opens successfully.
* Product information is included in the pre-filled message.

### Admin

* Admin can log in.
* Admin can create products.
* Admin can edit products.
* Admin can archive/delete products.
* Admin can manage categories.
* Admin can manage brands.

### Inventory

* Admin can add stock.
* Admin can remove stock.
* Stock history is retained.
* Current stock is calculated correctly.
* Stock cannot become negative.

### Sales

* Admin can record a sale.
* Sale contains product and quantity information.
* Sale decreases inventory correctly.

---

# 21. Design Principle

The central product principle is:

> **"Browse independently, purchase personally."**

The website handles:

```text
DISCOVERY
↓
PRODUCT INFORMATION
↓
SELECTION
```

WhatsApp handles:

```text
CONVERSATION
↓
PAYMENT
↓
TRANSACTION
```

The system should not attempt to replace the existing human sales process.
