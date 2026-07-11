-- The running season's explicit decision (Orga-Team, 2026-07-11): proof is
-- mandatory for divisions 1 and 2. New seasons start undecided (null) — the
-- finalize gate forces the decision per season.
UPDATE "seedings" SET "replay_required_tiers" = 2;
