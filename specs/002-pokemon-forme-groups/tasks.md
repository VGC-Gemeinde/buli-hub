---

description: "Task list for grouping formes in the Pokémon stats"
---

# Tasks: Formen in den Pokémon-Statistiken zusammenfassen

**Input**: Design documents from `/specs/002-pokemon-forme-groups/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required by the constitution (Principle II): unit tests for every piece of domain logic. No schema or query change, so no new integration test; the existing `queries.integration.test.ts` stays green. No E2E tests.

**Organization**: Tasks are grouped by user story. Stories 1 and 2 share one mechanism (`countedSpecies` applied in `toSlots`), which is the foundational phase; each story then adds its own tests and its part of the rule.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1 to US3)

## Path Conventions

- Feature code: `src/features/pokemon-stats/` (logic, components, colocated `*.test.ts`)
- Routes: `src/app/statistiken/...`; no schema change
- `/dev` tooling in `src/features/dev/`

---

## Phase 1: Setup

**Purpose**: None needed. The feature folder, dependencies and test fixtures exist since 001 (`src/features/pokemon-stats/fixtures.ts`: `exportMon`, `team`, `counted`).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The grouping module and its use in `toSlots`, which every story builds on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T001 Create src/features/pokemon-stats/formes.ts with `FORME_GROUPS: Record<string, readonly string[]>` exactly as in data-model.md (Vivillon: its 19 patterns besides Meadow, including Fancy and Pokeball; Florges: Blue, Orange, White, Yellow; Furfrou: its 9 trims; Alcremie: its 8 creams; Sinistcha: Masterpiece; Maushold: Four; Polteageist: Antique), written as full dex names (`"Vivillon-High Plains"`), with a comment pointing at specs/002-pokemon-forme-groups (FR-002) and stating that a forme not listed stays separate until it is listed
- [X] T002 Implement `countedSpecies(species)` in src/features/pokemon-stats/formes.ts per data-model.md: unknown to the dex → unchanged; `battleOnly` set → `changesFrom` (research R2), then the list; on the list → its base; otherwise the dex name. Callers never pass a Mega (FR-005)
- [X] T003 Implement `groupedEntryId(id)` in src/features/pokemon-stats/sheets.ts (not formes.ts: it needs `megaLabel`, and sheets.ts imports formes.ts): unknown species and Mega formes (`megaLabel` not null) return the id unchanged; otherwise `toId(countedSpecies(dexName))` (research R5)
- [X] T004 Extend `Slot` and `toSlots` in src/features/pokemon-stats/sheets.ts: new field `writtenSpecies` = `resolution.spriteSpecies`; when `megaLabel(resolution.spriteSpecies)` is null, `entryId`, `name` and `sprite` come from `countedSpecies(resolution.spriteSpecies)`; Mega slots unchanged (research R1); update the slot comment to cite specs/002-pokemon-forme-groups

**Checkpoint**: Slots carry grouped entries; the existing 001 tests still pass except where they asserted the old split

---

## Phase 3: User Story 1 - One entry per Pokémon that plays the same (Priority: P1) 🎯 MVP

**Goal**: Listed formes count as their base in every ranking, win rate, teammate list and carrier list.

**Independent Test**: For sheets writing listed formes, every number equals a hand count with each listed forme replaced by its base (spec Story 1).

### Tests for User Story 1 ⚠️

- [X] T005 [P] [US1] Unit tests for the list in src/features/pokemon-stats/formes.test.ts: every listed forme exists in the dex with the listed base as `baseSpecies`; for Vivillon, Florges, Furfrou and Alcremie the list holds every forme the dex has in `otherFormes` and `cosmeticFormes` except Gmax; `countedSpecies` maps each listed forme to its base; every FR-003 forme (Indeedee-F, Basculegion-F, Meowstic-F, Lycanroc-Dusk, Lycanroc-Midnight, Rotom-Wash, Rotom-Heat, Arcanine-Hisui, Ninetales-Alola, Tauros-Paldea-Aqua, Gourgeist-Super, Floette-Eternal) maps to itself; an unknown species passes through
- [X] T006 [P] [US1] Unit tests in src/features/pokemon-stats/sheets.test.ts: "Sinistcha-Masterpiece" gives `entryId` "sinistcha", `name` and `sprite` "Sinistcha", `writtenSpecies` "Sinistcha-Masterpiece"; "Vivillon-Ocean" gives "vivillon"; "Indeedee-F" and "Rotom-Wash" stay separate (replace the 001 assertion "regional formes stay separate" only where needed, keep its regional case); "Meowstic-F-Mega", "Floette-Eternal @ Floettite" and "Charizard @ Charizardite Y" stay their Mega entries with `writtenSpecies` the Mega forme
- [X] T007 [P] [US1] Unit tests in src/features/pokemon-stats/rankings.test.ts: Sinistcha on three sheets and Sinistcha-Masterpiece on one give one entry with count 4 and win rate over all four; a match Maushold vs Maushold-Four is a mirror (one win, one loss for Maushold); the Mega filter `base` keeps grouped entries and `mega` drops them
- [X] T008 [P] [US1] Unit tests in src/features/pokemon-stats/details.test.ts: a teammate written as Polteageist-Antique merges with Polteageist in a Pokémon's teammates; a move carried by Florges-Blue and by Florges counts for one carrier Florges in the move's detail; an item detail likewise

### Implementation for User Story 1

- [X] T009 [US1] Make T005 to T008 pass; no change outside formes.ts and sheets.ts is expected, since rankings and details read `slot.entryId`/`name`/`sprite` (research R1). Fix any 001 test that asserted the old split, citing spec 002 in the test name
- [X] T010 [US1] Redirect former forme ids in src/app/statistiken/[kategorie]/[id]/page.tsx: for the Pokémon category, when `groupedEntryId(id) !== id`, `redirect()` (307) to `/statistiken/pokemon/<grouped id>` keeping the query string the way src/app/statistiken/page.tsx copies it (contracts/routes.md, FR-008)
- [X] T011 [US1] Unit tests for `groupedEntryId` in src/features/pokemon-stats/sheets.test.ts: `sinistchamasterpiece` → `sinistcha`, `vivillonocean` → `vivillon`, `palafinhero` → `palafin`; `charizardmegay`, `meowsticfmega`, `rotomwash`, `indeedeef`, `sinistcha` and an unknown id unchanged

**Checkpoint**: The ranking shows Sinistcha, Maushold, Vivillon once; old links land on the grouped detail

---

## Phase 4: User Story 2 - Battle-only formes count as their Pokémon (Priority: P1)

**Goal**: A directly written battle-only forme counts as the Pokémon it changes from; Megas are untouched.

**Independent Test**: Each battle-only forme counts exactly like the same sheet writing the base (spec Story 2).

### Tests for User Story 2 ⚠️

- [X] T012 [P] [US2] Unit tests in src/features/pokemon-stats/formes.test.ts: `countedSpecies` maps Palafin-Hero → Palafin, Aegislash-Blade → Aegislash, Castform-Sunny/-Rainy/-Snowy → Castform, Mimikyu-Busted → Mimikyu, Morpeko-Hangry → Morpeko, Darmanitan-Galar-Zen → Darmanitan-Galar (keeps the regional forme, research R2)
- [X] T013 [P] [US2] Unit tests in src/features/pokemon-stats/rankings.test.ts: Palafin on two sheets and Palafin-Hero on one give one entry Palafin with count 3; "Charizard-Mega-Y @ Charizardite Y" still counts as Mega Charizard Y (FR-005)

### Implementation for User Story 2

- [X] T014 [US2] Make T012 and T013 pass in src/features/pokemon-stats/formes.ts (battle-only branch of `countedSpecies`)

**Checkpoint**: Palafin counts once; no Mega changed

---

## Phase 5: User Story 3 - See which formes were played (Priority: P2)

**Goal**: The Pokémon detail shows the panel "Formen" with the formes as written, per the approved mockup.

**Independent Test**: For a grouped entry, the panel's rows equal a hand count of `writtenSpecies` over its appearances under the filters (spec Story 3).

### Tests for User Story 3 ⚠️

- [X] T015 [P] [US3] Unit tests for `PokemonDetail.formes` in src/features/pokemon-stats/details.test.ts: Vivillon 6 / Vivillon-Ocean 2 / Vivillon-Elegant 1 / Vivillon-High Plains 1 give four rows sorted by count then name with shares 0.6/0.2/0.1/0.1 and `sprite` the written species; Sinistcha with only base appearances gives `[]`; only Vivillon-Ocean gives one row at share 1; Palafin with one Palafin-Hero lists Palafin-Hero; Incineroar and Mega Charizard Y give `[]`; the shares count only the sheets passed in (filtered)

### Implementation for User Story 3

- [X] T016 [US3] Add `formes: DistRow[]` to `PokemonDetail` in src/features/pokemon-stats/details.ts: `tally` over the entry's appearances by `slot.writtenSpecies` (`{ id: toId(writtenSpecies), name: writtenSpecies, sprite: writtenSpecies }`); `[]` for a Mega entry (`first.mega !== null`) and when every appearance's `writtenSpecies` equals the entry's `name` (research R4)
- [X] T017 [US3] Render the panel in src/features/pokemon-stats/components/pokemon-detail.tsx per mockups/pokemon-detail.html: `Panel title="Formen"` as the first child of the right column (above "Item"), a `DistList` with `pokemonIcon(row.sprite ?? row.name)`, no links, only when `detail.formes.length > 0`

**Checkpoint**: Vivillon's detail shows its patterns; base-only selections show no panel

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T018 [P] Extend the `/dev/ui` gallery: add a "Formen" example (four Vivillon rows with box icons) beside the stats examples in src/features/dev/components/gallery.tsx, its rows in src/features/dev/pokemon-stats-fixture.ts
- [X] T019 Verify in the running app against mockups/pokemon-detail.html with production-shaped data (quickstart.md "In the running app", steps 1 to 8): desktop and phone width, light and dark
- [X] T020 Biome, typecheck, full test suite green (`npx biome check --write .`, `npx tsc --noEmit`, `npm test -- --run`; ask the maintainer before the full run, it wipes the local DB)
- [X] T021 Update the "Pokémon-Statistiken" paragraph in CLAUDE.md: formes that play the same count as one entry (hand-kept list in `pokemon-stats/formes.ts`, battle-only formes by the dex, never Megas), the detail's "Formen" panel, and a pointer to specs/002-pokemon-forme-groups/ beside 001
- [X] T022 Add the backlink note `> Abgelöst in Teilen durch specs/002-pokemon-forme-groups (Formen).` at the top of specs/001-pokemon-usage-stats/spec.md, content untouched

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: T001 → T002 → T003 (same file); T004 depends on T002
- **User Stories (Phase 3 to 5)**: depend on Phase 2
- **Polish (Phase 6)**: depends on all stories

### User Story Dependencies

- **US1 (P1)**: after Phase 2; T010 depends on T003
- **US2 (P1)**: after Phase 2; independent of US1 (its own branch of `countedSpecies`)
- **US3 (P2)**: after Phase 2 (`Slot.writtenSpecies`); independent of US1 and US2, though its Palafin case relies on US2's branch

### Within Each User Story

- Tests first, failing, then the implementation that makes them pass

### Parallel Opportunities

- T005, T006, T007, T008 (US1 tests, different files) together
- T012, T013 (US2 tests) together, and alongside the US1 tests where files differ
- T015 alongside any test task not in details.test.ts
- T018 alongside T021 and T022

---

## Parallel Example: User Story 1

```bash
Task: "Unit tests for the list in src/features/pokemon-stats/formes.test.ts"
Task: "Unit tests in src/features/pokemon-stats/sheets.test.ts"
Task: "Unit tests in src/features/pokemon-stats/rankings.test.ts"
Task: "Unit tests in src/features/pokemon-stats/details.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 2: formes.ts and `toSlots`
2. Phase 3: grouped rankings, teammates, carriers, redirect
3. **STOP and VALIDATE**: the ranking on production-shaped data (SC-001)

### Incremental Delivery

1. US1 → grouped entries
2. US2 → battle-only formes
3. US3 → the "Formen" panel
4. Polish, then `/speckit-converge` and `/speckit-buli-ship`; one commit for the feature after Gate 3

---

## Notes

- [P] tasks = different files, no dependencies
- No commit before Gate 3 (constitution, Collaboration rules)
