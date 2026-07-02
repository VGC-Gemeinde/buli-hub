CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"twitter_handle" text,
	"bluesky_handle" text,
	"origin" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
