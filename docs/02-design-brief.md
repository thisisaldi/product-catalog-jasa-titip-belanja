# Design Brief

## Curated Product Catalog & Inventory Website

**Document:** 02-design-brief.md
**Version:** 1.0
**Status:** Draft
**Date:** 2026-09-01

---

## 1. Design Objective

Design a clean, curated, mobile-first product catalog website for a small retail business in Indonesia.

The website is primarily a **digital catalog**, not a conventional e-commerce marketplace.

Customers should be able to:

1. Open the website without creating an account.
2. Browse curated products.
3. Search and filter products.
4. View product details.
5. Understand price and availability.
6. Contact the seller directly through WhatsApp.

The website should simplify product discovery while preserving the existing personal selling experience through WhatsApp.

### Core product philosophy

> **Browse independently, purchase personally.**

The website handles discovery.

WhatsApp handles the actual sales conversation and payment process.

---

## 2. Target Audience

The primary audience is Indonesian millennial mothers.

The design should assume that many users:

* Primarily use smartphones.
* Prefer straightforward interfaces.
* May not be highly comfortable with technology.
* Value clarity and trust.
* Prefer browsing independently before contacting the seller.
* Are already familiar with WhatsApp.
* Do not need a complicated checkout experience.

The design should NOT be optimized around Gen Z visual or interaction conventions.

---

## 3. UX Goal

The website should feel:

* Easy
* Calm
* Trustworthy
* Curated
* Personal
* Warm
* Refined
* Simple

The intended reaction is:

> "Oh, gampang. Tinggal lihat barangnya."

The interface should never make the customer think about how the underlying system works.

---

## 4. Brand Personality

The design should communicate:

### Curated

Products feel intentionally selected rather than mass-listed.

### Trustworthy

Customers should feel comfortable browsing products and contacting the seller.

### Warm

The business still relies on personal communication through WhatsApp.

### Refined

The website should feel aesthetically considered and premium without becoming intimidating.

### Simple

Visual sophistication must never compromise usability.

---

## 5. Visual Direction

The visual direction should be inspired by:

* Curated boutiques
* Editorial product catalogs
* Lifestyle stores
* Minimal retail websites
* Clean magazine layouts

The website should NOT look like:

* Shopee
* Tokopedia
* Amazon
* Generic dropshipping stores
* Technology startup landing pages

The product itself should remain the primary visual focus.

---

## 6. Reference Website

Reference:

https://wordsandpages.netlify.app/open-order

Use the reference primarily for:

* Catalog-oriented experience
* Simplicity
* Product presentation
* Direct ordering behavior

Do NOT copy the visual design literally.

Extract the underlying UX principles and create a more polished design appropriate for this business.

---

## 7. Product Flexibility

The business sells curated products from various brands, including international brands.

The design must therefore remain category-agnostic.

Do NOT assume the business is specifically:

* A modest fashion store
* A hijab store
* A clothing store
* A cosmetics store
* A food store

Product examples shown during design exploration may be placeholders.

The UI should work for different product categories without requiring redesign of the core experience.

---

## 8. Public Information Architecture

Customer-facing experience:

```text
Catalog
│
├── Search
├── Category Filter
├── Brand Filter
│
└── Product Detail
        │
        └── WhatsApp Ordering
```

There is no customer authentication.

---

## 9. Homepage / Catalog

The catalog is the primary purpose of the website.

The homepage should quickly communicate:

* What the store offers.
* That the products are curated.
* What products are currently available.

The product catalog should appear relatively early on the page.

Avoid oversized marketing hero sections that push the actual products far below the fold.

Possible structure:

```text
Header
│
├── Logo
├── Search
└── Optional WhatsApp/contact action

Short Introduction
│
└── Concise brand statement

Filters
│
└── Category / Brand / Availability

Product Grid

Footer
```

---

## 10. Navigation

Navigation should be minimal.

Prioritize:

* Brand/logo
* Search
* Catalog
* Filters

Avoid complicated navigation systems.

On mobile, search and filtering should be easy to access without requiring users to navigate through multiple menus.

---

## 11. Product Card

Product cards should prioritize quick scanning.

Preferred hierarchy:

```text
Product Image
    ↓
Brand
    ↓
Product Name
    ↓
Price
    ↓
Availability
```

The image should remain the dominant element.

Avoid unnecessary marketplace elements such as:

