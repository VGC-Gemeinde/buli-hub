CREATE TABLE "motw_selections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"window_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"match_id" uuid NOT NULL,
	"youtube_url" text,
	"selected_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "motw_selections_match_id_unique" UNIQUE("match_id"),
	CONSTRAINT "motw_selections_window_id_round_unique" UNIQUE("window_id","round")
);
