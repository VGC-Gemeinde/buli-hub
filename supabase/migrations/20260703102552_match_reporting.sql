CREATE TYPE "public"."match_outcome" AS ENUM('normal', 'free_win', 'double_loss');--> statement-breakpoint
CREATE TABLE "match_games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"game_number" integer NOT NULL,
	"winner_id" uuid NOT NULL,
	"replay_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_games_match_id_game_number_unique" UNIQUE("match_id","game_number")
);
--> statement-breakpoint
CREATE TABLE "match_results" (
	"match_id" uuid PRIMARY KEY NOT NULL,
	"outcome" "match_outcome" NOT NULL,
	"winner_id" uuid,
	"platform" "platform",
	"player_a_team_url" text,
	"player_b_team_url" text,
	"video_url" text,
	"free_win_reason" text,
	"discussed_with_id" uuid,
	"reported_by_id" uuid NOT NULL,
	"reported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_by_id" uuid,
	"confirmed_at" timestamp with time zone,
	"corrected_by_id" uuid,
	"corrected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
