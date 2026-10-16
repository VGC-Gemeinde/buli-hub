CREATE TABLE "tie_orders" (
	"window_id" uuid NOT NULL,
	"tie_key" text NOT NULL,
	"order" jsonb NOT NULL,
	"reason" text NOT NULL,
	"decided_by_id" uuid,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tie_orders_window_id_tie_key_pk" PRIMARY KEY("window_id","tie_key")
);
--> statement-breakpoint
DROP INDEX "matches_place_uq";--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "tie_key" text;--> statement-breakpoint
ALTER TABLE "registration_windows" ADD COLUMN "regular_season_closed_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "matches_tie_key_uq" ON "matches" USING btree ("window_id","tie_key") WHERE "matches"."tie_key" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "matches_place_uq" ON "matches" USING btree ("window_id","stage","tier","round","position") WHERE "matches"."stage" in ('relegation', 'playoff');--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_tiebreaker_shape" CHECK (("matches"."stage" = 'tiebreaker') = ("matches"."tie_key" is not null));