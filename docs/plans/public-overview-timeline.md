# Public overview — browsable Spieltage

Status: in progress

## Goal

Redesign the public league overview (shown on `/` during a running season) so a
neutral observer can browse the tournament the way the player dashboard already
lets a player browse theirs: pick a division, pick a group, read one table at a
time, and step through the Spieltage to see each round's pairings and results.

## Scope

In:
- Keep the division switcher (existing).
- Add a **sub-division switcher** (pills): the single driver for both the table
  and the schedule shown. In division mode it gains a leading **„Gesamt"** entry
  that shows the merged Gesamttabelle *and* the whole division's schedule (every
  group's pairings for the selected round); Gesamt is the default there. In
  sub_division mode there is no Gesamt entry — only the groups. Zones decorate
  the relevant table only (group table in sub_division mode, merged table in
  division mode).
- A **browsable Spieltag timeline**: an interactive version of the dashboard's
  `ProgressStrip`. Segments 1..totalRounds, clickable; the selected round starts
  at the current matchday. Below it, the selected group's pairings/results for
  the selected round (with the week's date range shown).
- Matches always follow the sub-division switcher, even while the Gesamttabelle
  is on screen.
- A logged-in visitor still gets their row highlighted (`meId`) and the link to
  their dashboard.

Out:
- No domain-logic changes. Standings, zones, and match state stay as-is.
- No new match detail; rows still link to the public `/match/[id]` page.

## Data (`src/features/public-league/queries.ts`)

- `PublicMatch` gains `round: number`.
- `PublicGroup.matches` returns **all** rounds' matches (drop the current-round
  filter); the component filters by the selected round.
- `PublicDivision.divisionStandings` (+ `divisionZones`, `divisionGroupLabels`)
  is set only in `division` mode, where the merged table is the relevant one and
  carries the zones; it drives the „Gesamt" entry.
- `PublicOverview` gains `matchdays: MatchdayLite[]` so the timeline can show the
  selected round's date range.

## View (`src/features/public-league/components/public-league.tsx`)

- `DivisionView` (keyed by tier so state resets on division switch): holds the
  selected entry (a sub-division id or „gesamt") and the selected round.
- Sub-division switcher → two columns: standings (left) | Spielplan (right). The
  Spielplan column stacks the Spieltag timeline above the selected round's
  matches, so on mobile the order is Tabelle → Timeline → Spielplan.
- Standings reuse the dumb `StandingsTable`; no dashboard `StandingsPanel` copy
  (its second-person phrasing is wrong for neutral observers).

## Tests

Pure logic is unchanged, so no new unit tests. `/dev/ui` `PublicLeague` specimen
updated to the new shape (matches carry `round`, overview carries `matchdays`).
