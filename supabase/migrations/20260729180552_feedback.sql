CREATE TYPE "public"."feedback_kind" AS ENUM('bug', 'idea');--> statement-breakpoint
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
	"posted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "feedback_reports_reporter_idx" ON "feedback_reports" USING btree ("reporter_id","created_at");