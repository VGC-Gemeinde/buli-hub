CREATE TYPE "public"."discord_post_kind" AS ENUM('result', 'motw_vod');--> statement-breakpoint
CREATE TYPE "public"."discord_season_resource_kind" AS ENUM('group_role', 'group_channel', 'playoff_role', 'playoff_channel', 'relegation_role', 'relegation_channel');--> statement-breakpoint
CREATE TYPE "public"."dispute_resolution" AS ENUM('upheld', 'corrected');--> statement-breakpoint
CREATE TYPE "public"."dispute_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."feedback_kind" AS ENUM('bug', 'idea');--> statement-breakpoint
CREATE TYPE "public"."match_outcome" AS ENUM('normal', 'free_win', 'double_loss');--> statement-breakpoint
CREATE TYPE "public"."match_stage" AS ENUM('regular', 'tiebreaker', 'relegation', 'playoff');--> statement-breakpoint
CREATE TYPE "public"."motw_role" AS ENUM('primary', 'backup');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('showdown', 'cartridge');--> statement-breakpoint
CREATE TYPE "public"."player_status" AS ENUM('returning', 'new');--> statement-breakpoint
CREATE TYPE "public"."relevant_table" AS ENUM('sub_division', 'division');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('dev', 'admin', 'staff', 'player');--> statement-breakpoint
CREATE TYPE "public"."season_outcome" AS ENUM('promoted', 'stays', 'demoted');--> statement-breakpoint
CREATE TYPE "public"."teamsheet_source" AS ENUM('pokepaste', 'vrpaste', 'import');--> statement-breakpoint
CREATE TYPE "public"."usage_period_kind" AS ENUM('day', 'week', 'month');--> statement-breakpoint
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
CREATE TABLE "discord_season_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"window_id" uuid NOT NULL,
	"sub_division_id" uuid,
	"kind" "discord_season_resource_kind" NOT NULL,
	"discord_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discord_season_resources_sub_division_id_kind_unique" UNIQUE("sub_division_id","kind")
);
--> statement-breakpoint
CREATE TABLE "discord_season_sync_state" (
	"window_id" uuid PRIMARY KEY NOT NULL,
	"ran_at" timestamp with time zone NOT NULL,
	"report" jsonb NOT NULL
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
CREATE TABLE "favorites" (
	"user_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_user_id_player_id_pk" PRIMARY KEY("user_id","player_id"),
	CONSTRAINT "favorites_not_self" CHECK ("favorites"."user_id" <> "favorites"."player_id")
);
--> statement-breakpoint
CREATE TABLE "feedback_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "feedback_kind" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"path" text NOT NULL,
	"user_agent" text NOT NULL,
	"build_sha" text,
	"window_id" uuid,
	"round" integer,
	"reporter_id" uuid NOT NULL,
	"reporter_role" "role" NOT NULL,
	"thread_id" text,
	"thread_guild_id" text,
	"attachment_count" integer DEFAULT 0 NOT NULL,
	"posted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"regular" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "matchdays_window_id_round_unique" UNIQUE("window_id","round")
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"window_id" uuid NOT NULL,
	"stage" "match_stage" DEFAULT 'regular' NOT NULL,
	"sub_division_id" uuid,
	"tier" integer,
	"position" integer,
	"tie_key" text,
	"round" integer NOT NULL,
	"player_a_id" uuid,
	"player_b_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "matches_regular_shape" CHECK (("matches"."stage" = 'regular') = ("matches"."sub_division_id" is not null) and ("matches"."stage" <> 'regular' or "matches"."player_a_id" is not null)),
	CONSTRAINT "matches_placed_shape" CHECK ("matches"."stage" = 'regular' or ("matches"."tier" is not null and "matches"."position" is not null)),
	CONSTRAINT "matches_tiebreaker_shape" CHECK (("matches"."stage" = 'tiebreaker') = ("matches"."tie_key" is not null))
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
	"late_dropped_at" timestamp with time zone,
	"late_dropped_by_id" uuid,
	"late_drop_reason" text,
	"season_outcome" "season_outcome",
	"champion" boolean DEFAULT false NOT NULL,
	"lot_number" double precision DEFAULT random() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "placements_window_id_user_id_unique" UNIQUE("window_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "player_replacements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"window_id" uuid NOT NULL,
	"replaced_user_id" uuid NOT NULL,
	"replacement_user_id" uuid NOT NULL,
	"offered_by_id" uuid,
	"offered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"entry_round" integer NOT NULL,
	"accepted_at" timestamp with time zone,
	CONSTRAINT "player_replacements_window_id_replaced_user_id_unique" UNIQUE("window_id","replaced_user_id"),
	CONSTRAINT "player_replacements_window_id_replacement_user_id_unique" UNIQUE("window_id","replacement_user_id")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"twitter_handle" text,
	"bluesky_handle" text,
	"origin" text,
	"role" "role" DEFAULT 'player' NOT NULL,
	"role_synced_at" timestamp with time zone,
	"guild_member" boolean,
	"guild_member_checked_at" timestamp with time zone,
	"display_name" text,
	"username" text,
	"avatar_url" text,
	"has_capture_card" boolean DEFAULT false NOT NULL,
	"stream_photo_path" text,
	"stream_photo_updated_at" timestamp with time zone,
	"settings_edited_at" timestamp with time zone,
	"registration_hint_dismissed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recording_holds" (
	"match_id" uuid PRIMARY KEY NOT NULL,
	"window_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"held_by_id" uuid NOT NULL,
	"motw_role" "motw_role",
	"nominated_sides" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regelwerk_acceptances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"window_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "regelwerk_acceptances_window_id_user_id_unique" UNIQUE("window_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "registration_windows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"opened_by" uuid NOT NULL,
	"season_number" integer DEFAULT 1 NOT NULL,
	"schedule_published_at" timestamp with time zone,
	"regular_season_closed_at" timestamp with time zone,
	"season_completed_at" timestamp with time zone
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
	"replay_required_tiers" integer,
	"post_season_configured_at" timestamp with time zone,
	"finalized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sub_divisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"division_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"lot_number" double precision DEFAULT random() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sub_divisions_division_id_position_unique" UNIQUE("division_id","position")
);
--> statement-breakpoint
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
CREATE TABLE "usage_collection" (
	"id" boolean PRIMARY KEY DEFAULT true NOT NULL,
	"started_at" timestamp with time zone,
	"backfilled_at" timestamp with time zone,
	"backfill_through" timestamp with time zone,
	"backfill_visits" integer,
	CONSTRAINT "usage_collection_single_row" CHECK ("usage_collection"."id")
);
--> statement-breakpoint
CREATE TABLE "usage_periods" (
	"kind" "usage_period_kind" NOT NULL,
	"period_id" text NOT NULL,
	"visits" integer DEFAULT 0 NOT NULL,
	"hours" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sketch" "bytea" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usage_periods_kind_period_id_pk" PRIMARY KEY("kind","period_id")
);
--> statement-breakpoint
CREATE TABLE "usage_salts" (
	"period_id" text PRIMARY KEY NOT NULL,
	"salt" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discord_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_discord_id_unique" UNIQUE("discord_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "bans_active_discord_id_uq" ON "bans" USING btree ("discord_id") WHERE "bans"."lifted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "discord_season_resources_window_kind_uq" ON "discord_season_resources" USING btree ("window_id","kind") WHERE "discord_season_resources"."sub_division_id" is null;--> statement-breakpoint
CREATE INDEX "feedback_reports_reporter_idx" ON "feedback_reports" USING btree ("reporter_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "matches_place_uq" ON "matches" USING btree ("window_id","stage","tier","round","position") WHERE "matches"."stage" in ('relegation', 'playoff');--> statement-breakpoint
CREATE UNIQUE INDEX "matches_tie_key_uq" ON "matches" USING btree ("window_id","tie_key") WHERE "matches"."tie_key" is not null;--> statement-breakpoint
CREATE INDEX "matches_window_idx" ON "matches" USING btree ("window_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recording_holds_motw_primary_uq" ON "recording_holds" USING btree ("window_id","round") WHERE "recording_holds"."motw_role" = 'primary';--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");