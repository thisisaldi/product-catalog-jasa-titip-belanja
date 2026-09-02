-- Additive migration, same precedent as adjust_stock()/create_sale(): one
-- Postgres function for the cancellation transaction docs/01-product-
-- requirements.md Section 12.2, docs/04-system-design.md Section 6.4, and
-- docs/05-database-design.md Section 6.4 already specify. No new table,
-- column, or CHECK constraint.
create or replace function cancel_sale(
  p_sale_id uuid,
  p_cancelled_by uuid
)
returns void
language plpgsql
as $$
declare
  item record;
  v_updated integer;
begin
  -- Guarded UPDATE is both the existence check and the eligibility check in
  -- one statement (05 Section 6.4's own sketch): only an unpaid, still-
  -- confirmed sale matches. A PAID sale, an already-CANCELLED sale, or a
  -- nonexistent id all update zero rows here — one exception covers "sale
  -- not found", "already paid" (rejects PAID cancellation), and "already
  -- cancelled" (rejects repeated cancellation) without distinguishing which,
  -- matching the generic-failure posture used elsewhere in this schema.
  update sales
  set sale_status = 'CANCELLED', cancelled_at = now(), cancelled_by = p_cancelled_by
  where sales.id = p_sale_id and payment_status = 'PENDING' and sale_status = 'CONFIRMED';

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'sale % is not cancellable (not found, already paid, or already cancelled)', p_sale_id;
  end if;

  -- Compensating IN per original line item, ascending product_id order
  -- (05 Section 6.2's lock-ordering rule applies identically to
  -- cancellation, Section 6.4). The original OUT rows in
  -- inventory_transactions are never touched — this only ever inserts new
  -- rows, append-only (05 Section 5.1).
  for item in
    select sale_items.product_id, sale_items.quantity
    from sale_items
    where sale_items.sale_id = p_sale_id
    order by sale_items.product_id
  loop
    update products set cached_stock = cached_stock + item.quantity where products.id = item.product_id;

    insert into inventory_transactions (product_id, type, quantity, note, created_by)
    values (item.product_id, 'IN', item.quantity, 'Cancelled sale ' || p_sale_id, p_cancelled_by);
  end loop;
end;
$$;

revoke execute on function cancel_sale(uuid, uuid) from public;
revoke execute on function cancel_sale(uuid, uuid) from anon;
revoke execute on function cancel_sale(uuid, uuid) from authenticated;
grant execute on function cancel_sale(uuid, uuid) to service_role;
