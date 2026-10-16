# Implementation Plan: Pokémon usage stats of the running season

**Date**: 2026-10-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-pokemon-usage-stats/spec.md`

## Summary

Public "Statistiken" in the Liga row: four rankings (Pokémon, Items, Fähigkeiten, Attacken) of the
current season's team sheets with usage, match win rate and match count, sortable and filterable
(phase, division, week, minimum usage, per-category filters), each entry opening a detail. One
window-wide read loads every sheet of the season outside the public embargo; everything else is
pure TypeScript over those sheets, computed per request. No schema change, no Discord, no stream
API change.

## Technical Context

**Stack**: Next.js App Router + TypeScript, Supabase (Postgres, Auth, Storage), Drizzle ORM, Zod,
Tailwind CSS + shadcn/ui. New dependencies: `@pkmn/mods@0.10.11` (Champions move data for the move
card, same family and version as the pinned `@pkmn/dex`, server-only; research R6). **Needs the
maintainer's approval at Gate 2.** Copied assets, not a dependency: 18 type icon SVGs from
`partywhale/pokemon-type-icons` (MIT, R8).

**Testing**: Vitest unit tests (domain logic), Vitest integration tests against the local Supabase
stack. No E2E.

**Target**: Cloud Run container; desktop and phone browsers, light and dark mode.

**Affected areas**:
- `src/features/pokemon-stats/` (new): queries, pure counting, filters, details, move card, views.
- `src/features/navigation/sections.ts`: Liga row entry "Statistiken".
- `src/components/info-label.tsx` (new shared primitive, R9).
- `src/app/globals.css`: `--type-*` palette tokens.
- `public/type-icons/`: 18 SVGs plus `LICENSE`.
- `src/features/dev/components/gallery.tsx`: new visual states.

**Reused building blocks**: `publicEmbargoedIds`, `motwForWindow`, `holdsForWindow` (embargo);
`droppedIdsForWindow`, `decidedByDrop` (drops); `parseTeamsheet`, `resolveMega`,
`canonicalSpecies`, `iconFor`, `spriteFor`, `itemSpriteFor` (team sheets); `allMatchdaysForWindow`,
`weekNames`, `germanToday` (weeks); `currentSeason` (window); `SiteHeader`, `SectionHeader`,
`Tick`, `EmptyStateCard`, `BackLink`, `FilterChip` pattern, the standings table's sticky columns
and the scope segment (`standings-panel.tsx`), `hoverRow` (DESIGN.md §8).

**Legacy context read**: `docs/plans/teamsheet-pastes.md` (sheet rules, dex as cosmetics),
`docs/plans/standings-embargo.md` and `src/features/spoilers/embargo.ts` (tables drop embargoed
matches), `docs/plans/relegation-and-playoffs.md` (stages, weeks, tiebreaker rounds),
`docs/plans/player-replacement.md` (replacement placements), `docs/plans/site-navigation.md` and
`design/NAVIGATION.md` (Liga row, detail pages), `design/DESIGN.md` §8.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.* Checked against 1.1.0.

| Principle | Status | How |
|-----------|--------|-----|
| I. Pure, server-side domain logic | Pass | One query (`countedSheets`); counting, filtering, sorting, details are pure functions; views display. |
| II. Tests carry the weight | Pass | Unit tests exhaustive over every rule in `data-model.md` invariants; one integration test for `countedSheets` (embargo, drops, stages, divisions). No E2E, no snapshots. |
| III. Boring tools, smallest mechanism | Pass with approval | No table, no cache, no new abstraction beyond the feature. One new dependency (`@pkmn/mods`) needs approval (Complexity Tracking). |
| IV. Schema is code | Pass | No schema change. |
| V. Look and UX | Pass | Mockups approved 2026-10-16; DESIGN.md tokens; new type palette and `InfoLabel` go into DESIGN.md §8 and `/dev/ui`; no explanation of game knowledge; reserved slots for conditional controls. |
| VI. League voice, German time | Pass | German labels; English game data exempt (1.1.0); weeks "started" via `germanToday()`; number format `de-DE`. |
| VII. Spoiler protection and embargo | Pass | `publicEmbargoedIds` drops embargoed matches for every viewer (FR-002); win rates openly like the standings, an accepted leak recorded in the spec (FR-019). |
| Architecture constraints | Pass | Server Components, no route handlers, no Server Actions (read-only); `@pkmn/*` never in a client bundle. |

Post-design re-check: unchanged; the design added no table, route handler or client-side data.

## Project Structure

### Documentation (this feature)

```text
specs/001-pokemon-usage-stats/
├── spec.md
├── mockups/            # approved 2026-10-16
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── routes.md
│   └── stats-functions.md
└── tasks.md            # /speckit-tasks
```

### Source Code (repository root)

```text
src/features/pokemon-stats/
├── queries.ts                       # countedSheets, statsWeeks, seasonTiers
├── queries.integration.test.ts      # embargo, drops, stages, divisions, weeks, disputes
├── load.ts                          # current season + URL → filtered sheets (page entry point)
├── sheets.ts / sheets.test.ts       # ots → slots (parse, Mega, counted ability, own stone)
├── filter.ts / filter.test.ts       # StatsFilter, weeks offered, phase begun, URL params, hrefs
├── rankings.ts / rankings.test.ts   # four rankings, shares, ranks, win rates, entry filters, sort
├── details.ts / details.test.ts     # Pokémon detail, entry detail, team share, family
├── format.ts / format.test.ts       # shares and win rates in de-DE, "<0,1 %"
├── move-card.ts / move-card.test.ts # Champions BP/ACC/shortDesc, overrides (server only)
├── view.ts                          # icons and sprites, server only (dex, sprite tables)
├── labels.ts                        # category labels and kinds, dex-free (usable in client code)
├── fixtures.ts                      # test helpers (sheets from specs)
├── pkmn-mods.d.ts                   # untyped module for @pkmn/mods/champions (its exports carry no types)
└── components/
    ├── stats-shell.tsx              # container, title, category switch, filter row, empty states
    ├── stats-filters.tsx            # client: phase segment, selects, reserved reset
    ├── ranking-view.tsx             # ranking body: basis line, per-category slot, table, "Alle N"
    ├── ranking-table.tsx            # sortable, pinned columns, sideways scroll on a phone
    ├── detail-parts.tsx             # kicker, facts, panels, distribution lists
    ├── pokemon-detail.tsx
    ├── entry-detail.tsx
    ├── move-card-view.tsx
    └── stats-icon.tsx               # Pokémon, item, type, "Kein Item", unknown; Mega pill; TypeIcon
src/components/info-label.tsx        # short label + tooltip (hover, focus, tap), InfoTooltip
src/app/statistiken/page.tsx                     # redirect to /statistiken/pokemon
src/app/statistiken/[kategorie]/page.tsx         # ranking
src/app/statistiken/[kategorie]/[id]/page.tsx    # detail
src/features/dev/pokemon-stats-fixture.ts        # /dev/ui gallery states
public/type-icons/*.svg + LICENSE
```

## Schema & Migrations

None.

## Authorization & Visibility

Read-only public pages, no actions. Every viewer, signed in or not, staff or not, sees the same
numbers: embargoed matches are excluded for everyone (no staff preview, unlike match rows, since
an aggregate cannot hide a row from some viewers; `embargo.ts` "Aggregates"). Win rates are open,
independent of the spoiler switch (FR-019, accepted leak). Signed-out visitors get the page
without the header navigation, as every public page today.

## Discord Touchpoints

None.

## Routes, Navigation & Staff Integration

- Routes and URL state: `contracts/routes.md`.
- Liga row: "Statistiken" after "Favoriten" (`sectionRow`, test updated). The row exists only in
  phase `regular_season`, which lasts until the next window opens (completion does not change the
  phase), so the entry is there for the whole season. Outside it the page shows its empty state
  (FR between seasons, spec Clarifications).
- The entry stays marked on detail pages (`activeHref` prefix rule, R11); details carry
  "← Zurück". Spec UX decision adjusted accordingly.
- No staff page, no staff todo, no stream API change.

## Documentation Impact

- `CLAUDE.md`: new map paragraph "Pokémon-Statistiken" (`src/features/pokemon-stats/`, pages at
  `/statistiken`), pointing at `specs/001-pokemon-usage-stats/`, distinct from "Usage statistics".
- `design/DESIGN.md` §8: type palette tokens, `InfoLabel`, the sortable ranking table (sticky
  rank and sprite, sideways scroll on a phone, reserved filter slot).
- Legacy backlinks: none superseded; `docs/plans/teamsheet-pastes.md` stays true (the dex now also
  shapes stats counts, which this spec records).
- Constitution: amended to 1.1.0 on 2026-10-16 for this feature (reasoning in research R12).
- Spec updates from planning: detail pages keep the row entry marked; Nachsaison weeks use the
  hub's names ("Woche N"); tiebreakers sit in "Woche 1" under the regular season.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New dependency `@pkmn/mods@0.10.11` | The move card shows base power and accuracy; Champions changes them for many moves and `@pkmn/dex` has no Champions data (R6) | A hand-kept map of Showdown's Champions values: a second copy of game data to sync at every patch; gen 9 values: wrong numbers on a card that exists to show numbers |
