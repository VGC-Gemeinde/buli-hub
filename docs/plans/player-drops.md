# Player drops

**Status: done** (2026-07-06) — drop flag on placements, `effectiveResult`
override wired into the shared result projections (`groupResults`,
`subDivisionResults`, `windowMatchOverview`), match-page banner + report
guard, MotW exclusion + pick removal, Discord drop rule, staff Drops section
with type-to-confirm dialog and un-drop. Verified via unit/integration tests
and a seeded season with a dropped player (tables, row scores, match page,
staff list, MotW picker).

## Context

Staff need to drop a player mid-season (inactivity, rule violation, own
request). Every match of a dropped player **counts** as a 2:0 free win for
the opponent — including already-played ones. History is preserved: stored
results, games, replays and teamsheets are never touched; a drop is a flag
on the player's placement, and the *counting* is overridden at read time.
That makes a drop fully reversible (**un-drop** restores everything), at the
price of drop-awareness in every result consumer — enumerated below, each a
call site of one pure, exhaustively tested override.

## Scope

**In:**
- **Drop / un-drop** (staff+): flag on `placements`
  (`dropped_at`, `dropped_by_id`, `drop_reason`), set via a type-to-confirm
  dialog, cleared via an un-drop action.
- **Counting override** (pure `effectiveResult`): a match involving one
  dropped player counts as a confirmed 2:0 free win for the opponent —
  played or not, past or future rounds. Both dropped → double loss. Byes
  untouched. Applied in every standings/score projection (see "Consumers").
- **Standings**: dropped players stay in the table with a small "Drop"
  marker; their matches count as 0:2 losses. Post-season zones follow the
  standings automatically.
- **Match page**: a banner for everyone — „{Name} wurde gedroppt — das Match
  zählt als Freewin (2:0) für {Gegner}" (or „… als Doppelniederlage") — above
  the stored content, which stays fully visible as history (played result,
  replays, teamsheets). Unreported drop-decided matches show the banner
  instead of the open/report state.
- **Action guards**: players cannot report a drop-decided match. Staff result
  powers stay available (history corrections); the counting override wins
  regardless.
- **MotW**: matches with a dropped participant cannot be selected (action
  rejects, picker hides them); dropping a player removes an existing current/
  next-round pick that features them (incl. its VOD announcement, if any).
- **Discord**: no messages for drop free wins. Existing posts of played
  matches stay as historical records; `shouldPostResult` gains a
  `hasDroppedParticipant` input returning "none", so no post is ever created
  for a drop-decided match (e.g. after a MotW pick is removed) and any later
  touch of such a match clears its post instead of reposting.

**Out (deferred):**
- Pre-season withdrawal (that is registration removal, a different feature).
- Automatic re-seeding / roster refills after a drop.
- Notifying the dropped player or opponents (Discord/DM).

## Data — three columns on `placements`

```
dropped_at     timestamptz null   -- null = active
dropped_by_id  uuid null          -- FK → auth.users (set null) in custom migration
drop_reason    text null
```

Migrations: generated + custom (`player_drops`, `player_drops_fk_rls` — only
the FK; RLS on placements exists).

## Feature folder — `src/features/drops/`

**Pure logic (`drops.ts`, unit-tested):**
- `effectiveResult({ playerAId, playerBId, result, droppedIds })` — the
  counting override: none dropped → unchanged; one dropped → confirmed
  free win for the other (no games; standings count it 2:0 like any free
  win); both dropped → double loss; bye → unchanged. Works for reported
  *and* unreported matches (an open match against a dropped player is
  decided).
- `dropOutcomeLabel(...)` — the match-page banner copy.

**Queries (`queries.ts`, integration-tested):** `setDropped` /
`clearDropped` (placement update), `droppedIdsForWindow(windowId)` →
`Set<string>`, `listDrops(windowId)` (name, group, reason, date — the staff
list).

**Actions (`actions.ts`, staff+ gate, type-to-confirm happens in the UI):**
- `dropPlayer({ userId, reason })` — placement must exist and be active;
  sets the flag; removes a current/next MotW pick featuring the player
  (`deleteMotw` + `syncMotwVodPost`); revalidates `/`, `/spieler`, `/staff`,
  match pages.
- `undropPlayer({ userId })` — clears the flag; matches simply count (and
  display) normally again.

## Consumers of the override (the completeness-critical list)

Each assembles view models from stored results and now maps them through
`effectiveResult` first:

1. `groupResults` → `computeStandings` / `divisionStandings` (public tables,
   Spieler-Dashboard tables, post-season zones).
2. `subDivisionResults` (overview match rows, Spieler-Dashboard schedule) —
   drop-decided matches render as reported 2:0 free wins; the normal spoiler
   rules apply unchanged.
3. `windowMatchOverview` (staff dashboard) — drop-decided matches are done:
   never overdue, never "open this week", pending free wins of dropped
   players disappear from the confirm list.
4. Match page — shows *stored* state deliberately (history) plus the drop
   banner; report form blocked.
5. Discord `shouldPostResult` — "none" for drop-decided matches (see above).
6. MotW `selectMotw` — rejects matches with dropped participants; the staff
   picker filters them out.

`StandingsRow` gains `dropped: boolean` (from roster + dropped set);
`StandingsTable` renders the marker.

## Views

- **Staff dashboard**: a "Drops" section — list of dropped players (name,
  group, reason, date, „Drop aufheben") and a „Spieler droppen" dialog:
  player select (placed, active players with group label), required reason
  (staff-internal), `TypeToConfirm` on the player's name.
- **Public/player tables**: small "Drop" tag on the row.
- **Match page**: the drop banner (all viewers).
- **MotW manager**: drop-decided matches excluded from the picker lists.

## Dev tooling

- Seed: drop one mid-table player in the running season (with reason), so
  tables, rows, match pages and the staff list all show the state.
- Gallery: standings row with drop marker, match-page drop banner, the drop
  dialog, staff drops list.

## Tests

- Unit: `effectiveResult` (unreported/reported × winner/loser dropped ×
  both dropped × bye × nobody), standings integration of the override
  (dropped player's row all 0:2, opponents credited), `shouldPostResult`
  with `hasDroppedParticipant`.
- Integration: `setDropped`/`clearDropped` round-trip, `droppedIdsForWindow`,
  `listDrops` shape.
- Manual: seeded season — drop a player with played + open matches; verify
  tables, row scores, match-page banner + intact replays, staff dashboard
  buckets, MotW picker exclusion and pick removal; un-drop and verify
  everything returns.

## Delivery

Branch `feat/player-drops`, squash-merged to main as one commit.
