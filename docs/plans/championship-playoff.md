# Championship playoff (Division 1)

**Status: done** (2026-07-04) — pure logic + full suite green (337 tests);
`/dev/ui` verified (champion CSS + Meister-Playoff legend render).

A post-season title playoff for **Division 1** only: the top N qualify for a
tournament that decides the real Bundesliga champion. Like the promotion/demotion
playoffs, the **tournament itself is out of scope** — we only mark the qualifying
slots and tint the zone. Integrates with [[post-season-setup]]; no change to the
balance invariant or finalize gating beyond the new count.

## Concept

- New per-division count `championshipPlayoffSlots`. Meaningful **only on the top
  tier** (Division 1) — validation rejects it elsewhere. No direct champion; the
  bracket decides.
- Interpreted like every other count via the division's relevant table: top N *per
  group* in Gruppentabelle mode, top N *of the division* in Gesamttabelle mode.
- New zone `champion` (gold), sitting at the very top of the table — above where
  promotion would be (the top division can't promote, so that space is free). It
  counts toward capacity (champion + demotion zones must fit).
- No balance constraint — the title playoff is terminal, exchanges with no
  division.

## Scope

**In:** schema column, pure `assignZones`/`validatePostSeason` support, the staff
dialog's top-division "Meister-Playoff" cluster + preview band, the player table
zone + legend, dev-seed coverage on Division 1.

**Out:** the tournament (bracket, results, crowning the champion).

## Schema

`championship_playoff_slots` integer `not null default 0` on `divisions`
(per-feature migration).

## Affected code

- `src/db/schema.ts` — new column.
- `src/features/seeding/post-season.ts` — `Zone` gains `champion`;
  `DivisionForValidation`/config gain `championshipPlayoffSlots`; `assignZones`
  gains an optional `champion` band at the top; `validatePostSeason` counts it in
  the capacity span and flags `championship_not_top` when a non-top division sets
  it.
- `src/features/seeding/seeding.ts` — Zod `postSeasonDivisionSchema` gains the count.
- `src/features/seeding/queries.ts` — `divisionsWithGroupSizes`, `divisionPostSeason`,
  `savePostSeasonConfig` carry the column.
- `src/features/seeding/components/post-season-dialog.tsx` — the top division's
  (disabled) promotion clusters are replaced by a single gold "Meister-Playoff"
  cluster; the preview strip and validation include the champion band.
- `src/features/season/components/standings-panel.tsx` — `champion` zone tint/rail +
  legend entry ("Meister-Playoff").
- `src/app/spieler/page.tsx` — pass `championshipPlayoffSlots` into `assignZones`.
- `src/app/globals.css` + `design/globals.css` — `--zone-champion` (gold) + utility.
- `src/features/dev/seed.ts` — give Division 1 a championship playoff in the seeded
  configs so the zone is exercised.

## Test cases (pure)

- `assignZones`: a champion band occupies the top places, above promotion.
- `validatePostSeason`: championship allowed on the top tier; flagged on a
  non-top tier; counted toward capacity (over-capacity with champion + demotion).
