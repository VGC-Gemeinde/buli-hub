# Player season dashboard

**Status: done** (2026-07-03) — "Spieler-Dashboard" at `/spieler`, phase-aware
across the whole lifecycle. Verified end to end via a persona on a seeded
running season.

The personal, per-player home for the running regular season: where a player
sees **their group and their weekly matches**. It is the surface the result
**reporting** flow will attach to later — a match row is where "Ergebnis melden"
will live — so it is built first, before reporting and before the staff
running-season dashboard.

Personal only: every signed-in player gets their own dashboard, visible to no
one else. A **public** division/standings view (browse all groups) is a separate
later feature.

## Sequencing

This feature is the read surface; the rest of the running season builds on it:

1. **Player season dashboard (this).** Read-only: group, schedule, my matches.
2. **Result reporting.** Adds result columns to `matches` and the report/confirm
   flow; each match row on this dashboard gains a report action.
3. **Staff running-season dashboard.** Monitors unreported / overdue / disputed
   matches — the feature originally requested, now downstream of reporting.
4. **Public division view.** Browsable groups + standings.

## Scope

**In:**
- A player's own group identity (division + sub-division, e.g. "Division 1a").
- The season schedule: matchdays (weeks) with their dates and deadlines.
- The player's matches across the season: opponent per round, with the current
  week highlighted and past / upcoming distinguished; byes shown as such.
- The group roster (the co-players the player will face).
- Prominent, everyone-facing navigation to reach it.
- Empty/edge states (not placed in the running season; no running season).

**Out (deferred to the features above):**
- Any result, score, standings/table — no results exist until reporting. Rows
  are read-only pairings for now.
- The report action itself.
- Any public / signed-out view.

## Navigation (the load-bearing decision)

Unlike the Staff-Bereich — deliberately tucked in the user-menu popout because
it is gated and staff are taught it — this dashboard is for **every** player and
must be easy to find:

- A **primary nav link in `SiteHeader`** ("Spieler-Dashboard"), visible to all
  signed-in users. It is phase-aware (see States), so it stays useful before the
  season runs, not only during it.
- The signed-in **home** (`/`) surfaces it (its "Features in Arbeit"
  placeholder gives way to a prominent entry / CTA to the dashboard).
- Route: **`/spieler`** (consistent with `/anmeldung`, `/profil`). The exact
  path is not important; discoverability is.

## What it shows (regular season)

Three stacked sections, top to bottom:

1. **Next pairing** — the prominent hero at the top: the player's *next* match —
   opponent (or "Bye"), matchday no., its deadline (`matchdays.ends_on`) and
   days remaining. This is the one thing a player opens the page for.
2. **Group table** — a standings table for the player's sub-division: every
   member with rank, name and points. **Until reporting exists, points are
   hard-coded to 0** (record 0:0) — the real table layout, waiting for numbers.
   Ordered neutrally (by name) while every row is tied at 0.
3. **Upcoming matches** — the rest of the player's schedule ahead of the next
   pairing: round no., opponent, deadline. No result column yet.

Past matches are not shown in v1 — there are no results to display, so the view
is forward-looking (next + upcoming). They arrive with reporting.

## States (phase-aware)

The dashboard is the player's home across the whole season lifecycle. State is
derived from `seasonPhase` plus whether the player has a registration row
(`getRegistration`) and a placement.

**Regular season (schedule exists):**
- **Placed** — the three sections above (next pairing / group table / upcoming).
- **Bye week** — the next-pairing hero reads "Bye" (a `matches` row with
  `player_b_id` null where the player is A); the following real match still
  appears under upcoming.
- **Not placed** — signed in but no placement in the running season: "du bist in
  der laufenden Saison nicht dabei."

**Before the regular season:**
- **No registration open** (`not_started` / between seasons) — a landing-style
  "coming soon" message, like today's signed-in home: the league is in progress,
  the next season will appear here. Nothing actionable.
- **Registration open, not registered** — a call to action: "die Anmeldung für
  {Saison} läuft" + a button to `/anmeldung`.
- **Registration open, registered** — the existing `RegistrationConfirmation`
  with `canWithdraw = true`: the player's submitted details plus the ability to
  withdraw / change while the window is open (the confirmation view we already
  have).
