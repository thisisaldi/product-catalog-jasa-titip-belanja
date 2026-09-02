-- docs/05-database-design.md Section 2.4
-- status: catalog visibility (PRD Section 8). is_manually_unavailable: internal-only
-- operational override, never exposed publicly (Section 3.2) — see products_public
-- view migration. cached_stock: denormalized ledger total (Section 5).
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  brand_id uuid not null references brands (id) on delete restrict,
  category_id uuid not null references categories (id) on delete restrict,
  description text null,
  price numeric(12, 2) not null,
  status text not null default 'ACTIVE',
  is_manually_unavailable boolean not null default false,
  cached_stock integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_slug_key unique (slug),
  constraint products_price_check check (price >= 0),
  constraint products_status_check check (status in ('ACTIVE', 'INACTIVE')),
  constraint products_cached_stock_check check (cached_stock >= 0)
);

-- Section 8. products_slug_key (unique) already indexes slug lookups — no
-- separate index added for that.
create index idx_products_public_listing on products (status, created_at desc, id desc);
create index idx_products_category on products (category_id);
create index idx_products_brand on products (brand_id);
