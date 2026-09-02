# Migration Manifest

Source of truth: `docs/05-database-design.md` (v1.6), cross-checked against
`docs/04-system-design.md` and `docs/06-security.md`. Ordering follows `05`
Section 16 exactly. Not applied anywhere — files only.

| # | File | Creates |
|---|---|---|
| 1 | `20260901100000_enable_extensions.sql` | `pgcrypto` extension |
| 2 | `20260901100100_create_admin_access_tokens.sql` | table `admin_access_tokens` |
| 3 | `20260901100200_create_categories.sql` | table `categories`, index `idx_categories_status` |
| 4 | `20260901100300_create_brands.sql` | table `brands`, index `idx_brands_status` |
| 5 | `20260901100400_create_settings.sql` | table `settings` (singleton) |
| 6 | `20260901100500_create_products.sql` | table `products`, indexes `idx_products_public_listing`, `idx_products_category`, `idx_products_brand` |
| 7 | `20260901100600_create_product_images.sql` | table `product_images`, unique index `product_images_primary_uidx`, index `idx_product_images_product_sort` |
| 8 | `20260901100700_create_inventory_transactions.sql` | table `inventory_transactions`, index `idx_inventory_product_created` |
| 9 | `20260901100800_create_sales.sql` | sequence `sales_invoice_seq`, table `sales`, index `idx_sales_created` |
| 10 | `20260901100900_create_sale_items.sql` | table `sale_items`, indexes `idx_sale_items_sale`, `idx_sale_items_product` |
| 11 | `20260901101000_products_updated_at_trigger.sql` | function `set_updated_at()`, trigger `products_set_updated_at` |
| 12 | `20260901101100_enable_rls_and_policies.sql` | RLS enabled on all 9 tables; policies `categories_public_select`, `brands_public_select`, `products_public_select`, `product_images_public_select` |
| 13 | `20260901101200_create_products_public_view.sql` | view `products_public`, grant |

## Full schema object list

**Tables (9, matches `05` §0/§1 exactly):** `admin_access_tokens`, `categories`,
`brands`, `settings`, `products`, `product_images`, `inventory_transactions`,
`sales`, `sale_items`.

**Sequences:** `sales_invoice_seq` (backs `sales.invoice_number` DEFAULT,
`05` §6.1a).

**Views:** `products_public` (`05` §11.1a) — columns `id, name, slug, brand_id,
category_id, description, price, created_at, is_available`. Does **not**
expose `is_manually_unavailable` or `cached_stock`.

**Functions/triggers:** `set_updated_at()` + `products_set_updated_at`
(`BEFORE UPDATE ON products`) — the only trigger in the schema (`05` §14).

**RLS:** enabled on all 9 tables. Policies exist only for `anon` `SELECT` on
`categories`, `brands`, `products` (base-table backstop), `product_images`.
`inventory_transactions`, `sales`, `sale_items`, `admin_access_tokens`,
`settings` have **zero** policies — with RLS enabled and no policy, `anon`
has no access of any kind (`05` §11.1's closing note). No `authenticated`
role policy exists anywhere — none is ever issued (no Supabase Auth).

**Indexes:** every index named in `05` §8 that the doc says to add explicitly
(unique-constraint-backed indexes — `categories_slug_key`, `brands_slug_key`,
`products_slug_key`, `admin_access_tokens_token_hash_key`,
`sales_invoice_number_key`, `sale_items_sale_product_key`,
`product_images_primary_uidx` — are not duplicated as separate indexes, per
`05`'s own note that a UNIQUE constraint already creates its index).
`idx_inventory_created_by` is deliberately **not** created (`05` §8: "not
added by default... flagged as a likely future index").

**Not created (by explicit doc instruction, not oversight):**
- No `sale_item_inventory_transaction` join table (`05` §1.1, considered and rejected).
- No `DRAFT` product status (`05` §3.4, considered and rejected).
- No `pg_trgm`/search index (`05` §9.3, documented future upgrade, not built now).
- No Storage bucket/policy SQL — `05` §16 states bucket creation is Supabase
  project configuration (dashboard or `supabase/config.toml`), not a SQL
  migration; nothing to represent safely in migration SQL for this milestone.
