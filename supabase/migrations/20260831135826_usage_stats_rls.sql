-- RLS for the usage statistics tables. Server-only (RLS on, no policies), like
-- every other table the app reads through Drizzle: the PostgREST path can
-- neither read nor write them, only server code (which bypasses RLS) does.
-- The tables hold aggregates only (docs/plans/usage-stats.md), so this is
-- defense in depth rather than protection of personal data.

ALTER TABLE "usage_periods" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "usage_salts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "usage_collection" ENABLE ROW LEVEL SECURITY;