- **Registration closed, registered** (seeding / division step) — the same
  `RegistrationConfirmation` in read-only form (`canWithdraw = false`) with a
  note that entries can no longer be changed and to wait for the pairings.
- **Registration closed, not registered** — "die Anmeldung ist geschlossen — du
  bist in dieser Saison nicht dabei."

Reuse: the two "registered" states are the existing `RegistrationConfirmation`
component. It already toggles the withdraw control via `canWithdraw`; the only
addition is an **optional note prop** for the closed-state "du kannst deine
Angaben nicht mehr ändern — warte auf deine Paarungen" line (its default stays
the current Discord subline).

## Data (no schema change)

Everything already exists; this feature adds only queries.

- Current window + phase via `latestWindow()` + `registrationState(...)` +
  `seasonPhase(...)` — selects the state above.
- Registration status via `getRegistration(windowId, userId)` (drives the
  pre-season registered / not-registered branches).
- Player's placement → `sub_division_id` + `division_id` (`placements`).
- Group identity: `divisions.tier` + `sub_divisions.position` → name (reuse the
  seeding naming helpers).
- Roster: all `placements` in the sub-division, joined to `profiles` for
  identity.
- Schedule: `matchdays` for the window (round, starts_on, ends_on).
- My matches: `matches` where `sub_division_id` = mine and I am `player_a_id`
  or `player_b_id`, joined to the matchday for the same `(window, round)`;
  opponent = the other player id → `profiles`.

## Domain logic (pure, unit-tested)

`src/features/season/` (new feature folder):

- `currentMatchday(matchdays, today)` — the active round (`starts_on <= today <=
  ends_on`), else the nearest upcoming, else null (season over). Tested:
  before season, mid-week, on a boundary, in a gap between weeks, after the last
  week.
- `classifyMatch(match, matchday, today)` → `"past" | "current" | "upcoming"`.
- `opponentOf(match, userId)` → the other player id, or `null` for a bye.
- Group naming reused from `features/seeding/seeding.ts` (or lifted to a shared
  helper if cleaner).

## Discord

None — read-only view, no mutations, no notifications.

## Dev tooling (definition of done)

- **Gallery**: dashboard states — in-season with a full schedule, current-week
  card, bye week, not-in-season, no-running-season.
- **Seed helper**: extend the dev seed to a **running-season** fixture
  (finalized seeding + generated schedule + matches) so a logged-in persona
  actually lands on a populated dashboard. Today's seed only reaches a closed
  window; this adds the phase the dashboard needs.
- **Personas**: ensure a persona is placed in a group of that seeded season so
  "Meine Saison" is non-empty for it.

## Tests

- **Unit**: `currentMatchday`, `classifyMatch`, `opponentOf` (all cases above).
- **Integration**: the "my season" query — placement → group → matches +
  opponents + matchdays round-trips for a seeded running season; a user with no
  placement returns the not-in-season shape.
- **Manual/browser**: a placed persona sees their group + schedule with the
  current week highlighted and a bye rendered; a non-placed persona sees the
  empty state; navigation from home + header.

## Open questions

None — pre-season behavior is settled (see States and decision 6).

## Resolved decisions

1. **Personal, not public** — one dashboard per player, visible only to them;
   the public division view is a separate later feature.
2. **Read-only v1** — no reporting; match rows are the attachment point for the
   future report action. The **group table ships now with hard-coded 0 points**
   so the layout is settled before results exist.
3. **Prominent navigation** — primary "Spieler-Dashboard" header link (visible
   to all signed-in users) + home entry, not hidden like the Staff-Bereich,
   because every player uses it.
4. **Layout** — next pairing (hero) → group table (columns Platz · Spieler ·
   Bilanz · Punkte, all zero for now) → upcoming matches; forward-looking (no
   past matches in v1).
5. **No schema change** — pure read view over existing placements / matchdays /
   matches (+ registration read for the pre-season states).
6. **Phase-aware year-round** — the dashboard adapts across the whole lifecycle:
   coming-soon (no registration) → register CTA (open, not registered) →
   editable confirmation (open, registered) → read-only confirmation + "warte
   auf deine Paarungen" (closed, registered) → the running-season dashboard.
   Reuses `RegistrationConfirmation` for the registered states.
