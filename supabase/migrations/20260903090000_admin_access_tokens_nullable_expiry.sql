-- Permanent admin credentials: expires_at = NULL means "never expires"
-- (CLAUDE.md-adjacent request, 2026-09-03 — supersedes the 90-day-default
-- assumption baked into the original NOT NULL constraint). Additive change
-- only: widen the column, no data rewritten, no table recreated.
alter table admin_access_tokens
  alter column expires_at drop not null;
