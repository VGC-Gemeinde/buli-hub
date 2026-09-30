CREATE TABLE "bans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discord_id" text NOT NULL,
	"discord_name" text,
	"reason" text NOT NULL,
	"banned_by_id" uuid,
	"banned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lifted_at" timestamp with time zone,
	"lifted_by_id" uuid
);
--> statement-breakpoint
CREATE UNIQUE INDEX "bans_active_discord_id_uq" ON "bans" USING btree ("discord_id") WHERE "bans"."lifted_at" is null;