-- docs/05-database-design.md Section 2.6 / 5
-- Append-only ledger, source of truth for stock (cached_stock = SUM(IN) - SUM(OUT)).
-- No UPDATE/DELETE in normal operation — corrections are new offsetting rows.
create table inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete restrict,
  type text not null,
  quantity integer not null,
  note text null,
  created_by uuid not null references admin_access_tokens (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint inventory_transactions_type_check check (type in ('IN', 'OUT')),
  constraint inventory_transactions_quantity_check check (quantity > 0)
);

-- Section 8: admin inventory history view, newest-first per product.
-- (idx_inventory_created_by intentionally not added — Section 8: no requirement
-- asks for "transactions by staff member" filtering yet.)
create index idx_inventory_product_created on inventory_transactions (product_id, created_at desc);
