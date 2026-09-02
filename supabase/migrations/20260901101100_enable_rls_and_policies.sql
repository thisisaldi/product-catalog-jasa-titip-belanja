-- docs/05-database-design.md Section 11
-- No Supabase Auth exists in this system — every request Supabase's data API
-- ever sees is `anon`. There is no `authenticated` role in play, ever. RLS
-- here only (a) grants public read access and (b) closes every write path
-- for `anon`. Admin mutations happen exclusively via service_role, which
-- bypasses RLS by Supabase design (Section 11.2) — that path is gated by the
-- application's access-control middleware, not by a policy in this file.
alter table categories enable row level security;
alter table brands enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table inventory_transactions enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table admin_access_tokens enable row level security;
alter table settings enable row level security;

-- Section 11.1: categories/brands need a two-branch policy so an archived
-- category/brand referenced by a still-visible product doesn't disappear
-- from that product's detail page — only the public filter-list query adds
-- its own explicit status = 'ACTIVE' on top to exclude archived options.
create policy categories_public_select on categories
for select
to anon
using (
  status = 'ACTIVE'
  or exists (
    select 1
    from products
    where products.category_id = categories.id
      and products.status = 'ACTIVE'
  )
);

create policy brands_public_select on brands
for select
to anon
using (
  status = 'ACTIVE'
  or exists (
    select 1
    from products
    where products.brand_id = brands.id
      and products.status = 'ACTIVE'
  )
);

-- Section 11.1: base-table policy is a backstop. Public application code
-- queries products_public (next migration), never this table directly.
create policy products_public_select on products
for select
to anon
using (status = 'ACTIVE');

create policy product_images_public_select on product_images
for select
to anon
using (
  exists (
    select 1
    from products
    where products.id = product_images.product_id
      and products.status = 'ACTIVE'
  )
);

-- Section 11.1: inventory_transactions, sales, sale_items, admin_access_tokens,
-- settings intentionally have NO policy for any role/operation here. With RLS
-- enabled and zero policies, `anon` has no SELECT/INSERT/UPDATE/DELETE access
-- to these tables at all — this is the entire public write boundary (Section
-- 11.1's closing note: "closed by omission... the only thing standing between
-- the public data API and a mutation"). Do not add a policy to these tables
-- without a new, explicit decision.
