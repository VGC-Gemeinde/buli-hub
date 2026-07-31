# Post-season setup

**Status: done** (2026-07-04) — pure logic + full suite green (333 tests); staff
config UI, finalize gating, and player-facing zones verified in the browser on
a seeded season. The config lives in the seeding page's „Auf- & Abstieg" view
(see `seeding-step-bar.md`).

A new sub-step of the Divisionseinteilung: per division, staff configure how many
players are promoted and demoted, how many extra promotion/demotion **playoff
slots** exist, and which standings table decides it. The standings tables then
tint the promotion / demotion / playoff zones so players see their post-season
picture during the season. The playoff tournament itself is **out of scope** —
we only mark the slots.

This step comes **before finalize**: the seeding can only be finalized once a
post-season config has been explicitly **saved and is valid**, so staff can discover
(e.g.) that a division does not meet the equal-size requirement for a global table
and rebalance groups first. Finalizing without going through the step is not
possible — an untouched default does not count.

## Concepts

- **Relevant table** (per division): `sub_division` (default) or `division`.
  - `sub_division`: promotion/demotion is decided **per group**; the configured
    counts are **per group** and apply uniformly to every group in the division
    (regardless of group size — see open questions for the unequal-size caveat).
  - `division`: promotion/demotion is decided by the **global division table**;
    the configured counts are **per division** (totals). Only selectable when every
    group in the division has the same roster size (the [[division-table]]
    equal-size rule). Opt-in — never automatic.
- **Guaranteed promotions / demotions** (per division): fixed movement.
- **Playoff slots** (per division): promotion-playoff and demotion-playoff slots —
  players who *may* move pending a later tournament. Same per-mode interpretation
  as the guaranteed counts (per group in `sub_division` mode, per division in
  `division` mode).
- **Effective total** of a division in a direction:
  `division` mode → the configured count; `sub_division` mode → count × group count.
- **Zones** a row can fall into, top to bottom: `promote`, `promotion_playoff`,
  `demotion_playoff`, `demote`, or `none`.

## Balance invariant

Adjacent divisions must balance on **guaranteed** movement (playoff slots need
**not** balance):

- For tiers `t` and `t+1` (1 = top): `effectiveDemotions(t) == effectivePromotions(t+1)`.
- Top tier (1) has `guaranteedPromotions = 0` and `promotionPlayoffSlots = 0`.
- Bottom tier has `guaranteedDemotions = 0` and `demotionPlayoffSlots = 0`.
- Per group/division, `promotions + promotionPlayoff + demotionPlayoff + demotions`
  must not exceed the group size (`sub_division`) or the division size (`division`).
