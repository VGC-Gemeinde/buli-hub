ALTER TYPE "public"."discord_season_resource_kind" ADD VALUE 'playoff_role';--> statement-breakpoint
ALTER TYPE "public"."discord_season_resource_kind" ADD VALUE 'playoff_channel';--> statement-breakpoint
ALTER TYPE "public"."discord_season_resource_kind" ADD VALUE 'relegation_role';--> statement-breakpoint
ALTER TYPE "public"."discord_season_resource_kind" ADD VALUE 'relegation_channel';--> statement-breakpoint
ALTER TABLE "discord_season_resources" ALTER COLUMN "sub_division_id" DROP NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "discord_season_resources_window_kind_uq" ON "discord_season_resources" USING btree ("window_id","kind") WHERE "discord_season_resources"."sub_division_id" is null;