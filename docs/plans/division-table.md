# Division table

**Status: done** (2026-07-04) — unit + integration tests green, `/dev/ui` verified
in the browser.

A second standings view that aggregates every sub-division of a division into one
table, alongside the existing per-sub-division table. The player dashboard's
"Tabelle" section gains a switcher between **the player's own group** (e.g.
Division 1a) and **the whole division** (Division 1).

The division table reuses the existing ranking: `computeStandings` was built for
this — its keys (match wins → game differential → game win rate) are all
opponent-independent, "so the same order holds when comparing players from
different (equal-size) sub-divisions" (see `standings.ts` header). A division table
is just `computeStandings` over the merged roster + results of all its groups.

The one exception, added later: group standings also rank on **head-to-head**,
between differential and rate. That key is opponent-dependent and does not exist for
most pairs in a division table, so `divisionStandings` switches it off
(`headToHead: false`). See [[standings-head-to-head]] — including the accepted
consequence for divisions whose `relevantTable` is `division`.

## Why the equal-size gate

Combining groups by raw match wins is only fair when every player has played the
same number of matches. In a round-robin that means equal group size. So the
division view is offered **only when all sub-divisions in the division have the
same roster size** (and the division has at least two groups — with one group the
division table equals the sub-division table, so there is nothing to switch to).
When sizes differ, no switcher appears and only the sub-division table shows, as
today.

"Size" is the **actual placed-player count** per sub-division (the standings
roster length), not the season's configured `subDivisionSize` — a season may seed
its lowest division into unevenly sized groups, and that is exactly the case the
gate must catch.

Mid-season the combined table reflects results reported so far, exactly like the
sub-division table already does; matchdays are shared per window, so scheduled
progress is in step across groups. No extra handling.

## Scope

**In:**

- Pure `divisionStandings(groups)` → `StandingsRow[] | null`: `null` when there are
  fewer than two groups or their roster sizes differ; otherwise `computeStandings`
  over the concatenated rosters + results.
- Query to load every group of a division (roster + results per group) in one place.
- Player dashboard: compute both tables server-side, pass to the view.
- A client tab switcher on the "Tabelle" section; the standings table markup
  extracted into a reusable dumb component so both views share it. The current
  player's row stays highlighted in both views.
- Tests (pure function + query integration) and `/dev/ui` gallery states.

**Out:**

- Any standings surface other than the player dashboard — it is the only place a
  standings table is rendered today (staff sees a match worklist, not standings).
- A standalone division/division-overview page.
- Genuine-tie resolution across the division (still deferred to postseason, same as
  the sub-division table).
- Schema changes; Discord touchpoints.

## Schema

None. `divisions → sub_divisions → placements/matches/match_results` already model
everything; the division id is already on `placements`.

## Affected code

- `src/features/reporting/standings.ts` — add pure `divisionStandings(groups)`.
  `groups: readonly { roster: readonly Identity[]; results: readonly ResultForStandings[] }[]`.
  Equal-size gate + merge + delegate to `computeStandings`. No change to
  `computeStandings` itself.
- `src/features/season/queries.ts` — add `divisionGroups(divisionId)` returning
  `{ subDivisionId, position, roster, results }[]` ordered by position, reusing the
  same roster/result grouping shape as `groupRoster` / `groupResults`.
- `src/app/spieler/page.tsx` — fetch `divisionGroups(placement.divisionId)`; derive
  the player's own group (for the existing sub-division table + `rosterById` used by
  the schedule) from it, and `divisionStandings(...)` for the division view. This
  replaces the separate `groupRoster` / `groupResults` calls for standings (the
  player's group is one of the division's groups), so the group is fetched once.
- `src/features/season/components/standings-panel.tsx` (new, `"use client"`):
  - `StandingsTable({ standings, meId })` — the dumb standings `<table>`, extracted
    from `InSeasonDashboard`.
  - `StandingsPanel({ groupName, groupStandings, divisionName, divisionStandings,
    meId })` — a segmented control switching `StandingsTable` between group and
    division. `divisionStandings === null` → no tabs, just the group table (today's
    behaviour).
- `src/features/season/components/player-avatar.tsx` (new): `PlayerAvatar` extracted
  from `season-dashboard.tsx` so both the (server) dashboard and the (client)
  standings panel can import it without a client↔server import cycle.
- `src/features/season/components/season-dashboard.tsx` — `InSeasonDashboard` gains
  `divisionName: string` and `divisionStandings: StandingsRow[] | null` props and
  renders `StandingsPanel` in the Tabelle section; the inline table + `PlayerAvatar`
  move out to the two files above.
- `src/features/dev/components/gallery.tsx` — a `DASH_DIVISION_STANDINGS` fixture and
  two `InSeasonDashboard` specimens: division view available (tabs) and unavailable
  (`divisionStandings: null`, no tabs).

No persona changes (no new auth-metadata shapes).

## UI (functional build, pre-designer)

A segmented control above the table, following the existing view-switch pattern in
`report-form.tsx` and the design tokens in `DESIGN.md` (orange active state, navy
tints, uppercase condensed labels). Two segments: the sub-division name
(`subDivisionName`, e.g. "Division 1a") and the division name (`divisionName`, e.g.
"Division 1"), default on the player's own group. This is deliberately rudimentary
but on-brand; a later design pass may refine it (view only).

## Test cases

Pure (`standings.test.ts` or a new `division.test.ts`):

- fewer than two groups → `null`.
- unequal group sizes → `null`.
- two equal-size groups merge and rank cross-group: a 3–0 player in group A outranks
  a 2–1 player in group B; game differential/rate break ties across groups.
- genuinely tied players from different groups share a rank (…, 3, 3, 5, …).
- head-to-head is off: a tied pair from the *same* group still shares a rank here,
  even when one beat the other (see [[standings-head-to-head]]).

Integration (`queries.integration.test.ts`):

- `divisionGroups` returns one entry per sub-division with the correct roster and
  results grouped by group; feeds `divisionStandings` to a sane combined table.

## Open questions

None blocking — see the two-tab scope and the equal-size definition above; both are
decided in this plan.
