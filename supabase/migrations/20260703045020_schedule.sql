CREATE TABLE "matchdays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"window_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "matchdays_window_id_round_unique" UNIQUE("window_id","round")
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sub_division_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"player_a_id" uuid NOT NULL,
	"player_b_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
