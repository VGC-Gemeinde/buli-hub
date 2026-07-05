CREATE TYPE "public"."discord_post_kind" AS ENUM('result', 'motw_vod');--> statement-breakpoint
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
