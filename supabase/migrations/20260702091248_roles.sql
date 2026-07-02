CREATE TYPE "public"."role" AS ENUM('dev', 'admin', 'staff', 'player');--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "role" "role" DEFAULT 'player' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "role_synced_at" timestamp with time zone;