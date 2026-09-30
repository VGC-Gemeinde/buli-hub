CREATE TABLE "player_replacements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"window_id" uuid NOT NULL,
	"replaced_user_id" uuid NOT NULL,
	"replacement_user_id" uuid NOT NULL,
	"offered_by_id" uuid,
	"offered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"entry_round" integer NOT NULL,
	"accepted_at" timestamp with time zone,
	CONSTRAINT "player_replacements_window_id_replaced_user_id_unique" UNIQUE("window_id","replaced_user_id"),
	CONSTRAINT "player_replacements_window_id_replacement_user_id_unique" UNIQUE("window_id","replacement_user_id")
);
