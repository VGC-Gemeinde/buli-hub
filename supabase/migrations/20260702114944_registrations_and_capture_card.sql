CREATE TYPE "public"."platform" AS ENUM('showdown', 'cartridge');--> statement-breakpoint
CREATE TYPE "public"."player_status" AS ENUM('returning', 'new');--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"window_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"platform" "platform" NOT NULL,
	"status" "player_status" NOT NULL,
	"participated_before" boolean,
	"prev_season" text,
	"prev_name" text,
	"prev_division" text,
	"prev_placement" text,
	"skill_self_rating" integer,
	"greatest_achievements" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "registrations_window_id_user_id_unique" UNIQUE("window_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "has_capture_card" boolean DEFAULT false NOT NULL;