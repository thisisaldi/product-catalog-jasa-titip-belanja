-- docs/05-database-design.md Section 2.5 / 4
-- 1-5 images per product is an application-layer bound, not a DB constraint
-- (Postgres cannot express "at most N child rows" without a trigger, and one
-- isn't justified here — Section 4). The DB enforces only the primary-image
-- partial unique index and sort_order >= 0.
create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  url text not null,
  alt_text text null,
  sort_order smallint not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  constraint product_images_sort_order_check check (sort_order >= 0)
);

-- Section 2.5/4: at most one primary image per product.
create unique index product_images_primary_uidx on product_images (product_id)
where is_primary = true;

-- Section 8: gallery fetch, images for a product in display order.
create index idx_product_images_product_sort on product_images (product_id, sort_order);