* Ratings
* Review counts
* Wishlist
* Discount percentages
* Fake urgency
* Promotional counters
* Social proof metrics

---

## 12. Product Detail

The product detail page should answer:

1. What is the product?
2. What brand is it?
3. How much does it cost?
4. Is it available?
5. What is the product?
6. How do I order it?

Recommended hierarchy:

```text
Product Images
      ↓
Brand
      ↓
Product Name
      ↓
Price
      ↓
Availability
      ↓
Description
      ↓
WhatsApp CTA
```

The WhatsApp CTA should be visually prominent.

---

## 13. WhatsApp Ordering

The primary conversion action is:

> **Pesan via WhatsApp**

The website should make this action obvious but not aggressive.

The intended flow is:

```text
Product Detail
      ↓
Pesan via WhatsApp
      ↓
WhatsApp Opens
      ↓
Pre-filled Product Message
      ↓
Customer Continues Conversation
      ↓
Seller Completes Transaction
```

The website does NOT:

* Process payments.
* Verify payments.
* Provide payment checkout (the cart/order-submission flow in Section 28a is not this).
* Integrate payment gateways.
* Generate PDF invoices.

The WhatsApp message may contain:

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

Exact copy may be refined during implementation.

---

## 14. Mobile-First Design

Mobile is the primary design target.

Design priority:

```text
Mobile
  ↓
Tablet
  ↓
Desktop
```

Important considerations:

* Comfortable touch targets.
* Readable typography.
* Clear product hierarchy.
* Easy search.
* Easy filtering.
* Minimal horizontal scrolling.
* Prominent WhatsApp CTA.
* Fast visual scanning.

Do not simply shrink the desktop design for mobile.

Define responsive behavior intentionally.

---

## 15. Search and Filtering

Search should be simple and approachable.

Search should support product discovery by:

* Product name
* Brand

Filters may include:

* Category
* Brand
* Availability

Avoid overly complex filtering systems.

On mobile, explore interactions such as:

* Bottom sheet
* Filter modal
* Filter drawer

Choose the interaction that provides the lowest cognitive load.

---

## 16. Product Availability

Availability should be immediately understandable.

Possible states:

* Available
* Sold Out

Avoid technical inventory terminology on the customer-facing interface.

Customers should never need to understand concepts such as:

> Stock transaction
> Inventory movement
> Stock ledger

---

## 17. Empty and Loading States

Design simple, useful states for:

### No search results

> Tidak menemukan produk yang dicari.
> Coba kata kunci lain.

### Empty category

> Belum ada produk di kategori ini.

### Loading

Use a subtle loading state that does not distract from the catalog.

Avoid overly playful illustrations or unnecessary animation.

---

## 18. Typography

Explore typography that feels:

* Elegant
* Contemporary
* Warm
* Highly readable

Typography must prioritize mobile readability.

Avoid overly experimental display fonts.

The brand/logo typography may differ from the interface typography if appropriate.

---

## 19. Color Direction

Explore restrained color palettes.

Possible directions include:

* Warm neutrals
* Off-white
* Soft gray
* Muted earth tones
* Dark text

Avoid:

* Neon colors
* Excessive gradients
* Highly saturated colors
* Generic startup blue
* Excessive visual noise

The final palette should remain compatible with the future brand/logo identity, which is not yet finalized.

---

## 20. Imagery

Product photography is the primary visual element.

Prefer:

* Large product imagery
* Consistent aspect ratios
* Clean presentation
* Consistent image treatment

Avoid decorative stock photography unless it serves a clear UX purpose.

---

## 21. Interaction Design

Interactions should be subtle and purposeful.

Preferred:

* Clear hover states
* Clear pressed states
* Smooth transitions
* Simple image transitions
* Meaningful loading feedback

Avoid:

* Excessive animation
* Parallax
* Decorative motion
* Complex page transitions
* Motion that delays access to product information

---

## 22. Accessibility

The design should provide:

* Readable typography
* Adequate contrast
* Clear interaction states
* Large enough touch targets
* Logical visual hierarchy
* Meaningful labels

Do not rely only on color to communicate availability or interaction states.

---

## 23. Admin Interface

The admin dashboard is a separate experience.

It should prioritize:

* Efficiency
* Clarity
* Fast data entry
* Inventory visibility
* Catalog management

