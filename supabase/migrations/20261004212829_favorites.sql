CREATE TABLE "favorites" (
	"user_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_user_id_player_id_pk" PRIMARY KEY("user_id","player_id"),
	CONSTRAINT "favorites_not_self" CHECK ("favorites"."user_id" <> "favorites"."player_id")
);
