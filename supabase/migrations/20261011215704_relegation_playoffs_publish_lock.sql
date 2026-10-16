-- FKs + RLS for the staff tie orders, and the lock of the regular season
-- (docs/plans/relegation-and-playoffs.md).

ALTER TABLE "tie_orders"
  ADD CONSTRAINT "tie_orders_window_id_fk"
  FOREIGN KEY ("window_id") REFERENCES "registration_windows" (id)
  ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "tie_orders"
  ADD CONSTRAINT "tie_orders_decided_by_id_fk"
  FOREIGN KEY ("decided_by_id") REFERENCES auth.users (id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "tie_orders" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Once Relegation und Playoffs are published, the regular season's results
-- are final. The actions refuse every change with a readable message; this
-- trigger is the safety net behind them, like the RLS policies are behind the
-- server code: a write to a regular match's result, games, team sheets or
-- disputes in a closed season is rejected here whatever path it came by.
-- A delete that cascades from a deleted match or window passes: the match is
-- gone by then, so the lookup finds nothing.
CREATE FUNCTION "reject_closed_regular_write"() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE
  target uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target := OLD.match_id;
  ELSE
    target := NEW.match_id;
  END IF;
  IF EXISTS (
    SELECT 1
    FROM "matches" m
    JOIN "registration_windows" w ON w.id = m.window_id
    WHERE m.id = target
      AND m.stage = 'regular'
      AND w.regular_season_closed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'regular season closed: results of match % are final', target
      USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "match_results_regular_lock"
  BEFORE INSERT OR UPDATE OR DELETE ON "match_results"
  FOR EACH ROW EXECUTE FUNCTION "reject_closed_regular_write"();
--> statement-breakpoint
CREATE TRIGGER "match_games_regular_lock"
  BEFORE INSERT OR UPDATE OR DELETE ON "match_games"
  FOR EACH ROW EXECUTE FUNCTION "reject_closed_regular_write"();
--> statement-breakpoint
CREATE TRIGGER "team_sheets_regular_lock"
  BEFORE INSERT OR UPDATE OR DELETE ON "team_sheets"
  FOR EACH ROW EXECUTE FUNCTION "reject_closed_regular_write"();
--> statement-breakpoint
CREATE TRIGGER "disputes_regular_lock"
  BEFORE INSERT OR UPDATE OR DELETE ON "disputes"
  FOR EACH ROW EXECUTE FUNCTION "reject_closed_regular_write"();
