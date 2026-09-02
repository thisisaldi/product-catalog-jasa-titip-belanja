-- docs/05-database-design.md Section 2.2 / 3.3
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  constraint categories_slug_key unique (slug),
  constraint categories_status_check check (status in ('ACTIVE', 'INACTIVE'))
);

-- Section 8: idx_categories_status — public filter-list query (status = 'ACTIVE')
-- and the RLS policy's own ACTIVE branch.
create index idx_categories_status on categories (status);
