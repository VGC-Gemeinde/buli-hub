CREATE TABLE "seeding_locks" (
	"window_id" uuid PRIMARY KEY NOT NULL,
	"holder_id" uuid NOT NULL,
	"acquired_at" timestamp with time zone DEFAULT now() NOT NULL,
	"heartbeat_at" timestamp with time zone DEFAULT now() NOT NULL
);
