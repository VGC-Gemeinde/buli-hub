# Season schedule (Spielplan)

**Status: done** (2026-07-03) — the running-season dashboard (`/staff/season`)
lands as its own feature; a placeholder ships here.

Once a season's seeding is **finalized**, each sub-division is a fixed
round-robin group. This feature turns those groups into a concrete match
calendar: staff open a dialog, adjust the weekly "Spieltag" dates around
holidays and offline events, and confirm — which generates a single
round-robin per group and moves the season into its **regular-season** phase.
It is the spine the later reporting and standings features hang off.

Depends on the **finalize rework** (renaming the seeding publish → finalisieren
and adding the staff-area entry points); see `docs/plans/finalize-rework.md`.

## Precondition

The season's seeding is **finalized** (`seedings.finalized_at` set) **and no
schedule exists yet**. Generation is only possible in this phase — registration
closed, seeding finalized, season not yet running. Once a schedule exists the
season is running and generation is closed for good.

## Workflow (target end state)

1. Precondition: the seeding is finalized.
2. Staff click **"Spielplan erstellen"** → a dialog opens.
3. The dialog lists the Spielwochen with **one editable end-date (deadline) per
   week**. Spielwoche 1 **starts on creation**; its deadline defaults to the
   next Sunday at least 7 days away, and each following week defaults to the
   next Sunday (+7 days). Each week's start is the day after the previous week's
   deadline (shown read-only). The number of Spielwochen = the most rounds any
   group in the season needs (the largest group); smaller groups have no match
   in the final week(s), odd groups carry a bye.
4. Staff push deadlines later to dodge holidays / big offline tournaments.
   **Pushing a week's deadline later shifts every later week by the same delta**
   (a one-week break cleanly pushes the rest of the season back). Deadlines must
   stay in ascending order.
5. Staff **confirm** — a type-to-confirm gate: they type **"Spielplan
   erstellen"** (the action, via the shared `TypeToConfirm` field from the
   finalize rework), acknowledging it starts the regular season and cannot be
   undone. On confirm the single round-robin is generated per sub-division and
   the Spieltag calendar is stored. Confirming *is* the commit — **terminal and
   irreversible**: the season advances, no regeneration, no going back.
6. The season enters its **regular-season** phase ("reguläre Saison läuft").
   The running-season dashboard is the **next feature**; this slice ends at a
   placeholder for it.

## Resolved decisions (feature planning)

1. **Single round-robin.** Each pair plays once.
2. **Natural per-group length, shared calendar.** Groups run only as many
   Spieltage as their size needs (even group → `n − 1`, odd → `n`, the extra
   round carrying byes). All groups share one season-wide Spieltag calendar, so
   "Spieltag N" is the same week everywhere; smaller groups idle in the final
   week(s).
3. **Spielwochen are date ranges with editable deadlines.** Spielwoche 1 starts
   on creation; each week's editable end-date is its deadline (defaults to
   Sundays — the first at least 7 days out, then +7 each). Pushing one deadline
   later cascade-shifts all later weeks; starts are derived (previous deadline
   + 1 day). Stored per Spieltag.
4. **Confirm generates; terminal and one-shot.** No draft/lock cycle and no
   regeneration: generation is available only while the seeding is finalized and
   no schedule exists, and confirming irreversibly advances the season to the
   regular-season phase. (A correction would mean re-seeding, itself terminal —
   out of scope.)
5. **Regular-season phase is derived.** A schedule existing (matchdays present
   for the window) *is* the regular season running — no status column, matching
   how registration state is derived from the window + time.
6. **No Discord post** in this slice (consistent with the seeding).

## Structure

`Finalized seeding → season-wide Spieltag calendar (dates) + per sub-division a
single round-robin → matches`. A match is one player vs. another on one
Spieltag; an odd group produces one bye per Spieltag (each player byes once).

## Schema

Two new tables, server-only, RLS-no-policies like the other staff tables.

- `matchdays` — the season-wide Spieltag calendar the dialog edits.
  `id`, `window_id` FK (cascade), `round` int (1-based Spieltag),
  `starts_on` date, `ends_on` date (the deadline). Unique `(window_id, round)`.
- `matches` — `id`, `sub_division_id` FK (cascade), `round` int,
  `player_a_id` uuid FK, `player_b_id` uuid FK **null** (null = bye for player A
  that round), `created_at`. A match's date = the `matchdays` row for its
  window + `round`. Result columns are out of scope (they arrive with reporting).

Custom migration: FKs into `auth.users` for both players; the `sub_divisions`
and `registration_windows` cascades; `enable row level security` with no
policies.

There is **no** `schedules` table and no `finalized_at`/`published_at` — the
schedule has no publish state; its existence is the regular-season signal.

## Domain logic (pure, exhaustively unit-tested — correctness is load-bearing)

`src/features/schedule/`
- `round-robin.ts` — `generateRoundRobin<T>(players)`: the circle method,
  returning rounds of `{ a, b }` pairings with `b: T | null` for a bye.
  Deterministic on input order (players passed in seeding order). `roundCount(n)`
  (`n − 1` even, `n` odd, `0` for `n ≤ 1`).
  - Tests: `n = 0, 1, 2, 3, 4, 5, 7, 8`; **every pair meets exactly once**; each
    player byes **exactly once** for odd `n`, **never** for even; correct round
    count; determinism.
