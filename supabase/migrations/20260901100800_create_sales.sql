-- docs/05-database-design.md Section 2.7 / 6.1a / 6.3 / 6.4
-- invoice_number: server-generated via a Postgres sequence, assigned as the
-- column DEFAULT so it's atomic under concurrent inserts and never
-- client-suppliable (Section 6.1a). Stable for the sale's lifetime.
create sequence sales_invoice_seq;

-- payment_status/sale_status are two independent axes, not one combined status
-- (Section 2.7). paid_at/paid_by and cancelled_at/cancelled_by are the approved
-- substitute for a separate audit-log table on these two transitions — set
-- exclusively by the guarded UPDATEs in Sections 6.3/6.4, never client-settable.
create table sales (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null default (
    'INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('sales_invoice_seq')::text, 6, '0')
  ),
  customer_name text null,
  customer_phone text null,
  note text null,
  payment_status text not null default 'PENDING',
  paid_at timestamptz null,
  paid_by uuid null references admin_access_tokens (id) on delete restrict,
  sale_status text not null default 'CONFIRMED',
  cancelled_at timestamptz null,
  cancelled_by uuid null references admin_access_tokens (id) on delete restrict,
  created_by uuid not null references admin_access_tokens (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint sales_invoice_number_key unique (invoice_number),
  constraint sales_payment_status_check check (payment_status in ('PENDING', 'PAID')),
  constraint sales_sale_status_check check (sale_status in ('CONFIRMED', 'CANCELLED')),
  constraint sales_payment_transition_check check (
    (payment_status = 'PENDING' and paid_at is null and paid_by is null)
    or
    (payment_status = 'PAID' and paid_at is not null and paid_by is not null)
  ),
  constraint sales_cancellation_transition_check check (
    (sale_status = 'CONFIRMED' and cancelled_at is null and cancelled_by is null)
    or
    (sale_status = 'CANCELLED' and cancelled_at is not null and cancelled_by is not null)
  )
);

-- Section 8: admin sales list, newest first. sales_invoice_number_key (unique)
-- already indexes invoice_number lookups — no separate index added for that.
create index idx_sales_created on sales (created_at desc);
