-- FKs + RLS for disputes. Server-only (RLS on, no policies). A dispute dies
-- with its match; the opener cascades; the resolver is informational (set null).
-- At most one open dispute per match.

ALTER TABLE "disputes"
  ADD CONSTRAINT "disputes_match_id_fk"
  FOREIGN KEY ("match_id") REFERENCES "matches" (id) ON DELETE CASCADE;

ALTER TABLE "disputes"
  ADD CONSTRAINT "disputes_opened_by_id_auth_users_fk"
  FOREIGN KEY ("opened_by_id") REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE "disputes"
  ADD CONSTRAINT "disputes_resolved_by_id_auth_users_fk"
  FOREIGN KEY ("resolved_by_id") REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX "disputes_one_open_per_match"
  ON "disputes" ("match_id") WHERE "status" = 'open';

ALTER TABLE "disputes" ENABLE ROW LEVEL SECURITY;
