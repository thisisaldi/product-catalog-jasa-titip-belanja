-- Additive migration, not a schema/business-rule change: implements exactly
-- the atomic stock-mutation transaction docs/05-database-design.md Section
-- 5.3/5.4 already specifies in plain SQL (UPDATE cached_stock + INSERT
-- inventory_transactions in one transaction, CHECK(cached_stock >= 0) as the
-- rollback trigger). The app only has Supabase Data-API access (no direct
-- Postgres connection), and PostgREST executes one statement per call — a
-- Postgres function is the standard mechanism for atomicity in that setup.
-- No new table, column, or CHECK constraint. Approved 2026-09-01 (Milestone 2
-- Part 8 decision) rather than silently added.
create or replace function adjust_stock(
  p_product_id uuid,
  p_type text,
  p_quantity integer,
  p_note text,
  p_created_by uuid
)
returns void
language plpgsql
as $$
begin
  if p_type not in ('IN', 'OUT') then
    raise exception 'invalid inventory transaction type: %', p_type;
  end if;
  if p_quantity <= 0 then
    raise exception 'quantity must be positive';
  end if;

  if p_type = 'OUT' then
    update products set cached_stock = cached_stock - p_quantity where id = p_product_id;
  else
    update products set cached_stock = cached_stock + p_quantity where id = p_product_id;
  end if;

  if not found then
    raise exception 'product not found: %', p_product_id;
  end if;

  -- If the UPDATE above violated products_cached_stock_check (05 Section
  -- 5.3 — negative stock), Postgres already raised and aborted the whole
  -- function call before reaching here, so this insert is never reached and
  -- the ledger and cache can never disagree because of a rejected write.
  insert into inventory_transactions (product_id, type, quantity, note, created_by)
  values (p_product_id, p_type, p_quantity, p_note, p_created_by);
end;
$$;

-- Postgres grants EXECUTE on new functions to PUBLIC by default — revoke
-- that explicitly so `anon` (and therefore any public client) cannot call
-- this RPC directly (06-security.md Section 6: "no client-reachable path
-- that inserts inventory_transactions... outside the two legitimate flows").
-- Only service_role (which already bypasses RLS) may execute it, gated by
-- the admin access-control middleware at the application layer.
revoke execute on function adjust_stock(uuid, text, integer, text, uuid) from public;
grant execute on function adjust_stock(uuid, text, integer, text, uuid) to service_role;
