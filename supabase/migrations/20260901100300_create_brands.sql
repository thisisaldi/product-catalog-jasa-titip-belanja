-- docs/05-database-design.md Section 2.3 / 3.3
create table brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  constraint brands_slug_key unique (slug),
  constraint brands_status_check check (status in ('ACTIVE', 'INACTIVE'))
);

-- Section 8: idx_brands_status — same reasoning as idx_categories_status.
create index idx_brands_status on brands (status);