- `spieltage.ts` — the calendar maths, all pure:
  - `matchdayName(round)` → "Spieltag {round}".
  - `spieltagCount(groupSizes: number[])` → `max(roundCount(size))` (the number
    of Spielwochen; `0` if no groups).
  - `nextSundayAtLeast(from, minDays = 7)` → the first Sunday at least `minDays`
    away from `from`.
  - `defaultSpieltagWindows(seasonStart, count)` → `{ start, end }[]`: week 1
    starts at `seasonStart` and ends on `nextSundayAtLeast(seasonStart, 7)`; each
    later week ends 7 days after the previous and starts the day after the
    previous deadline.
  - `shiftDeadlineFrom(windows, index, newEnd)` → sets that week's deadline and
    moves every later week by the same delta, recomputing derived starts
    (whole-day arithmetic).
  - `spieltagDeadlinesSchema` (Zod): a non-empty strictly-ascending deadline
    list, each after its week's start.
  - Tests: naming; count from mixed group sizes; `nextSundayAtLeast` across every
    weekday incl. exactly-7-away and a Sunday start; default windows; the
    cascade-shift (first vs. middle week); ascending validation.

## Season phase (derived)

`src/features/staff/` gains a `seasonPhase(window, seeding, hasSchedule, now)`
composing the existing `registrationState` with the seeding-finalized and
schedule-exists booleans:
`not_started → registration_open → registration_closed → seeded (finalized) →
regular_season`. The staff Saison card shows the phase label; the staff page
uses it to choose which action buttons to render. No status column.

## Actions & queries

`src/features/schedule/actions.ts` — staff-gated, re-checking the precondition.
- `createSchedule({ deadlines })` — gate (staff, window closed, seeding
  finalized, **no schedule yet**); load the finalized group sizes; derive the
  Spielwoche windows from the season start (now) + the submitted deadlines and
  validate (ascending, length = `spieltagCount`); generate the round-robin per
  sub-division; insert matchdays + matches. **Rejects if a schedule already
  exists** (season already running). Revalidate.

`src/features/schedule/queries.ts` —
- `finalizedGroupSizes(windowId)` (player counts per sub-division, for the
  Spieltag count + defaults) and `hasSchedule(windowId)`.
- `persistSchedule(windowId, spieltagWindows, matchesBySubDivision)` in one
  transaction (insert the matchdays + matches; no delete — generation is
  one-shot).

## Views

- **Staff hub (`/staff`)** — the seeding-finalized section (from the finalize
  rework) gains **"Spielplan erstellen"**. The button opens the client dialog;
  its Spieltag count + default deadlines are computed server-side from the
  finalized seeding and passed in. Once a schedule exists the "Spielplan
  erstellen" button is gone and the Saison card reads "reguläre Saison läuft".
- **Regular-season variant of `/staff`** — no separate route. Once a schedule
  exists, the staff hub itself grows a "Reguläre Saison" section: a placeholder
  ("Dashboard mit Spielplan, Ergebnissen und Tabellen folgt") for the next
  feature (the running-season dashboard).

Components stay dumb; all logic is in the pure modules and actions.

## Access & dev tooling

- Staff-gated throughout; server actions re-check role + precondition.
- Dev tooling: extend `src/features/dev/seed.ts` with a helper that fully seeds
  **and finalizes** a seeding (place every player into groups, set
  `finalized_at`) so the "Spielplan erstellen" flow has valid input. The gallery
  (`src/features/dev/components/gallery.tsx`) gets the Spieltag-dates dialog as a
  state. No new persona shapes needed.

## Tests

- **Unit:** `round-robin.ts` and `spieltage.ts` (both exhaustive, per above) —
  the load-bearing correctness surface — plus `seasonPhase`.
- **Integration** (real local Postgres): `createSchedule` persists the correct
  match count per group (`C(n,2)`) and the correct Spieltag calendar; a second
  `createSchedule` is rejected once a schedule exists; the gate rejects when the
  seeding is not finalized; window/sub-division cascade removes matchdays +
  matches.
- **Manual/browser:** the full staff flow on a finalized, dev-seeded season,
  including a mid-season week extension and the resulting shift.

## Scope

**In:** the "Spielplan erstellen" dialog (editable weekly Spieltag dates with
cascade-shift); single round-robin generation per sub-division; persistence of
the calendar + matches; the derived regular-season phase; the `/staff/season`
placeholder; dev tooling; the pure algorithms + their tests.

**Out (own later features):**
- **Running-season dashboard** — the real running-season view on `/staff`
  (fixtures, progress, per-match ops) replacing the placeholder; the immediate
  next feature.
- **Match reporting / results**, then **standings** (which unblocks the
  relegation-aware seed proposal).
- **Player-facing schedule view**, **per-match postponement** beyond the
  season-wide week shift, **double round-robin**, and a **Discord announcement**.

## Open questions

None open.
