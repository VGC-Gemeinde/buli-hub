-- FKs + RLS for player replacements. Server-only (RLS on, no policies), like
-- the other staff tables. The replaced player is referenced through their
-- placement, so a replacement cannot exist for someone who was never placed
-- and goes when that placement goes; the replacement and the staff member
-- reference auth.users. See docs/plans/player-replacement.md.

ALTER TABLE "player_replacements"
  ADD CONSTRAINT "player_replacements_window_id_fk"
  FOREIGN KEY ("window_id") REFERENCES "registration_windows" (id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "player_replacements"
  ADD CONSTRAINT "player_replacements_replaced_placement_fk"
  FOREIGN KEY ("window_id", "replaced_user_id")
  REFERENCES "placements" ("window_id", "user_id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "player_replacements"
  ADD CONSTRAINT "player_replacements_replacement_user_id_fk"
  FOREIGN KEY ("replacement_user_id") REFERENCES auth.users (id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "player_replacements"
  ADD CONSTRAINT "player_replacements_offered_by_id_fk"
  FOREIGN KEY ("offered_by_id") REFERENCES auth.users (id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "player_replacements" ENABLE ROW LEVEL SECURITY;
