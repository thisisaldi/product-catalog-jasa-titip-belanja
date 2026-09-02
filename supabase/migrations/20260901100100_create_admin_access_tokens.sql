-- docs/05-database-design.md Section 2.1
-- Revocable per-device access-credential registry. NOT a user/identity table —
-- no Supabase Auth, no login (04-system-design.md Section 7).
create table admin_access_tokens (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  token_hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz null,
  constraint admin_access_tokens_token_hash_key unique (token_hash)
);
