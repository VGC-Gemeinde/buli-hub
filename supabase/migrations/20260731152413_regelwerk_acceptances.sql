CREATE TABLE "regelwerk_acceptances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"window_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "regelwerk_acceptances_window_id_user_id_unique" UNIQUE("window_id","user_id")
);
