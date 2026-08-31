CREATE TYPE "public"."usage_period_kind" AS ENUM('day', 'week', 'month');--> statement-breakpoint
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
