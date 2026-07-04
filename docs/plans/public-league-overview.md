# Public league overview

**Status: implemented** (2026-07-04) — full suite green (337 tests), `/dev/ui`
verified (switcher · tables · current matchday); a design pass will follow.

A public (no-login) league overview that **replaces the landing page `/` while a
season is running** (`seasonPhase === "regular_season"`). In every other phase `/`
stays the current landing (anon sign-in / logged-in CTA). Anonymous visitors see
the whole league; a logged-in player additionally gets their row highlighted and a
link to their dashboard.

Views + read queries only — reuses `computeStandings`, `divisionStandings`,
`assignZones`, `divisionGroups`, `subDivisionMatches`/`subDivisionResults`,
`matchdaysForWindow`, and the `StandingsTable` component. No domain-logic changes.

## Scope (v1, functional — a design pass follows)

**In:**

- `/` branches on phase: overview when running, existing landing otherwise.
- A **division switcher** (Division 1 / 2 / …) showing one division at a time.
- Per division: every sub-division's standings table, plus the **Gesamttabelle**
  when that division is in `division` mode — with the post-season zones tinted
  (promotion / demotion / playoff / champion), same rules as the player view.
- Per sub-division: the **current matchday** — that round's pairings with their
  result (score / walkover) or „offen" + deadline; byes shown as „spielfrei".
- Logged-in visitor: row highlight + „Zum Spieler-Dashboard" link.

**Out:**

- Full schedule / history browsing (only the current round is shown).
- Clickable results — the match page is login-gated; rows are display-only. A
  public match view is a later feature.
- Division-by-division deep-linking / routing (switcher is client state).
- Perf hardening — the query fans out per sub-division; fine for launch volume,
  revisit if needed.

## Affected code

- `src/app/page.tsx` — compute the phase (`latestWindow` → `registrationState` →
  `getSeeding` → `hasSchedule` → `seasonPhase`); render `<PublicLeague>` when
  running, else the current landing (extracted to a `LandingHero`).
- `src/features/public-league/queries.ts` (new) — `publicLeagueOverview(windowId,
  today)` returns everything the page needs (see shape below), computing standings
  + zones and the current round's matches per group.
- `src/features/public-league/components/public-league.tsx` (new, client) — the
  division switcher + per-division layout; reuses `StandingsTable`; a small
  `MatchdayList` for the current round (non-clickable rows).
- `src/features/dev/components/gallery.tsx` — a specimen with mock divisions
  (sub_division + division mode, a few zones, a current matchday).

## Data shape

```
PublicOverview {
  seasonName; currentRound | null; totalRounds;
  divisions: PublicDivision[]
}
PublicDivision {
  tier; name; mode;
  divisionStandings: StandingsRow[] | null;   // Gesamttabelle (division mode)
  divisionZones: Map<userId, Zone> | null;
  divisionGroupLabels: Map<userId, shortName> | null;
  groups: PublicGroup[]
}
PublicGroup {
  subDivisionId; name; shortName;
  standings: StandingsRow[];
  zones: Map<userId, Zone> | null;             // sub_division mode
  round | null; matches: PublicMatch[]          // current round
}
PublicMatch {
  playerA: Identity; playerB: Identity | null;  // null = bye
  reported; pending; scoreA | null; scoreB | null; winnerId | null
}
```

Zones follow the relevant table exactly like `/spieler`: division mode →
`divisionStandings` carries zones (per-division counts), groups carry none;
sub_division mode → each group carries zones (per-group counts). Scores from
`scoreFor` (per-game counts; walkover 2:0; double loss 0:0).

## Test cases

Domain logic is unchanged (already covered). The public query is a composition of
tested pieces; an integration smoke test can assert `publicLeagueOverview` returns
one entry per division with standings + a current-round match list. UI is
view-only (no tests, per the testing strategy).
