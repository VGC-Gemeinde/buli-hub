---

description: "Task list for the Pokémon usage stats of the running season"
---

# Tasks: Pokémon usage stats of the running season

**Input**: Design documents from `/specs/001-pokemon-usage-stats/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required by the constitution (Principle II): unit tests for every piece of domain logic, integration tests against the local Supabase stack for RLS, constraints and multi-step flows. No E2E tests.

**Organization**: Tasks are grouped by user story. Phase order follows the spec's priorities with one deliberate swap: User Story 6 (win rates, P2) comes right after the P1 stories, because the win-rate column belongs to the ranking table every later story reuses.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1 to US6)

## Path Conventions

- Feature code: `src/features/pokemon-stats/` (logic, components, colocated `*.test.ts`)
- Routes: `src/app/statistiken/...` (thin wrappers); no schema change
- Shared code: `src/components/info-label.tsx`; `/dev` tooling in `src/features/dev/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Folder, dependency, assets, tokens

- [X] T001 Create the feature folder src/features/pokemon-stats/ with components/ (name chosen to stay distinct from src/features/usage/, spec Assumptions)
- [X] T002 [P] Add `@pkmn/mods@0.10.11` pinned exactly via `npm install @pkmn/mods@0.10.11` (only once the maintainer approved it at Gate 2, plan Complexity Tracking); confirm package.json has no range and package-lock.json is updated
- [X] T003 [P] Copy the 18 type icon SVGs of partywhale/pokemon-type-icons at commit `fcbe697` to public/type-icons/<type>.svg (lowercase type names) with the repo's MIT LICENSE as public/type-icons/LICENSE (research R8)
- [X] T004 [P] Add the type palette to src/app/globals.css: `--type-normal` … `--type-fairy` with the SVG circle colors (normal #828282, fire #e4613e, water #3a9de2, grass #439837, electric #dfbc28, ice #47c8c8, fighting #e49021, poison #9354cb, ground #a4733c, flying #74aad0, psychic #e96c8c, bug #9f9f28, rock #a9a481, ghost #6f4570, dragon #576fbc, dark #4f4747, steel #77b2cb, fairy #e18ce1), same in both modes, plus `@theme inline` entries

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The one read and the slot model every view needs

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 [P] Unit tests for `toSlots(ots)` in src/features/pokemon-stats/sheets.test.ts: six slots from a stored sheet; base with own stone → Mega entry (`entryId` = toId of the Mega forme, `name` = base name, `mega` "Mega"/"Mega X"/"Mega Y"/"Mega Z"); both writings of a Mega give the same slot; stone on a foreign Pokémon → base entry, `ownStone` false; `ability` = `megaAbility ?? sheetAbility` (FR-027), including a Mega whose ability the dex does not know; no item → `item` null; regional formes stay separate; unknown species passes through; unparsable text → null
- [X] T006 [P] Unit tests for filters in src/features/pokemon-stats/filter.test.ts: `filterSheets` by phase (regular+tiebreaker vs relegation+playoff), tier, round and their combinations, a sheet without tier counting only without a division filter; `postSeasonBegun` (first non-regular matchday `startsOn <= today`); `weekOptions` (only started weeks, names from `weekNames`, per phase; "Woche 1" offered under the regular season only when it holds tiebreakers); `parseStatsParams` (every parameter of contracts/routes.md, invalid values fall back to defaults, `phase` ignored before the Nachsaison, `woche` dropped when not in the phase); `statsHref` omits defaults and keeps `phase`/`division`/`woche` across views
- [X] T007 [P] Unit tests for `formatShare` in src/features/pokemon-stats/format.test.ts: de-DE one decimal with narrow no-break space ("41,3 %"), "<0,1 %" for a share above 0 that rounds to 0,0 (FR-029), "—" for no win rate
- [X] T008 Implement `toSlots` in src/features/pokemon-stats/sheets.ts on `parseTeamsheet`, `resolveMega`, `canonicalSpecies` (src/features/teamsheets/), research R5
- [X] T009 [P] Implement src/features/pokemon-stats/filter.ts (`filterSheets`, `postSeasonBegun`, `weekOptions`, Zod `parseStatsParams`, `statsHref`) per contracts/routes.md and research R4, using `germanToday()` semantics (today passed in)
- [X] T010 [P] Implement `formatShare` / win-rate formatting in src/features/pokemon-stats/format.ts
- [X] T011 Integration test for `countedSheets(windowId)` in src/features/pokemon-stats/queries.integration.test.ts against the local stack: sheets of every stage are returned with `phase`, `round`, `tier`; a MotW match without VOD and a recording-held match are absent, a MotW with VOD and a released hold present (FR-002); a drop-decided regular match is present with `result` null (R2); a relegation sheet carries its own player's tier; a replacement's sheet carries the replacement's tier; a tiebreaker carries the round of the first non-regular week; a sheet of a match with an open dispute is returned as stored
- [X] T012 Implement `countedSheets(windowId)` in src/features/pokemon-stats/queries.ts: one select of `team_sheets` ⋈ `matches` (window) ⋈ `match_results`, batch `placements` ⋈ `divisions` for tiers, `publicEmbargoedIds({ motw: motwForWindow, holds: holdsForWindow })`, `droppedIdsForWindow` + `decidedByDrop` for regular matches; map each row through `toSlots`, skip and `console.warn` an unparsable sheet (research R1 to R3)

**Checkpoint**: Counted sheets load correctly for any season state

---

## Phase 3: User Story 1 - Pokémon ranking (Priority: P1) 🎯 MVP

**Goal**: The Pokémon ranking with usage, Megas as own entries, ties, empty state, embargo respected

**Independent Test**: With reported sheets, `/statistiken/pokemon` lists exactly the Pokémon and Megas of the counted sheets, shares adding up to 600 %

### Tests for User Story 1 ⚠️

- [X] T013 [P] [US1] Unit tests for `pokemonRanking` in src/features/pokemon-stats/rankings.test.ts: count = sheets containing the entry, share over sheets (FR-003), sum of counts = 6 × sheets; Mega and base separate (FR-004); ties share a rank, alphabetical, deterministic (FR-009); no sheets → empty entries; top-30 cut and `alle`

### Implementation for User Story 1

- [X] T014 [US1] Implement `pokemonRanking` and the shared ranking core (basis, counts, shares, usage ranks, top-30) in src/features/pokemon-stats/rankings.ts
- [X] T015 [P] [US1] Build src/features/pokemon-stats/components/ranking-table.tsx per mockups/rankings.html: real table, sideways scroll inside its card on a phone, rank and sprite pinned (`iconFor`, unknown sprite → dashed placeholder), name with Mega pill, usage bar scaled to the largest shown entry (FR-026) plus share, rows `hoverRow` and linking to the detail
- [X] T016 [P] [US1] Build src/features/pokemon-stats/components/stats-page.tsx: Tick L + "Statistiken", category segmented control (Pokémon · Items · Fähigkeiten · Attacken as links), basis line "N Teams · M Pokémon · <weeks>" with the reserved per-category slot, `EmptyStateCard` "Noch keine Teamsheets" / "Noch kein Ergebnis der Saison gemeldet."
- [X] T017 [US1] Wire src/app/statistiken/page.tsx (redirect to /statistiken/pokemon keeping the query) and src/app/statistiken/[kategorie]/page.tsx (`currentSeason`; no window or phase ≠ regular_season → empty state; 404 for an unknown category; `SiteHeader section="liga"`; 1040px container)
- [X] T018 [US1] Add "Statistiken" after "Favoriten" to the Liga row in src/features/navigation/sections.ts and its test src/features/navigation/sections.test.ts

**Checkpoint**: MVP: the Pokémon ranking works end to end

---

## Phase 4: User Story 2 - Narrow the stats (Priority: P1)

**Goal**: Phase, division and week filters for every view, linkable, reset without relayout

**Independent Test**: Every filter combination gives the ranking over exactly the passing sheets; a copied URL reproduces the view signed out

### Tests for User Story 2 ⚠️

- [X] T019 [P] [US2] Extend src/features/pokemon-stats/rankings.test.ts: rankings over `filterSheets` output (division, week, phase); empty filter result → empty entries; basis line counts follow the filter

### Implementation for User Story 2

- [X] T020 [US2] Build the client component src/features/pokemon-stats/components/stats-filters.tsx per mockups/rankings.html: phase segmented control (only when `postSeasonBegun`), division and week selects (set filter outlined orange), "Filter zurücksetzen" always rendered with `visibility: hidden` until a filter is set (constitution 1.1.0, no relayout); changes replace the URL via `statsHref`
- [X] T021 [US2] Pass parsed filters through src/app/statistiken/[kategorie]/page.tsx, render the "nothing in this selection" EmptyStateCard ("<filter label> · noch kein Match gemeldet." with "Filter zurücksetzen"), and carry filters on every row link

**Checkpoint**: Pokémon ranking fully filterable and linkable

---

## Phase 5: User Story 6 - Win rates (Priority: P2)

**Goal**: Win rate and match count in every ranking row, sorting by every column

**Independent Test**: For every entry and filter, win rate = wins / rated appearances; mirrors count both sides; unrated matches excluded

### Tests for User Story 6 ⚠️

- [X] T022 [P] [US6] Extend src/features/pokemon-stats/rankings.test.ts: wins/rated per entry (FR-017); mirror = one win and one loss; drop-decided and free-win/double-loss matches not rated but counted for usage; no rated match → null win rate; `sortEntries` by name, use, win (ties by matches, then name; null last), matches, both directions, rank stays the usage rank (FR-009, FR-020)

### Implementation for User Story 6

- [X] T023 [US6] Add wins/rated to the ranking core and implement `sortEntries` in src/features/pokemon-stats/rankings.ts
- [X] T024 [P] [US6] Build src/components/info-label.tsx: short label with dotted underline, definition box on hover and focus (CSS `group-hover` / `group-focus-visible`, `tabIndex` for tap), aligned left or right (research R9)
- [X] T025 [US6] Extend ranking-table.tsx: "Siegquote" and "Matches" columns (plain numbers, no color, FR-018), column heads as sort buttons (orange arrow on the active one, `aria-sort`) with the definitions from InfoLabel ("Anteil der Teams, die dieses Pokémon mitgebracht haben." / "Anteil aller mitgebrachten Pokémon, die es tragen." / "Anteil der gewonnenen Matches der Teams, die es mitgebracht haben. Freilose, Doppelniederlagen und Drops zählen nicht." / "Gewertete Matches, auf denen die Siegquote beruht."), `sort` in the URL
- [X] T026 [US6] Add the minimum-usage select ("Jede Nutzung", "Nutzung ab 1 / 2 / 5 / 10 %", FR-021) and the Pokémon Mega filter (Alle · Megas · Ohne Mega, FR-022) in the reserved slot; both hide entries without changing the basis; extend rankings.test.ts for both

**Checkpoint**: Rankings show usage and win rate, sortable and narrowable

---

## Phase 6: User Story 3 - Item, ability and move rankings (Priority: P2)

**Goal**: The other three rankings, with their per-category filters and type icons

**Independent Test**: Every share = carrying slots / slots; item and ability shares sum to 100 % (stones counted), moves to at most 400 %

### Tests for User Story 3 ⚠️

- [X] T027 [P] [US3] Extend src/features/pokemon-stats/rankings.test.ts: `itemRanking` incl. "Kein Item" (`id` "none") and `hideOwnStones` (own-stone holders out by default, foreign holder stays with its own count, share and win rate, ranks over shown counts; off → sums to 100 %, FR-028); `abilityRanking` with Mega abilities (FR-027); `moveRanking` with up to four moves per slot and `hideProtect` (FR-025)
- [X] T028 [P] [US3] Unit tests for `moveCard` in src/features/pokemon-stats/move-card.test.ts: Champions values via `Dex.mod("champions", …)` (Apple Acid 90 BP), the overrides for Meteor Assault and Slash base power, accuracy `true` → "—", unknown move → null

### Implementation for User Story 3

- [X] T029 [US3] Implement `itemRanking`, `abilityRanking`, `moveRanking` in src/features/pokemon-stats/rankings.ts
- [X] T030 [P] [US3] Implement `moveCard` (server only) in src/features/pokemon-stats/move-card.ts with `MOVE_OVERRIDES` (research R6); move type for icons comes from the same lookup
- [X] T031 [P] [US3] Build src/features/pokemon-stats/components/type-icon.tsx (img from public/type-icons/, alt = type name)
- [X] T032 [US3] Extend ranking-table.tsx and stats-page.tsx for the three categories: item icons (`itemSpriteFor`, "Kein Item" glyph), move type icon in the pinned column, abilities pinned by name; "Ohne Mega-Steine" chip (on by default, InfoLabel "Rechnet Mega-Steine heraus, die ihr eigenes Mega trägt. Ein Stein auf einem anderen Pokémon bleibt drin.") and "Ohne Protect" chip in the reserved slot, the slot's height constant across categories

**Checkpoint**: All four rankings complete

---

## Phase 7: User Story 4 - Look into one Pokémon (Priority: P2)

**Goal**: Pokémon detail with items, abilities, natures, moves, teammates, family links

**Independent Test**: Every distribution equals a hand count over the entry's counted sheets

### Tests for User Story 4 ⚠️

- [X] T033 [P] [US4] Unit tests for `pokemonDetail` in src/features/pokemon-stats/details.test.ts: usage and win rate of the entry; item, ability, nature distributions sum to 100 %, moves to at most 400 %; Mega: no item distribution, `megaAbility` fixed plus sheet abilities; teammates as entries (a Mega teammate as its Mega); family (base ↔ Megas with usage); entry absent under the filter → null

### Implementation for User Story 4

- [X] T034 [US4] Implement `pokemonDetail` in src/features/pokemon-stats/details.ts
- [X] T035 [US4] Build src/features/pokemon-stats/components/pokemon-detail.tsx per mockups/pokemon-detail.html: BackLink, sprite (`spriteFor`), kicker "Pokémon · Saison N", name with Mega pill, "Auch gespielt als" links, filters, facts Nutzung/Siegquote with InfoLabels, panels Attacken (type icons), Item (fixed stone for a Mega), Fähigkeit (Mega-Fähigkeit in orange + "Im Teamsheet"), Wesen, Teampartner; "In dieser Auswahl nicht gespielt" empty state
- [X] T036 [US4] Wire src/app/statistiken/[kategorie]/[id]/page.tsx for `pokemon`

**Checkpoint**: Pokémon detail complete

---

## Phase 8: User Story 5 - Who carries an item, ability or move (Priority: P3)

**Goal**: Entry detail with carriers, team share line and the move card

**Independent Test**: The carrier distribution equals a hand count over the slots carrying the entry

### Tests for User Story 5 ⚠️

- [X] T037 [P] [US5] Extend src/features/pokemon-stats/details.test.ts: `entryDetail` for item (a stone lists its Mega and foreign holders, independent of `hideOwnStones`), "Kein Item", ability (Mega abilities), move; carriers sum to 100 %; `teamShare` = sheets with a carrier / sheets; absent → null

### Implementation for User Story 5

- [X] T038 [US5] Implement `entryDetail` in src/features/pokemon-stats/details.ts
- [X] T039 [P] [US5] Build src/features/pokemon-stats/components/move-card.tsx: at most 280px wide, border and fill tinted with `--type-<type>`, type icon, "BP: X ACC: Y%", `shortDesc` with `lang="en"`
- [X] T040 [US5] Build src/features/pokemon-stats/components/entry-detail.tsx per mockups/entry-detail.html (item icon, kicker "<Item|Fähigkeit|Attacke> · Saison N", uppercase name, move card under the name for moves only, facts, "Auf X % der Teams", carrier list headed "Pokémon" linking to Pokémon details) and wire it in src/app/statistiken/[kategorie]/[id]/page.tsx

**Checkpoint**: All user stories functional

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T041 [P] Extend the `/dev/ui` gallery (src/features/dev/components/gallery.tsx): InfoLabel, ranking table (normal, Mega rows, unknown sprite, empty), filters (unset, set with reset visible, Nachsaison begun), move card (several types, unknown move), type icons
- [X] T042 [P] `/dev` personas: no new user-specific data or auth-metadata shapes; confirm and note in the ship check
- [X] T043 [P] Add to design/DESIGN.md §8: type palette tokens, `InfoLabel`, the sortable ranking table anatomy (pinned rank and sprite, sideways scroll on a phone, reserved per-category slot)
- [X] T044 [P] Add the "Pokémon-Statistiken" paragraph to the CLAUDE.md map (src/features/pokemon-stats/, /statistiken, points at specs/001-pokemon-usage-stats/, distinct from "Usage statistics")
- [X] T045 Verify every view in the running app: desktop and phone width, light and dark, against the approved mockups
- [X] T046 Run quickstart.md validation, including the production-shaped performance check (ask the maintainer before the integration tests: they wipe the local database)
- [X] T047 Biome, typecheck, full test suite green
- [X] T048 Remove the Sync Impact Report comment from .specify/memory/constitution.md before the commit; legacy backlinks: none needed (plan Documentation Impact)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none. T002 waits for the dependency approval.
- **Foundational (Phase 2)**: after Setup; blocks every story. T008 before T012; T011 before T012.
- **US1 (Phase 3)**: after Foundational. MVP.
- **US2 (Phase 4)**: after US1 (filters sit on the ranking page).
- **US6 (Phase 5)**: after US1 (columns of the ranking table); independent of US2.
- **US3 (Phase 6)**: after US6 (reuses the table with its columns); T030 needs T002.
- **US4 (Phase 7)**: after Foundational and US1 (links from the ranking); facts need US6's win rate.
- **US5 (Phase 8)**: after US3 (entries to open) and T030 (move card).
- **Polish (Phase 9)**: after all stories.

### Within Each User Story

- Tests first, failing, then implementation
- Pure functions before components, components before route wiring

### Parallel Opportunities

- T002, T003, T004 together
- T005, T006, T007 together; then T009, T010 alongside T008
- T015 and T016 together once T014 is in
- T024 alongside T023; T030 and T031 alongside T029
- T041 to T044 together

---

## Parallel Example: Foundational

```bash
Task: "Unit tests for toSlots in src/features/pokemon-stats/sheets.test.ts"
Task: "Unit tests for filters in src/features/pokemon-stats/filter.test.ts"
Task: "Unit tests for formatShare in src/features/pokemon-stats/format.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Setup, Foundational
2. User Story 1: the Pokémon ranking at /statistiken/pokemon
3. Validate against mockups/rankings.html

### Incremental Delivery

US1 → US2 → US6 → US3 → US4 → US5, each validated in the running app. The feature still ships as
one commit after Gate 3 (constitution, Development Workflow).

---

## Notes

- [P] tasks = different files, no dependencies
- Commits only after the maintainer's approval at Gate 3, as one commit for the whole feature;
  checkpoints are for validating, not committing
- Ask before running the integration tests while the maintainer might be testing by hand

---

## Phase 10: Convergence

- [X] T049 Show each entry's absolute usage count in the ranking row (src/features/pokemon-stats/components/ranking-table.tsx), or, if the maintainer prefers the approved mockup, record the decision so FR-008 matches it, per FR-008 (partial) Resolved: FR-008 now names the rated count; the column reads "Pokémon" for items, abilities and moves.
