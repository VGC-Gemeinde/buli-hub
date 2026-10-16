-- Once the season is completed, no result changes at all
-- (docs/plans/relegation-and-playoffs.md): the regular lock extends to every
-- match of the season. Same function, same triggers; cascading deletes still
-- pass because the match is gone by then.
CREATE OR REPLACE FUNCTION "reject_closed_regular_write"() RETURNS trigger
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
      AND (
        w.season_completed_at IS NOT NULL
        OR (m.stage = 'regular' AND w.regular_season_closed_at IS NOT NULL)
      )
  ) THEN
    RAISE EXCEPTION 'results of match % are final', target
      USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
