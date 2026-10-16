CREATE TYPE "public"."match_stage" AS ENUM('regular', 'tiebreaker', 'relegation', 'playoff');--> statement-breakpoint
ALTER TABLE "matches" ALTER COLUMN "sub_division_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ALTER COLUMN "player_a_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "matchdays" ADD COLUMN "regular" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- Hand-edited: existing matches take their window from their sub-division,
-- so the column is added nullable, backfilled, then made NOT NULL.
ALTER TABLE "matches" ADD COLUMN "window_id" uuid;--> statement-breakpoint
UPDATE "matches" SET "window_id" = "divisions"."window_id"
  FROM "sub_divisions", "divisions"
  WHERE "sub_divisions"."id" = "matches"."sub_division_id"
    AND "divisions"."id" = "sub_divisions"."division_id";--> statement-breakpoint
ALTER TABLE "matches" ALTER COLUMN "window_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "stage" "match_stage" DEFAULT 'regular' NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "tier" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "position" integer;--> statement-breakpoint
ALTER TABLE "placements" ADD COLUMN "lot_number" double precision DEFAULT random() NOT NULL;--> statement-breakpoint
ALTER TABLE "sub_divisions" ADD COLUMN "lot_number" double precision DEFAULT random() NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "matches_place_uq" ON "matches" USING btree ("window_id","stage","tier","round","position") WHERE "matches"."stage" <> 'regular';--> statement-breakpoint
CREATE INDEX "matches_window_idx" ON "matches" USING btree ("window_id");--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_regular_shape" CHECK (("matches"."stage" = 'regular') = ("matches"."sub_division_id" is not null) and ("matches"."stage" <> 'regular' or "matches"."player_a_id" is not null));--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_placed_shape" CHECK ("matches"."stage" = 'regular' or ("matches"."tier" is not null and "matches"."position" is not null));