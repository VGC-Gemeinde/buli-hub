-- Season 9: the one replacement made before replacements were a feature,
-- rewritten into the state the feature produces (docs/plans/player-
-- replacement.md). Testio | Anton was dropped on 14.09. after round 1; Ni2
-- took over his slot from round 2 on and accepted the same evening.
--
-- The hand-made state had Ni2 on Anton's original placement row with all
-- seven matches of the slot, round 1 included, and Anton on a new dropped
-- placement without a group. The feature leaves the replaced player on his
-- own placement with the matches before the entry round, gives the
-- replacement a new placement with the matches from the entry round on, and
-- records the replacement.
--
-- Guarded by the exact ids and state: on any other database (local, a
-- staging that was not refreshed from production, a production that was
-- already rewritten) it changes nothing.

DO $$
DECLARE
  season_window constant uuid := '46760568-8ae3-4471-b825-e027fefbb662';
  anton constant uuid := 'eb77a06c-66d1-4be0-a2ce-0cfc491a6e4e';
  ni2 constant uuid := '802cc092-e67d-4e32-ad60-ddad9ba17533';
  original_row constant uuid := '36ab2a30-cdd9-42d7-aa04-900e70027a7b';
  handmade_row constant uuid := '11d99065-3177-42d1-8ee6-13cd880f1e86';
  round_one constant uuid := '28ddab46-e092-4a3e-b4bf-6c0796f3ac9e';
  taken_over_at constant timestamptz := '2026-09-14 22:11:43.570165+00';
  dropped record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM placements
    WHERE id = original_row AND window_id = season_window AND user_id = ni2
      AND sub_division_id IS NOT NULL AND dropped_at IS NULL
  ) OR NOT EXISTS (
    SELECT 1 FROM placements
    WHERE id = handmade_row AND window_id = season_window AND user_id = anton
      AND sub_division_id IS NULL AND dropped_at IS NOT NULL
  ) OR NOT EXISTS (
    SELECT 1 FROM matches
    WHERE id = round_one AND round = 1 AND player_b_id = ni2
  ) THEN
    RAISE NOTICE 'season 9 replacement backfill: state not found, nothing to do';
    RETURN;
  END IF;

  SELECT dropped_at, dropped_by_id, drop_reason INTO dropped
  FROM placements WHERE id = handmade_row;

  -- Anton back onto his own placement, dropped as he was; Ni2 onto a
  -- placement of his own, created when he took over. The hand-made row goes
  -- first so the (window, user) uniqueness never sees two rows for one user.
  DELETE FROM placements WHERE id = handmade_row;
  UPDATE placements
  SET user_id = anton,
      dropped_at = dropped.dropped_at,
      dropped_by_id = dropped.dropped_by_id,
      drop_reason = dropped.drop_reason
  WHERE id = original_row;
  INSERT INTO placements
    (id, window_id, user_id, division_id, sub_division_id, created_at)
  SELECT handmade_row, window_id, ni2, division_id, sub_division_id,
         taken_over_at
  FROM placements WHERE id = original_row;

  -- Round 1 was Anton's match: it stays his, the drop's free win for the
  -- opponent. Rounds 2 to 7 are Ni2's.
  UPDATE matches SET player_b_id = anton WHERE id = round_one;

  INSERT INTO player_replacements
    (window_id, replaced_user_id, replacement_user_id, offered_by_id,
     offered_at, entry_round, accepted_at)
  VALUES
    (season_window, anton, ni2, NULL, taken_over_at, 2, taken_over_at);
END $$;
