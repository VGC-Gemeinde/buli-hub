-- FKs + RLS for the Banliste. Server-only (RLS on, no policies), like the
-- other staff tables. The banned account is a Discord id, not a hub user, so
-- it has no FK; the staff members who banned and lifted reference
-- auth.users and are kept as history when they go. See docs/plans/banlist.md.

ALTER TABLE "bans"
  ADD CONSTRAINT "bans_banned_by_id_fk"
  FOREIGN KEY ("banned_by_id") REFERENCES auth.users (id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "bans"
  ADD CONSTRAINT "bans_lifted_by_id_fk"
  FOREIGN KEY ("lifted_by_id") REFERENCES auth.users (id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "bans"
  ADD CONSTRAINT "bans_discord_id_snowflake"
  CHECK ("discord_id" ~ '^[0-9]{17,20}$');
--> statement-breakpoint
ALTER TABLE "bans" ENABLE ROW LEVEL SECURITY;
