# Implementation Plan: Formen in den Pokémon-Statistiken zusammenfassen

**Date**: 2026-10-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-pokemon-forme-groups/spec.md`

## Summary

Formes that play the same count as one Pokémon entry in the stats: a hand-kept list (Vivillon,
Florges, Furfrou and Alcremie with all their variants; Sinistcha-Masterpiece, Maushold-Four,
Polteageist-Antique) plus every battle-only forme the dex marks (Palafin-Hero, Aegislash-Blade, ...),
never a Mega. The rule is applied once, where a stored sheet becomes slots (`toSlots`), so the
rankings, win rates, teammates and carriers all inherit it. The Pokémon detail gains a panel
"Formen" with the formes as written; links to a former forme entry redirect to the grouped one.
No schema change, no query change, no Discord.

## Technical Context

**Stack**: Next.js App Router + TypeScript, Supabase (Postgres, Auth, Storage), Drizzle ORM, Zod,
Tailwind CSS + shadcn/ui. New dependencies: none.

**Testing**: Vitest unit tests (domain logic), Vitest integration tests against the local Supabase
stack. No E2E.

**Target**: Cloud Run container; desktop and phone browsers, light and dark mode.

**Affected areas**:
- `src/features/pokemon-stats/formes.ts` (new): `FORME_GROUPS`, `countedSpecies`.
- `src/features/pokemon-stats/sheets.ts`: `toSlots` applies `countedSpecies` to non-Mega slots;
  `Slot.writtenSpecies`; `groupedEntryId` (here rather than in formes.ts, because it needs
  `megaLabel` and formes.ts is imported by sheets.ts, which would make a cycle).
- `src/features/pokemon-stats/details.ts`: `PokemonDetail.formes`.
- `src/features/pokemon-stats/components/pokemon-detail.tsx`: panel "Formen".
- `src/app/statistiken/[kategorie]/[id]/page.tsx`: redirect for former forme ids.
- `src/features/pokemon-stats/fixtures.ts`: sheet helpers for formes, if the existing ones do not
  cover them.
- `src/features/dev/components/gallery.tsx` (+ `src/features/dev/pokemon-stats-fixture.ts`): one
  example of the "Formen" panel.

**Reused building blocks**: `resolveMega`, `megaLabel`, `toId` (Mega resolution and ids, 001
R5); `tally`, `DistRow` (details); `Panel`, `DistList`, `pokemonIcon` (detail anatomy); the
query-string copy of `src/app/statistiken/page.tsx` (redirect); `@pkmn/dex` `battleOnly` /
`changesFrom` (R2).

**Legacy context read**: `specs/001-pokemon-usage-stats/` (spec, research R5, data model,
routes contract, approved mockups), `docs/plans/teamsheet-pastes.md` (sheets are stored as
written, dex is display-only there), `src/features/teamsheets/mega.ts` (Mega detection).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.* Checked against 1.1.0.

| Principle | Status | How |
|-----------|--------|-----|
| I. Pure, server-side domain logic | Pass | `countedSpecies`, `groupedEntryId` and the breakdown are pure functions; the view only renders `detail.formes`. |
| II. Tests carry the weight | Pass | Unit tests over every invariant in `data-model.md` (list integrity against the dex, every listed and battle-only forme, every FR-003 forme, Megas, breakdown, redirect ids). No query changes, so the existing integration test stays as it is. No E2E, no snapshots. |
| III. Boring tools, smallest mechanism | Pass | One record in a pure module; no table, no config, no dependency. |
| IV. Schema is code | Pass | No schema change. |
| V. Look and UX | Pass | Mockup approved 2026-10-17; the panel reuses `Panel`/`DistList`; no explanatory copy; gallery example added; appearance on a filter change is a page load, not a relayout. |
| VI. League voice, German time | Pass | One German label ("Formen"); forme names are game data as Showdown writes them (exempt). No clocks. |
| VII. Spoiler protection and embargo | Pass | Counted sheets unchanged (`countedSheets`, public embargo for every viewer); grouping only relabels slots. |
| Architecture constraints | Pass | Server Component pages only; the dex stays server-side (`formes.ts` is imported by server code only, like `sheets.ts`). |

Post-design re-check: unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/002-pokemon-forme-groups/
├── spec.md
├── mockups/pokemon-detail.html   # approved 2026-10-17
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/routes.md
├── checklists/requirements.md
└── tasks.md                      # /speckit-tasks
```

### Source Code (repository root)

```text
src/features/pokemon-stats/
├── formes.ts / formes.test.ts       # list, countedSpecies; list vs dex
├── sheets.ts / sheets.test.ts       # toSlots: grouping for non-Mega slots, Slot.writtenSpecies; groupedEntryId
├── rankings.test.ts                 # grouped counts and win rates (mirror Maushold vs Maushold-Four)
├── details.ts / details.test.ts     # PokemonDetail.formes; teammates and carriers grouped
└── components/pokemon-detail.tsx    # panel "Formen" at the top of the right column
src/app/statistiken/[kategorie]/[id]/page.tsx   # 307 to the grouped id, query kept
src/features/dev/pokemon-stats-fixture.ts        # gallery rows for the panel
src/features/dev/components/gallery.tsx          # gallery example
```

## Schema & Migrations

None.

## Authorization & Visibility

Unchanged from 001: public read-only pages, the same numbers for every viewer, embargoed matches
excluded for everyone. Grouping changes labels of counted slots, never which sheets count.

## Discord Touchpoints

None.

## Routes, Navigation & Staff Integration

- `contracts/routes.md`: redirect from a former forme id to the grouped id (FR-008).
- No navigation change, no staff page, no stream API change (FR-009; the stream API builds on the
  team sheets, not on the stats).

## Documentation Impact

- `CLAUDE.md`: the "Pokémon-Statistiken" paragraph adds that formes that play the same count as
  one entry (hand-kept list in `pokemon-stats/formes.ts`, battle-only formes by the dex) and points
  at `specs/002-pokemon-forme-groups/` beside 001.
- `specs/001-pokemon-usage-stats/spec.md`: backlink note at its top, `> Abgelöst in Teilen durch
  specs/002-pokemon-forme-groups (Formen).`
- `design/DESIGN.md`: no change (no new anatomy).
- Constitution: no amendment.

## Complexity Tracking

None.
