# Public player profile

**Status: done** (2026-07-06) — `/spieler/[userId]` with reused
`ProfileHeader`, season line (rank + Drop tag), spoiler-protected Spielplan
with the cookie switch, and `PlayerLink` applied to standings tables, the
match page (scoreboard + open view), the MotW billboard, and the staff drops
list. Verified via unit/integration tests and a seeded season (both cookie
states, MotW exemption, dropped and unplaced profiles, 404, link
touchpoints).

## Context

Every player gets a public profile page: the identity block known from the
edit-profile page (avatar, display name, @handle, role badge), their current
division and place, and their spoiler-protected Spielplan. Player names
across the app become links to it. No new data — the page assembles existing
profile, placement, standings, and schedule projections (drop override and
MotW rules flow through automatically).

## Scope

**In:**
- **Route `/spieler/[userId]`** — public, no auth. Unknown id / no profile
  row → 404. (`/spieler` stays the own dashboard; `/profil` stays the own
  settings page.)
- **Identity block**: reuse `ProfileHeader` (avatar, name, `roleLabel`
  badge, @handle) — identical to the edit page's header.
- **Season line** (when placed in the running season): "{Division 1a} ·
  Platz {n}" from the group standings, with the Drop tag when the player is
  dropped. Not placed / no running season → an informational card instead
  (header always renders).
- **Spielplan**: the player's matches (round, dates, opponent, score slot),
  one row per round, each linking to `/match/[matchId]`. Score slots follow
  the site-wide spoiler rules: covered pill with tap-to-reveal, MotW rows
  show the orange MotW pill (exempt from the switch), matches involving the
  *viewer* are always open (own results are never spoilers). Byes render
  "spielfrei".
- **Page switch**: the same `SpoilerSwitch` (cookie `spoilers_off`) in the
  page header — arriving with protection off keeps the page open; default
  is protected; flipping it here affects the whole site, exactly like the
  overview switch.
- **Staff panel**: below the page, staff+ only (same navy anatomy as the
  match page's panel), shown when the player is placed in the running
  season: drop the player (fixed-player variant of the drop dialog — reason
  + type-to-confirm) or lift an existing drop (reason shown).
- **Name links**: a shared `PlayerLink` (name → `/spieler/{userId}`, subtle
  hover) applied where a name is currently plain text:
  - `StandingsTable` rows (public overview, Spieler-Dashboard, profile —
    all shared).
  - Match page: `ReportSummary` scoreboard sides + mobile rows,
    `PublicMatchView` sides.
  - MotW billboard sides.
  - Staff drops list.
  Deliberately *not* linked: rows that are themselves links (public
  overview match rows, staff dashboard/MotW manager rows — the match link
  wins; profiles stay reachable via the match page).

**Out (deferred):**
- Past seasons / history, achievements, self-description.
- Linking every last staff-internal occurrence of a name.

## Feature folder — `src/features/player-profile/`

**Queries (`queries.ts`, integration-tested):**
- `profileIdentity(userId)` — display name, username, avatar, role from
  `profiles`; null when absent (→ 404).

**Assembly (page, reusing existing pieces):** `latestWindow` + `seasonPhase`
→ `playerPlacement` → `groupRoster` + `groupResults` → `computeStandings` +
`markDropped` (rank + Drop tag) → `subDivisionMatches` +
`subDivisionResults` + `matchdaysForWindow` + `buildPlayerMatches` (the
schedule) + `motwForWindow` (MotW row flags). A small pure helper
`profileScheduleRows(...)` (unit-tested) merges matches, results, MotW ids
and the viewer id into render-ready rows (opponent, score state, isMine,
isMotw).

**Components (`components/`):**
- `PlayerLink` — the shared name link.
- `ProfileSchedule` (client) — the Spielplan rows with `SpoilerScore`
  slots and per-row reveal state (cleared when protection is switched back
  on, like the overview rows).

## Views

- `src/app/spieler/[userId]/page.tsx` — SiteHeader, `ProfileHeader`, season
  line + `SpoilerSwitch` row, `ProfileSchedule` (or the not-placed card).
- Name-link touchpoints listed above (view-only edits).

## Dev tooling

- Gallery: `ProfileSchedule` rows (open / covered / revealed / MotW / bye /
  viewer's own match), season line with and without Drop tag.

## Tests

- Unit: `profileScheduleRows` (result mapping, isMine exemption, MotW flag,
  bye, unreported).
- Integration: `profileIdentity` (present / absent).
- Manual: seeded season — open a profile from a standings row; verify
  identity block, Platz, covered Spielplan, per-row reveal, switch carrying
  over from the overview (both directions), MotW row staying covered,
  dropped player's profile (Drop tag), staff persona viewing their own
  profile (no season line).

## Delivery

Branch `feat/player-profile`, squash-merged to main as one commit.
