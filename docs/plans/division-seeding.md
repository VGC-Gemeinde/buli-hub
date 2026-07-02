# Division seeding

**Status: in progress** — slices 1 (config & schema) and 2 (placement) done;
3 (sub-division generation) and 4 (publish) remain.

Once a season's registration is closed, staff divide the registered players into
divisions (skill tiers) and sub-divisions (round-robin groups), then publish.
Assisted throughout: the system proposes, staff adjust and confirm. One of the
largest staff tasks — planned as several slices.

## Structure

`Season → Divisions (N, staff-configured) → Sub-divisions (round-robin groups)
→ players`. A sub-division is the group that plays each other, one match per
week; its size sets the season length.

## Workflow (target end state)

1. Precondition: the season's registration window is **closed**.
2. Staff set the **number of divisions** and one **sub-division size** (a
   target cap, uniform for the season).
3. Staff place players into divisions — **assisted**:
   - Returning players are proposed by their last known season **including
     promotion/relegation**; each proposal carries **caveat flags**
     (self-reported vs. system-confirmed, stale participation, …).
   - Players that can't be proposed (new players) are listed separately,
     **ordered by self-report skill score**.
   - Everything editable; staff confirm.
4. Per division, **generate sub-divisions**: split into `ceil(n / size)` groups,
   players spread **as evenly as possible** (sizes differ by ≤ 1 — 20 ÷ 8 →
   7/7/6), **soft-preferring same-platform grouping**. Suggestion only; staff
   move players between sub-divisions by hand.
5. **Publish** — type-to-confirm destructive gate; the seeding becomes final.

## Hard dependency: promotion/relegation needs recorded standings

The relegation-aware proposal (step 3) requires each player's **actual final
standing from a recorded prior season**. The system has never recorded a season
result — there is no standings/results concept yet, and the only prior-season
data we hold is the unreliable self-reported free text from registration.

Therefore:
- The **first** season has no recorded predecessor: the proposal can only lean
  on self-reported history (caveat-flagged) and self-ratings; staff place
  everyone. Real promotion/relegation is impossible until a season has been
  recorded.
- The **relegation-aware auto-seed is a later slice**, gated on a future
  "season standings" feature.

## Slicing

- **1 — Config & schema (done).** `seedings` + `divisions` + `sub_divisions` +
  `placements`; the seeding page shell, division-count + size config,
  staff-only gate, draft state.
- **2 — Division placement (done).** Assign players to divisions via controls
  (below), players ordered returning-first then new by self-rating, caveat
  flags on self-reported history.
- **3 — Sub-division generation.** The pure even-distribution + soft-platform
  algorithm, generate-per-division, manual moves between sub-divisions.
- **4 — Publish.** Type-to-confirm gate; sets `published_at`.
- **Later (own features):** season standings/results; the relegation-aware
  proposal built on them; the public division view.

## Schema (slice 1)

Anchored to the closed `registration_windows` row (the season proxy). A
dedicated `seasons` table is **deferred**: seeding does not need it (the window
identifies the season, and "prior season" is the previous window by date), and
introducing it properly means re-anchoring the registration and staff features
— its own slice, cheap to add later since there is no production data.

- `seedings` — `window_id` PK/FK, `sub_division_size` int, `published_at`
  timestamptz null.
- `divisions` — `id`, `window_id` FK, `tier` int (1 = top; ordering + name
  „Division {tier}"), unique `(window_id, tier)`.
- `sub_divisions` — `id`, `division_id` FK (cascade), `position` int
  (0-based → letter; name „Division {tier}{a,b,c,…}", e.g. „Division 1a").
- `placements` — `id`, `window_id`, `user_id` FK, `division_id` FK null,
  `sub_division_id` FK null, unique `(window_id, user_id)`. A player is first
  placed in a division (sub_division null), then into a sub-division.

Custom migration: FKs into `auth.users`, cascades, `enable row level security`
with no policies (server-only, like the other staff tables).

## Domain logic (pure, exhaustively unit-tested — correctness is load-bearing)

`src/features/seeding/`
- `seeding.ts` — division/sub-division naming + the config Zod schema.
- `placement.ts` — `seedingCaveats(player)` (self-reported flag today;
  detected/stale flags arrive with standings) and `orderForPlacement(players)`
  (returning-first, then new by self-rating desc, stable).
- `generate-sub-divisions.ts` *(slice 3)* — `generateSubDivisions(players,
  size)`: `ceil(n/size)` groups, balanced to ≤1 difference, greedily keeping
  platforms together without violating balance. Tests: n=0, n<size, exact
  multiples, remainders (20/8→7/7/6), single platform, fully mixed, platform
  counts that can't be cleanly grouped.

## Interaction

**Control-based** assignment (no drag-and-drop dependency): each player row has
a division picker; within a division, a sub-division picker to move between
groups. Deliberately simple — "just works" — with a design pass to upgrade it
later. Keeps the stack boring and avoids the mobile pitfalls we just hit.

## Access & dev tooling

- `/staff/seeding` (or a Staff-Bereich section), staff+ via `currentUser` /
  `roleAtLeast`; server actions re-check the role. Only when registration is
  closed.
- Dev tooling: personas + a helper to seed a closed window with N registered
  players across platforms/ratings; gallery renders the division board and the
  sub-division groups.

## Tests

- Unit: the three pure modules above (the algorithm exhaustively).
- Integration: config upsert; placement upsert/move; sub-division generation
  persisted; publish sets `published_at`; window-cascade cleans up.
- Manual/browser: full staff flow on a seeded closed window; publish gate.

## Resolved decisions

1. **Season anchor** — window-anchored; a `seasons` table is deferred to its
   own slice (see Schema).
2. **Interaction** — control-based, no drag-and-drop dependency.
3. **Naming** — auto for both levels: „Division {tier}" and „Division
   {tier}{letter}".
4. **Publish** — terminal; no re-seed.