- Every division must offer a **promotion path** and a **demotion path** — a path
  being either a guaranteed spot or at least one playoff slot in that direction:
  - promotion path required (`guaranteedPromotions ≥ 1` **or** `promotionPlayoffSlots
    ≥ 1`) for every division **except the top** (tier 1 can't promote).
  - demotion path required (`guaranteedDemotions ≥ 1` **or** `demotionPlayoffSlots
    ≥ 1`) for every division **except the lowest** (can't demote).
  So a division may have 0 guaranteed promotions as long as it has a promotion
  playoff slot, and likewise for demotion.

## Division-table visibility (change to shipped [[division-table]] behavior)

Today the division tab shows for **every** equal-size division. That changes:

- A division in `division` mode → its players see the **division table by default**,
  with the switcher still offering their own group. The division table carries the
  zone tints.
- A division in `sub_division` mode → players see **only their sub-division table**
  (no division tab), with the zone tints on that table.

So equal group size no longer drives the player-facing tab; it only gates whether
staff may *opt* a division into `division` mode. Exactly one table per player
carries zones: the division's relevant table.

## Scope

**In:**

- Schema: per-division post-season columns.
- Pure logic: balance/capacity validation; zone assignment for a standings list.
- Staff config sub-step in the seeding flow + save action; finalize gated on a valid
  config.
- Zone tinting in `StandingsTable`; relevant-table-driven default view in
  `StandingsPanel`; `/spieler` wiring.
- Tests, dev-seed coverage (some divisions in `division` mode), `/dev/ui` states.

**Out:**

- The promotion/demotion **playoff tournament** (bracket, results, applying the
  extra movements). We store slot counts and render them; nothing plays out.
- Actually **executing** promotion/demotion between seasons (moving players to new
  divisions next season).
- Genuine-tie resolution at a zone boundary (still deferred; see
  [[standings-tiebreakers]] and [[standings-head-to-head]] — head-to-head resolves
  many of these in group mode, but not in `division` mode, where it is off).

## Schema

New `relevant_table` enum (`sub_division` | `division`) and columns on `divisions`
(all `not null`, sensible defaults):

- `relevant_table` — default `sub_division`
- `guaranteed_promotions` — int, default 0
- `guaranteed_demotions` — int, default 0
- `promotion_playoff_slots` — int, default 0
- `demotion_playoff_slots` — int, default 0

Columns live on `divisions` (1:1, no new table). `saveSeedingConfig` recreates
division rows when the division count changes, so config resets for
added/removed tiers — acceptable and expected.

A `post_season_configured_at` (nullable timestamp) is added to `seedings`, set when
staff save the post-season step. It is the "the step was completed" signal that
gates finalize, and distinguishes a deliberate all-zero config from untouched
defaults. It is cleared whenever the seeding config changes (division count /
group regeneration) or the post-season config is edited into an invalid state, so a
stale confirmation can't slip through. Migration authored per-feature via
`drizzle-kit generate`.

## Affected code

- `src/db/schema.ts` — enum + columns.
- `src/features/seeding/post-season.ts` (new, pure):
  - `effectiveMovement(config, groupCount)` → `{ promotions, demotions }` totals.
  - `validatePostSeason(divisions)` → structured errors: adjacency imbalance,
    over-capacity, `division` mode without equal groups, non-zero at top/bottom
    boundary.
  - `assignZones({ rowCount, promotions, promotionPlayoff, demotionPlayoff,
    demotions })` → `Zone[]` by position (ties don't split a zone; boundary handling
    documented).
- `src/features/seeding/queries.ts` + `actions.ts` — `savePostSeasonConfig` (writes
  the per-division columns + stamps `post_season_configured_at` when valid), load
  configs for a window (with per-division group sizes / equal-size flag), clear
  `post_season_configured_at` on seeding-config changes, and extend finalize
  readiness to require `post_season_configured_at` set **and** the config valid.
- `src/features/seeding/components/*` — a post-season config panel/step: per-division
  rows (promotions, demotions, playoff slots, relevant-table toggle with the global
  option disabled + hinted when groups are unequal), live balance feedback. Finalize
  disabled until valid.
- `src/features/reporting/standings.ts` or the new `post-season.ts` — `Zone` type.
- `src/features/season/components/standings-panel.tsx` /
  `player-avatar.tsx`-adjacent `StandingsTable` — accept `zones` (per-userId) and tint
  rows; `StandingsPanel` takes the relevant table + default view.
- `src/app/spieler/page.tsx` — load the player's division config; in `division` mode
  compute `divisionStandings` + division zones and default to it; in `sub_division`
  mode compute sub-division zones and pass no division table.
- `src/features/staff/season-phase.ts` — no new phase required; the sub-step lives
  inside seeding and gates finalize. (Revisit only if a standalone phase is wanted.)
- `src/features/dev/seed.ts`, `personas.ts`, `components/gallery.tsx` — seed a couple
  of `division`-mode divisions with balanced counts; gallery states for each zone and
  for both table modes.

## Zone colors (functional build, pre-designer)

On-brand tints pending a design pass: `promote` green, `demote` destructive/red,
`promotion_playoff` / `demotion_playoff` amber, plus a small legend. View-only;
refined later.

## Test cases (pure)

`validatePostSeason`:

- balanced chain across 3 tiers in `sub_division` mode (counts × group counts match).
- imbalance flagged when `demotions(t) ≠ promotions(t+1)`.
- adjacent divisions with different group counts: `sub_division` totals still balance
  when `perGroup × groupCount` matches; flagged when they can't.
- `division` mode total balances against a `sub_division` neighbor's total.
- `division` mode rejected when the division's groups are unequal size.
- over-capacity (zones exceed group/division size) flagged.
- non-zero promotions at top tier / demotions at bottom tier flagged.
- a middle division with 0 guaranteed promotions but ≥1 promotion playoff slot is
  valid (path via playoff); likewise for demotion.
- a middle division with neither a guaranteed spot nor a playoff slot in a direction
  is rejected (no path). Top needs no promotion path; lowest needs no demotion path.

`assignZones`:

- promote / playoff / demote bands assigned top-to-bottom by position.
- gap band in the middle is `none`.
- zero counts → all `none`.
- bands that meet with no gap (e.g. promotion-playoff directly above
  demotion-playoff) partition cleanly.

## Open questions

- **Unequal group sizes in `sub_division` mode:** per-group counts stay uniform for
  now (per decision); revisit if a smaller trailing group should move fewer.

## Resolved

- **Finalize requires an explicitly saved, valid post-season config** — tracked via
  `post_season_configured_at`. Validity requires every division to offer a
  promotion/demotion path (guaranteed spot or playoff slot) in each applicable
  direction (top exempt from promotion, lowest from demotion), so a no-op config
  fails validation.
- **Sub-division tab in `division` mode:** keep the switcher, default to the division
  table.
- **Zone colors:** green (promote) / red (demote) / amber (playoff) for the
  functional build; refined in a later design pass.
