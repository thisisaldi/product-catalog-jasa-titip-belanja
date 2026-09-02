-- docs/05-database-design.md Section 2.8 / 6.1b
-- unit_price/subtotal are snapshots taken at sale time, independent of
-- products.price afterward (Section 6.1). UNIQUE (sale_id, product_id):
-- a sale may contain a given product only once — duplicate requested lines
-- must be consolidated by the application before insert (Section 6.1b);
-- this constraint is the database-level backstop if that consolidation is
-- ever buggy.
create table sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales (id) on delete cascade,
  product_id uuid not null references products (id) on delete restrict,
  quantity integer not null,
  unit_price numeric(12, 2) not null,
  subtotal numeric(12, 2) not null,
  constraint sale_items_quantity_check check (quantity > 0),
  constraint sale_items_unit_price_check check (unit_price >= 0),
  constraint sale_items_subtotal_check check (subtotal >= 0),
  constraint sale_items_sale_product_key unique (sale_id, product_id)
);

-- Section 8: fetch line items for one sale (Postgres does not auto-index FKs).
-- sale_items_sale_product_key (unique) already indexes (sale_id, product_id).
create index idx_sale_items_sale on sale_items (sale_id);
create index idx_sale_items_product on sale_items (product_id);
