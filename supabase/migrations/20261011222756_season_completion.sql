CREATE TYPE "public"."season_outcome" AS ENUM('promoted', 'stays', 'demoted');--> statement-breakpoint
ALTER TABLE "placements" ADD COLUMN "season_outcome" "season_outcome";--> statement-breakpoint
ALTER TABLE "placements" ADD COLUMN "champion" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "registration_windows" ADD COLUMN "season_completed_at" timestamp with time zone;