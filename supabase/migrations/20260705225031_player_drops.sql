ALTER TABLE "placements" ADD COLUMN "dropped_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "placements" ADD COLUMN "dropped_by_id" uuid;--> statement-breakpoint
ALTER TABLE "placements" ADD COLUMN "drop_reason" text;