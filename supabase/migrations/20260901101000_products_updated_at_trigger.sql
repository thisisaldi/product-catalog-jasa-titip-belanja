-- docs/05-database-design.md Section 14
-- products.updated_at is maintained by a trigger rather than relying on every
-- application code path to remember to set it. Only products needs this today
-- (categories/brands have no other mutable field worth tracking beyond
-- created_at; inventory_transactions/sale_items are append-only; sales tracks
-- paid_at/cancelled_at per-transition instead of a generic updated_at).
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at
before update on products
for each row
execute function set_updated_at();
