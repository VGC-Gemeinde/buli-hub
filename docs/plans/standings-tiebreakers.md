# Standings tiebreakers

**Status: done** (2026-07-03)

Rework sub-division standings so ties resolve on a principled, opponent-independent
order instead of falling through to alphabetical. Today `computeStandings` ranks by
`points → fewest losses → name`; "fewest losses" is inert in a completed round-robin
(equal matches played ⇒ equal wins imply equal losses) and mildly perverse mid-season
(rewards games in hand), so tied players are effectively ordered by name.

Standings will later feed promotion/relegation and playoff qualification, where players
from **different sub-divisions who never met** are compared. That rules out any
opponent-dependent tiebreaker (head-to-head, strength of schedule). Those comparisons are
guaranteed equal group size by the future feature, so raw match-win counts stay comparable.

## Ruleset

Rank order (each level breaks ties left by the previous):

1. **Match wins** (raw count)
2. **Game differential** (`gamesWon − gamesLost`)
3. **Game win rate** (`gamesWon / (gamesWon + gamesLost)`)
4. **Genuinely tied** — players equal on all three **share a rank**; the next rank skips
   (standard competition ranking: two 3rd places → next is 5th). Display order within a tie
   is alphabetical for stability, but the shared rank number does not distinguish them.

Resolving a genuine tie when it actually matters (a promotion/relegation/playoff boundary)
is **out of scope** — deferred to the postseason feature, which will surface unresolved
ties for a staff decision.

Game scoring per outcome (only finished results count):

- **normal** — the actual per-game winners (2:0 or 2:1).
- **free win** (confirmed) — winner 2:0, loser 0:2 (walkover default, like a no-show).
- **double loss** — 0:2 for both (a default game loss each; dents game rate exactly like an
  honest 0-2, rather than rewarding a non-played match).
- **pending free win, bye, unreported** — count for nobody.

## Scope

**In:**

- `computeStandings`: tally `gamesWon`/`gamesLost`; sort `wins → differential → rate → name`;
  assign competition ranks (shared rank + gaps) where players are genuinely tied.
- `groupResults` query: join `match_games` and pass per-game winners through.
- Surface the game record in the standings table so the order is legible (functional; the
  designer can refine layout later).
- Tests + `/dev/ui` gallery fixture.

**Out:** genuine-tie resolution (postseason), cross-sub-division comparison, promotion/
relegation, mid-season drops.

## Schema

None. `match_games` already stores per-game winners.

## Affected code

- `src/features/reporting/standings.ts` — `StandingsRow` gains `gamesWon`, `gamesLost`;
  `ResultForStandings` gains `games`; new comparator + competition ranking.
- `src/features/reporting/queries.ts` — `groupResults` joins `match_games` (same grouping
  pattern as `subDivisionResults`).
- `src/features/season/components/season-dashboard.tsx` — standings table shows match
  Bilanz (`wins:losses`), game differential (`Diff.`), and Punkte. The table scrolls
  horizontally on narrow screens with the Platz + Spieler columns frozen (sticky) on the
  left; frozen cells use an opaque base + a `before` tint so scrolled columns don't bleed
  through and the current-user highlight stays consistent.
- `src/features/dev/components/gallery.tsx` — `DASH_STANDINGS` fixture gains the new fields.

No Discord touchpoints.

## Implementation notes

- **Genuine-tie detection uses integers, not the float rate.** Two players are genuinely
  tied iff `wins`, `gamesWon`, and `gamesLost` are all equal (given equal differential, an
  equal rate implies equal totals). Compare the integers directly; never `===` on the
  computed rate. The float rate is used only for *sort ordering*, where a name fallback
  handles any residual float ambiguity.
- `points` (= `wins × 3`) stays as a display value; ordering by match wins is identical.

## Test cases (`standings.test.ts`)

- normal result: per-game winners counted (2:0 and 2:1).
- free win: pending counts for nobody; confirmed is 2:0 winner / 0:2 loser.
- double loss: 0:2 for both, a win for neither.
- bye / unreported: count for nobody.
- **differential breaks a match-win tie** (cleaner game record ranks higher).
- **game win rate breaks a differential tie** (Case 1 from the design discussion:
  both +4 differential, higher rate wins).
- **differential outranks rate when they conflict** (Case 2: 12–5 differential +7 beats
  10–4 differential +6, even though the latter has the higher rate).
- competition ranking: a genuine tie produces a shared rank and a gap (…, 3, 3, 5, …).
- ranks are contiguous from 1 when there are no ties.
