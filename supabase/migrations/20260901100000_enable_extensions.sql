-- docs/05-database-design.md Section 2 preamble: uuid PKs use gen_random_uuid(),
-- which requires pgcrypto ("standard on Supabase"). Idempotent since extensions
-- are shared/global state, unlike the table migrations below.
create extension if not exists pgcrypto;
