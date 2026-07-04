CREATE TYPE "public"."relevant_table" AS ENUM('sub_division', 'division');--> statement-breakpoint
ALTER TABLE "divisions" ADD COLUMN "relevant_table" "relevant_table" DEFAULT 'sub_division' NOT NULL;--> statement-breakpoint
ALTER TABLE "divisions" ADD COLUMN "guaranteed_promotions" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "divisions" ADD COLUMN "guaranteed_demotions" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "divisions" ADD COLUMN "promotion_playoff_slots" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "divisions" ADD COLUMN "demotion_playoff_slots" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "seedings" ADD COLUMN "post_season_configured_at" timestamp with time zone;