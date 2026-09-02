-- Fixes a real gap found during implementation testing: Supabase's project
-- template runs `ALTER DEFAULT PRIVILEGES ... GRANT EXECUTE ON FUNCTIONS TO
-- anon, authenticated` for the public schema, so a newly created function
-- gets EXECUTE granted to `anon` independently of the PUBLIC pseudo-role —
-- the previous migration's `REVOKE ... FROM PUBLIC` did not remove it.
-- Verified via role_routine_grants that anon could call adjust_stock
-- directly before this fix. Explicit revoke from both non-service roles.
revoke execute on function adjust_stock(uuid, text, integer, text, uuid) from anon;
revoke execute on function adjust_stock(uuid, text, integer, text, uuid) from authenticated;
