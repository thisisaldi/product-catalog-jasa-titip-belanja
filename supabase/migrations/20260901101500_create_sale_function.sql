-- Additive migration, same precedent as adjust_stock() (20260901101300):
-- implements exactly the sale-creation transaction docs/01-product-requirements.md
-- Section 12.1, docs/04-system-design.md Section 6.1/6.2, and
-- docs/05-database-design.md Section 6.1b/6.2 already specify — packaged as
-- one Postgres function because the app only has Supabase Data-API access
-- (no direct Postgres connection), and PostgREST executes one statement per
-- call. No new table, column, or CHECK constraint.
--
-- p_items shape: jsonb array of {"product_id": "<uuid>", "quantity": <int>}.
-- Duplicate product_id entries are consolidated by summing quantity (05
-- Section 6.1b) via the GROUP BY below — this is the defensive backstop,
-- not a replacement for the application layer also consolidating before
-- calling this function.
create or replace function create_sale(
  p_customer_name text,
  p_customer_phone text,
  p_note text,
  p_created_by uuid,
  p_items jsonb
)
returns table (id uuid, invoice_number text)
language plpgsql
as $$
declare
  v_sale_id uuid;
  v_invoice_number text;
  v_unit_price numeric(12, 2);
  item record;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'sale must contain at least one item';
  end if;

  -- invoice_number is the column DEFAULT (sales_invoice_seq, 05 Section
  -- 6.1a) — never passed in, never client-suppliable. payment_status
  -- defaults to PENDING, sale_status to CONFIRMED (05 Section 2.7); this
  -- function passes neither explicitly, matching 05 Section 6.2's own
  -- sketch ("the column list intentionally omits all three").
  insert into sales (customer_name, customer_phone, note, created_by)
  values (p_customer_name, p_customer_phone, p_note, p_created_by)
  returning sales.id, sales.invoice_number into v_sale_id, v_invoice_number;

  -- Consolidated, then locked in ascending product_id order (05 Section 6.2
  -- — resolves the deadlock risk for concurrent multi-item sales): the
  -- UPDATE below is the first lock taken on each product row, and this
  -- loop always processes products in the same order across concurrent
  -- calls.
  for item in
    select
      (elem ->> 'product_id')::uuid as product_id,
      sum((elem ->> 'quantity')::integer) as quantity
    from jsonb_array_elements(p_items) as elem
    group by (elem ->> 'product_id')::uuid
    order by 1
  loop
    if item.quantity <= 0 then
      raise exception 'quantity must be positive for product %', item.product_id;
    end if;

    -- Product must exist ("eligible for sale" = a real product row to
    -- snapshot a price from; 01-04-05 do not gate sale creation on
    -- products.status, only on cached_stock — status governs public
    -- catalog visibility, a separate axis, 05 Section 3.2).
    select price into v_unit_price from products where products.id = item.product_id;
    if not found then
      raise exception 'product not found: %', item.product_id;
    end if;

    insert into sale_items (sale_id, product_id, quantity, unit_price, subtotal)
    values (v_sale_id, item.product_id, item.quantity, v_unit_price, item.quantity * v_unit_price);

    -- Same write path as adjust_stock (05 Section 5.3/5.4): relative UPDATE
    -- takes the row lock; CHECK(cached_stock >= 0) aborts the whole
    -- function call (and therefore the whole sale, including the sales row
    -- and every sale_items row already inserted this call) on insufficient
    -- stock — no partial creation.
    update products set cached_stock = cached_stock - item.quantity where products.id = item.product_id;

    insert into inventory_transactions (product_id, type, quantity, note, created_by)
    values (item.product_id, 'OUT', item.quantity, 'Sale ' || v_sale_id, p_created_by);
  end loop;

  return query select v_sale_id, v_invoice_number;
end;
$$;

-- Postgres/Supabase grants EXECUTE on new functions to anon/authenticated by
-- default (ALTER DEFAULT PRIVILEGES) independently of PUBLIC — revoke from
-- all three explicitly (lesson from 20260901101400: revoking from PUBLIC
-- alone left anon still able to call adjust_stock). Only service_role,
-- gated by the admin access-control middleware, may execute this.
revoke execute on function create_sale(text, text, text, uuid, jsonb) from public;
revoke execute on function create_sale(text, text, text, uuid, jsonb) from anon;
revoke execute on function create_sale(text, text, text, uuid, jsonb) from authenticated;
grant execute on function create_sale(text, text, text, uuid, jsonb) to service_role;
