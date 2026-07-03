CREATE TYPE "public"."dispute_resolution" AS ENUM('upheld', 'corrected');--> statement-breakpoint
CREATE TYPE "public"."dispute_status" AS ENUM('open', 'resolved');--> statement-breakpoint
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
