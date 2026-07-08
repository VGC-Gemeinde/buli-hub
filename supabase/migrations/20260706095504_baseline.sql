CREATE TYPE "public"."discord_post_kind" AS ENUM('result', 'motw_vod');--> statement-breakpoint
CREATE TYPE "public"."dispute_resolution" AS ENUM('upheld', 'corrected');--> statement-breakpoint
CREATE TYPE "public"."dispute_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."match_outcome" AS ENUM('normal', 'free_win', 'double_loss');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('showdown', 'cartridge');--> statement-breakpoint
CREATE TYPE "public"."player_status" AS ENUM('returning', 'new');--> statement-breakpoint
CREATE TYPE "public"."relevant_table" AS ENUM('sub_division', 'division');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('dev', 'admin', 'staff', 'player');--> statement-breakpoint
CREATE TABLE "discord_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "discord_post_kind" NOT NULL,
	"match_id" uuid NOT NULL,
	"channel_id" text NOT NULL,
	"message_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discord_posts_kind_match_id_unique" UNIQUE("kind","match_id")
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"opened_by_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" "dispute_status" DEFAULT 'open' NOT NULL,
	"resolution" "dispute_resolution",
	"resolved_by_id" uuid,
	"resolved_at" timestamp with time zone,
	"note" text,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "divisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"window_id" uuid NOT NULL,
	"tier" integer NOT NULL,
	"relevant_table" "relevant_table" DEFAULT 'sub_division' NOT NULL,
	"guaranteed_promotions" integer DEFAULT 0 NOT NULL,
	"guaranteed_demotions" integer DEFAULT 0 NOT NULL,
	"promotion_playoff_slots" integer DEFAULT 0 NOT NULL,
	"demotion_playoff_slots" integer DEFAULT 0 NOT NULL,
	"championship_playoff_slots" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "divisions_window_id_tier_unique" UNIQUE("window_id","tier")
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "matchdays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"window_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "matchdays_window_id_round_unique" UNIQUE("window_id","round")
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sub_division_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"player_a_id" uuid NOT NULL,
	"player_b_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "motw_selections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"window_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"match_id" uuid NOT NULL,
	"youtube_url" text,
	"selected_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "motw_selections_match_id_unique" UNIQUE("match_id"),
	CONSTRAINT "motw_selections_window_id_round_unique" UNIQUE("window_id","round")
);
--> statement-breakpoint
CREATE TABLE "placements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"window_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"division_id" uuid,
	"sub_division_id" uuid,
	"dropped_at" timestamp with time zone,
	"dropped_by_id" uuid,
	"drop_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "placements_window_id_user_id_unique" UNIQUE("window_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"twitter_handle" text,
	"bluesky_handle" text,
	"origin" text,
	"role" "role" DEFAULT 'player' NOT NULL,
	"role_synced_at" timestamp with time zone,
	"display_name" text,
	"username" text,
	"avatar_url" text,
	"has_capture_card" boolean DEFAULT false NOT NULL,
	"settings_edited_at" timestamp with time zone,
	"registration_hint_dismissed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registration_windows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"opened_by" uuid NOT NULL,
	"season_number" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"window_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"platform" "platform" NOT NULL,
	"status" "player_status" NOT NULL,
	"participated_before" boolean,
	"prev_season" text,
	"prev_name" text,
	"prev_division" integer,
	"prev_placement" integer,
	"skill_self_rating" integer,
	"greatest_achievements" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "registrations_window_id_user_id_unique" UNIQUE("window_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "seeding_locks" (
	"window_id" uuid PRIMARY KEY NOT NULL,
	"holder_id" uuid NOT NULL,
	"acquired_at" timestamp with time zone DEFAULT now() NOT NULL,
	"heartbeat_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seedings" (
	"window_id" uuid PRIMARY KEY NOT NULL,
	"sub_division_size" integer NOT NULL,
	"post_season_configured_at" timestamp with time zone,
	"finalized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sub_divisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"division_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sub_divisions_division_id_position_unique" UNIQUE("division_id","position")
);
