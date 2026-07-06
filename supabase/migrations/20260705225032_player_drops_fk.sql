-- FK for the drop provenance. Informational: losing the staff member's
-- account must never delete or alter a placement, so set null (like the
-- other corrected/confirmed-by references). RLS on placements exists.

ALTER TABLE "placements"
  ADD CONSTRAINT "placements_dropped_by_id_auth_users_fk"
  FOREIGN KEY ("dropped_by_id") REFERENCES auth.users (id) ON DELETE SET NULL;
