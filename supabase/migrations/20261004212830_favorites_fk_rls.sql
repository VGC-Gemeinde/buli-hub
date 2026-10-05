-- FKs + RLS for Favoriten. Server-only (RLS on, no policies): the app reads
-- a user's favourites through Drizzle, scoped to the signed-in user in server
-- code. Both sides are hub users and go with their account. See
-- docs/plans/favorites.md.

ALTER TABLE "favorites"
  ADD CONSTRAINT "favorites_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES auth.users (id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "favorites"
  ADD CONSTRAINT "favorites_player_id_fk"
  FOREIGN KEY ("player_id") REFERENCES auth.users (id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "favorites" ENABLE ROW LEVEL SECURITY;
