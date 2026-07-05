-- FK + RLS for discord_posts. Server-only (RLS on, no policies), like the
-- other match/season tables. A post row dies with its match; the Discord
-- message itself is best-effort cleanup at the action layer.

ALTER TABLE "discord_posts"
  ADD CONSTRAINT "discord_posts_match_id_fk"
  FOREIGN KEY ("match_id") REFERENCES "matches" (id) ON DELETE CASCADE;

ALTER TABLE "discord_posts" ENABLE ROW LEVEL SECURITY;
