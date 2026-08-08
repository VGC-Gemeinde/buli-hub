# Staff running-season dashboard

**Status: done** (2026-07-03) — `/staff/saison` monitoring + free-win
confirmation + staff match powers. Verified end to end via a staff persona on a
seeded running season. Disputes remain the next feature.

## Context

During the regular season staff need to chase results and adjudicate. `/staff`
only shows a "Reguläre Saison" placeholder, and player-reported **free wins sit
pending with no way to confirm them** (so they never count). This feature adds
the staff running-season dashboard — the home for the powers deferred by the
reporting feature — as its own page under the Staff-Bereich.

Rudimentary-but-intentional design; a hand-off + design pass come later.

## Scope

**In:**
- **Monitoring** at `/staff/saison` (staff+, regular season only): matches
  **overdue** (past matchday, still unreported), **unreported this week**
  (current matchday) with a filter to show **all** of this week, and **free
  wins awaiting confirmation** — with top-line counts.
- **Free-win confirmation**: any staff member confirms a pending free win
  (`confirmed_by`/`confirmed_at`), so it starts counting.
- **Staff match powers** on `/match/[matchId]` (role-gated panel): open **any**
  match (not just as a participant), **award** a free win or **double loss**,
  and **reopen** (clear) a result so it can be re-reported. Awards by staff are
  confirmed immediately and, when overwriting, record `corrected_by`. Staff do
  **not** enter normal game-by-game results — only players report those.

**Out (deferred):**
- **Disputes** — the "open disputes" section of the original ask needs the
  disputes feature; left as its own next feature with a placeholder here.
- Fine-grained score correction: staff **reopen → player re-reports** instead of
  editing games.

## Data (no schema change — `confirmed_*`/`corrected_*`/`double_loss` exist)

New window-wide queries in `src/features/reporting/queries.ts`:
- `windowMatchOverview(windowId)` — every match with group name (tier/position),
  both identities, matchday `endsOn`, and result state (outcome, winnerId,
  confirmedAt) or null. Feeds the dashboard.
- `confirmFreeWin(matchId, staffId)` — set `confirmed_by`/`confirmed_at`.
- `upsertStaffResult(matchId, fields)` — award/correct: upsert `match_results`
  (set `corrected_by` when a result already existed, else `reported_by` = staff)
  and clear any `match_games` (awards have no games).
- `deleteMatchResult(matchId)` — reopen.

## Pure logic — `src/features/reporting/staff-dashboard.ts` (unit-tested)

`bucketMatches({ matches, currentRound, today })` → `{ overdue, thisWeek,
pendingFreeWins }` using the existing `matchDisplayState`. `thisWeek` carries
every current-round match (the "all this week" filter shows them; the default
shows only the unreported ones). Counts derive from the buckets.

## Actions — `src/features/reporting/staff-actions.ts` ("use server")

Staff+ gate (role re-check) on each:
- `confirmFreeWin(matchId)`.
- `awardFreeWin({ matchId, winnerId, reason })` — winner must be a participant.
- `awardDoubleLoss({ matchId })`.
- `reopenMatch(matchId)`.
`{ ok } | { ok:false, error }`, `revalidatePath` the dashboard + match screen.

## Views

- **`/staff/saison`** (`src/app/staff/saison/page.tsx`): staff gate + regular
  season; counts, then the three sections; each match row links to
  `/match/[matchId]`; pending-free-win rows carry an inline "Bestätigen". A
  muted "Disputes — folgt" placeholder.
- **`/staff` link**: the "Reguläre Saison" placeholder becomes a button to the
  dashboard.
- **`/match/[matchId]`**: allow staff+ to open any match; render a
  `StaffMatchPanel` (client) below the content — state-aware actions (confirm
  pending free win, award free win via a winner+reason dialog, award double
  loss, reopen). Non-participant non-staff still redirect.

## Dev tooling

- Extend the running-season seed to leave the picture worth looking at: some
  **overdue** (unreported past) matches and at least one **pending free win**.
- Gallery: the dashboard worklist and the staff panel.

## Tests

- Unit: `bucketMatches` (overdue vs current-unreported vs pending free win vs
  reported/upcoming; "all this week" set).
- Integration: `confirmFreeWin` sets the timestamps; `awardFreeWin`/`awardDoubleLoss`
  upsert + set corrected_by on overwrite + clear games; `reopenMatch` deletes;
  `windowMatchOverview` shape.
- Manual: seed a running season; confirm a pending free win; award a double
  loss; reopen a reported match; verify the standings/dashboard update.

## Delivery

Branch `feat/staff-season-dashboard`, squash-merged to main.
