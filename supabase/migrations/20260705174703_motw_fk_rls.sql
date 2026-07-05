-- FKs + RLS for the Match of the Week. Server-only (RLS on, no policies), like
-- the other match/season tables. A selection dies with its window or match;
-- the selecting staff member cascades (actor provenance, like reported_by).

ALTER TABLE "motw_selections"
  ADD CONSTRAINT "motw_selections_window_id_fk"
  FOREIGN KEY ("window_id") REFERENCES "registration_windows" (id) ON DELETE CASCADE;

ALTER TABLE "motw_selections"
  ADD CONSTRAINT "motw_selections_match_id_fk"
  FOREIGN KEY ("match_id") REFERENCES "matches" (id) ON DELETE CASCADE;

ALTER TABLE "motw_selections"
  ADD CONSTRAINT "motw_selections_selected_by_id_auth_users_fk"
  FOREIGN KEY ("selected_by_id") REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE "motw_selections" ENABLE ROW LEVEL SECURITY;
