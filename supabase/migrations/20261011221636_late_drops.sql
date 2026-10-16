ALTER TABLE "placements" ADD COLUMN "late_dropped_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "placements" ADD COLUMN "late_dropped_by_id" uuid;--> statement-breakpoint
ALTER TABLE "placements" ADD COLUMN "late_drop_reason" text;