It does not need to replicate the public site's editorial aesthetic.

Admin areas:

```text
Dashboard
Catalog
Categories
Brands
Inventory
Sales
Settings
```

The admin interface will be designed after the public customer-facing design is finalized.

---

## 24. Design System

The final design should establish reusable components including:

* Button
* Input
* Search
* Filter
* Select
* Product Card
* Product Grid
* Badge
* Modal
* Bottom Sheet
* Header
* Footer
* Image Gallery
* Empty State
* Loading State
* Toast / Notification

Each interactive component should consider:

* Default
* Hover
* Focus
* Active
* Disabled
* Loading
* Error

---

## 25. Responsive Behavior

Define intentional responsive behavior.

Starting point:

### Product Grid

Mobile:

```text
2 columns
```

Tablet:

```text
3 columns
```

Desktop:

```text
4 columns
```

These are initial guidelines and may change if the final design demonstrates a better solution.

### Product Detail

Mobile:

```text
Image
↓
Product Information
↓
WhatsApp CTA
```

Desktop may use:

```text
Image Gallery | Product Information
```

---

## 26. Design Exploration

Before finalizing the visual direction, explore multiple approaches.

At minimum, consider:

### Direction A — Editorial Boutique

Magazine-inspired composition, elegant typography, generous whitespace.

### Direction B — Warm Modern Boutique

Approachable typography, warm neutrals, comfortable spacing, friendly but refined.

### Direction C — Minimal Luxury

Highly restrained interface, strong product imagery, premium visual hierarchy.

These directions should be meaningfully different.

Do not simply create three versions with different colors.

After exploration, select the direction that best balances:

* Usability
* Trust
* Curated feeling
* Mobile accessibility
* Product visibility
* Brand flexibility

---

## 27. Design Deliverables

The final customer-facing design should define:

1. Homepage/catalog
2. Product card
3. Product detail
4. Search
5. Filtering
6. WhatsApp CTA
7. Navigation
8. Empty state
9. Loading state
10. Mobile layouts
11. Desktop layouts
12. Typography
13. Colors
14. Spacing
15. Component system
16. Responsive behavior

---

## 28. Design Constraints

Do NOT introduce:

* Customer login
* Customer registration
* Payment checkout / payment gateway
* QRIS
* Online payment
* Customer reviews
* Wishlist
* Loyalty system
* Product recommendation system
* Social feed
* Complex CRM

The core customer experience is:

```text
Catalog
  ↓
Discovery
  ↓
Product Detail
  ↓
Cart
  ↓
Order Submission
  ↓
WhatsApp
```

---

## 28a. Customer Cart (added 2026-09-02, Milestone 4)

A real customer-facing cart is now an explicit, approved requirement —
superseding this document's earlier framing (Section 13/28) of "no cart" as
a hard constraint. Design it as an integrated part of the boutique
storefront, not a bolted-on e-commerce widget:

* No account, no login, no saved-address book — the cart is a temporary,
  client-side assembly step only.
* Keep it visually restrained and consistent with Section 24's component
  system (Button, Badge, Modal/Bottom Sheet all already exist as the right
  building blocks — a cart drawer/sheet is a natural extension, not a new
  visual language).
* Never show marketplace-style checkout chrome (coupon codes, shipping
  calculators, saved payment methods) — the only inputs are name, phone,
  and an optional note, then the customer is hand-off to WhatsApp exactly as
  Section 13 already describes.
* The cart and its "submit order" action must feel like part of the same
  calm, curated experience as the rest of the catalog — not a generic
  e-commerce checkout template.

## 29. Design Success Criteria

A first-time customer should be able to:

1. Open the website.
2. Understand what the business offers.
3. Browse products.
4. Find a relevant product.
5. Understand the price.
6. Understand availability.
7. Open product details.
8. Understand how to order.
9. Reach WhatsApp.

without requiring instructions.

The final experience should feel:

> **Simple enough for someone who does not enjoy complicated websites.**

while also feeling:

> **Curated enough to make the products feel intentionally selected.**

---

## 30. Design Decision Principle

When there is a conflict between visual novelty and usability:

> **Choose usability.**

When there is a conflict between adding features and keeping the experience simple:

> **Choose simplicity.**

When there is a conflict between making the website look like a marketplace and making it feel like a curated boutique:

> **Choose the curated boutique experience.**
