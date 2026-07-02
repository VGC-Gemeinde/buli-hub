# Numeric registration history + auto-initialized seeding

Status: done

Follow-up to `division-seeding.md`. Makes the self-reported previous division and
placement **numbers**, and uses them to initialize the seeding automatically the
first time staff open it after registration closes — no manual division setup.

## Scope

In:

- `registrations.prevDivision` / `prevPlacement`: `text` → `integer` (nullable).
- Registration form: those two veteran fields become number inputs; Zod coerces
  to positive integers. `prevSeason` / `prevName` stay free text.
- Pure domain functions (tested): derive the suggested division count and the
  auto-placements from the registered players.
- Lazy auto-init: on the first open of `/staff/seeding` in the `closed` state,
  when no divisions exist yet, create the divisions and place returning players
  into their previous division. Runs via a server action fired once on mount —
  never during the page render (pages stay read-only).
- Guard the generate actions so they give a clear error when no group size is set
  yet (now possible, since divisions can exist before a size is chosen).

Out (unchanged / deferred):

- **Placement / relegation.** `prevPlacement` is stored but not used for any
  logic — returning players go into the *same* division they were in. No
  promotion/relegation until the standings feature exists.
- New players: no auto-placement (no prior data) — placed manually as today.
- Cloud Scheduler. "On close" is approximated by first-open lazy init; a true
  timed trigger waits for the deferred scheduler.
- Seasons table (still window-anchored).

## Schema change

`schema.ts`: `prevDivision` / `prevPlacement` → `integer(...)`, still nullable.

Migration (`drizzle-kit generate`, then hand-edit the `ALTER COLUMN ... SET DATA
TYPE integer` to add `USING NULLIF(btrim(prev_division), '')::integer` so it is
safe on any data). Prod is empty; local is disposable (`supabase db reset`).

## Domain logic (pure, unit-tested) — `placement.ts`

- `SeedingPlayer.prevDivision` / `prevPlacement`: `number | null`.
- `suggestedDivisionCount(players)`: the largest `prevDivision` among players
  (returning players are the only ones with a value); `0` if none.
- `autoDivisionPlacements(players, divisionCount)`: `{ userId, tier }[]` for every
  returning player whose `prevDivision` is within `1..divisionCount`. Ignores
  `prevPlacement`.

Tests: no returning players → count 0, no placements; mixed set → max; players
with `prevDivision` above the count are skipped; new players never placed.

## Registration (`registration.ts`, form, action, queries)

- `veteranHistorySchema`: `prevDivision` = `z.coerce.number().int().min(1)
  .max(MAX_DIVISIONS)`, `prevPlacement` = `z.coerce.number().int().min(1)`.
  German messages consistent with the existing ones.
- `registration-form.tsx`: `VETERAN_FIELDS` carries a per-field input `type`;
  Division/Platzierung render `type="number"` (state stays string, Zod coerces).
- `createRegistration` / `NewRegistration`: veteran fields flow through as numbers
  (type change only).

## Seeding init (the #1 flow)

- New query `createDivisions(windowId, count)` — inserts tiers `1..count` (the
  create half of `saveSeedingConfig`, without touching the `seedings` row, so no
  group size is invented).
- New action `initializeSeeding()`:
  - gate: staff + closed + not published (`editableWindow`);
  - if divisions already exist → `{ ok: true, initialized: false }` (idempotent);
  - `count = suggestedDivisionCount(players)`; if `< 1` → `initialized: false`;
  - create the divisions, map tier → id, bulk-assign returning players via
    `assignPlayersToDivision` grouped by tier;
  - `{ ok: true, initialized: true }`.
- `seeding-workspace.tsx`: a `useEffect` fires once (ref-guarded) when
  `!published && divisions.length === 0`; on `initialized: true`, `router.refresh()`.
- `generateGroups` / `generateAllGroups`: return
  `"Bitte zuerst eine Gruppengröße festlegen"` when `getSeeding` is null, instead
  of silently no-op'ing (divisions can now precede a size).

## Display / dev-tooling propagation

- `sheet-rows.tsx`: `Division {prevDivision} · {prevPlacement}. Platz` — numbers
  render unchanged.
- `registration-confirmation.tsx`: props `number | null`; `String(...)` for the
  `Row` value.
- `gallery.tsx`, `seed.ts` (+ `SeedRegistration`), test builders: switch string
  literals to numbers.

## Tests to update / add

- Add `placement.test.ts` cases for the two new pure functions.
- Update numeric literals in: `registration.test.ts`,
  `queries.integration.test.ts`, `seed.test.ts`, `sheet.test.ts`, gallery/seed
  builders.

## Verify

`biome`, `tsc`, `npm test -- --run`; then in the running app: reset + reseed,
open `/staff/seeding` after close and confirm divisions appear pre-created with
returning players placed, new players unplaced, all still editable.
