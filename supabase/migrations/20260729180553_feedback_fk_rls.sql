-- FKs + RLS for the feedback intake. Server-only (RLS on, no policies), like
-- the other write-only tables: nothing reads this through PostgREST, because
-- the Discord forum is where reports are read.
--
-- A report dies with its reporter's account — the row is only useful together
-- with the person who can answer follow-up questions. The window reference is
-- informational context, so deleting a season must never delete reports: set
-- null, like the other provenance references.

ALTER TABLE "feedback_reports"
  ADD CONSTRAINT "feedback_reports_reporter_id_auth_users_fk"
  FOREIGN KEY ("reporter_id") REFERENCES auth.users (id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "feedback_reports"
  ADD CONSTRAINT "feedback_reports_window_id_fk"
  FOREIGN KEY ("window_id") REFERENCES "registration_windows" (id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "feedback_reports" ENABLE ROW LEVEL SECURITY;
