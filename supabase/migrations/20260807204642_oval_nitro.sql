CREATE TYPE "public"."teamsheet_source" AS ENUM('pokepaste', 'vrpaste', 'import');--> statement-breakpoint
CREATE TABLE "team_sheets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"source" "teamsheet_source" NOT NULL,
	"ots" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_sheets_match_id_player_id_unique" UNIQUE("match_id","player_id")
);
--> statement-breakpoint
ALTER TABLE "match_results" DROP COLUMN "player_a_team_url";--> statement-breakpoint
ALTER TABLE "match_results" DROP COLUMN "player_b_team_url";