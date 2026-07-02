ALTER TABLE "registrations" ALTER COLUMN "prev_division" SET DATA TYPE integer USING NULLIF(btrim("prev_division"), '')::integer;--> statement-breakpoint
ALTER TABLE "registrations" ALTER COLUMN "prev_placement" SET DATA TYPE integer USING NULLIF(btrim("prev_placement"), '')::integer;
