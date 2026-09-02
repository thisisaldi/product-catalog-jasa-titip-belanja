-- docs/05-database-design.md Section 2.9 / 7.1
-- Singleton row: id fixed to 1 by PK + CHECK, so a second row is structurally
-- impossible. No generic key-value config table — three known fields don't
-- justify that abstraction (Section 7.1).
create table settings (
  id smallint primary key default 1,
  whatsapp_number text not null,
  order_message_template text not null,
  availability_message_template text not null,
  invoice_message_template text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid null references admin_access_tokens (id) on delete restrict,
  constraint settings_id_check check (id = 1)
);
