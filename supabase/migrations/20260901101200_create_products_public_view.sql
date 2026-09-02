-- docs/05-database-design.md Section 11.1a
-- Explicit public data boundary: is_manually_unavailable and cached_stock are
-- NOT columns of this view — structurally absent, not masked — so a public
-- `SELECT *` against this view can never leak either value. is_available is
-- the single derived boolean the public site needs (Section 3.2's resolution
-- logic), computed once here rather than re-implemented per route.
--
-- Default CREATE VIEW (no SECURITY DEFINER) runs with the querying role's own
-- permissions, so this composes with the products base-table RLS policy
-- above rather than bypassing it (Section 11.1a) — anon still only ever sees
-- ACTIVE rows through either path.
create view products_public as
select
  id,
  name,
  slug,
  brand_id,
  category_id,
  description,
  price,
  created_at,
  (not is_manually_unavailable and cached_stock > 0) as is_available
from products
where status = 'ACTIVE';

grant select on products_public to anon;
