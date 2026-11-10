---

description: "Task list for the standings table on a phone"
---

# Tasks: Standings table on a phone

**Input**: Design documents from `/specs/006-standings-phone-layout/`

**Prerequisites**: plan.md, spec.md, research.md

**Tests**: No domain logic is added (layout only), so no new unit or integration tests; the
constitution forbids styling tests (Principle II). The full suite must stay green and the feature
is verified in the running app (quickstart.md).

**Note**: The implementation was built before this spec, during the mockup iteration
(2026-11-09); the implementation tasks below record it and are checked off after verification.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

None: no folder, dependency or schema change.

## Phase 2: Foundational

None.

---

## Phase 3: User Story 1 - The whole table fits a phone (Priority: P1) 🎯 MVP

**Goal**: Below `sm` the table is exactly as wide as its container; every value whole.

**Independent Test**: At 390px on `/` and `/spieler` the table does not scroll sideways and all
five columns show whole values.

- [x] T001 [US1] In `src/features/season/components/standings-panel.tsx`, drop the table's minimum width below `sm` (`sm:min-w-[400px]`) and give it a fixed layout with fixed widths for Platz (38px), Game-WR. (66px), Diff. (44px) and Bilanz (60px) below `sm`; keep dense mode's fixed desktop widths behind `sm:` (research R1)
- [x] T002 [US1] Same file: below `sm`, make the Platz and Spieler header and body cells `relative` with `left: 0` instead of sticky (research R3), and tighten paddings of the number cells; column heads 10.5px with 0.02em tracking
- [x] T003 [US1] Same file: keep the desktop weighting on the phone (Bilanz semibold foreground, Diff. regular, Game-WR. muted at 13px)

---

## Phase 4: User Story 2 - Names stay readable, badges stay out of the numbers (Priority: P1)

**Goal**: Name on the first line with the cell's full width, badges on a second line that clips.

**Independent Test**: At 390px a division row with group, Drop and Du shows the badges under the
name and none reaches a number column.

- [x] T004 [US2] In `src/features/season/components/standings-panel.tsx`, restructure the identity cell: avatar plus a column of name line (favourite star + `PlayerLink`) and badge line (group, Drop, Ersatz, Du); the badge line `overflow-hidden`, rendered only when a badge exists (research R4)
- [x] T005 [US2] Same file: avatar 22px below `sm` via `PlayerAvatar`'s `size`; badges without vertical padding below `sm`; Du stays a badge (spec UX decisions)

---

## Phase 5: User Story 3 - Desktop is unchanged (Priority: P2)

**Goal**: From `sm` up the table renders as before.

**Independent Test**: At 1280px badges inline, avatar 26px, widths and sticky columns as before.

- [x] T006 [US3] In `src/features/season/components/standings-panel.tsx`, make the identity column a row again from `sm` up (`sm:flex-row`, badge group `sm:shrink-0`) and leave every other desktop class unchanged

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T007 [P] Point the `StandingsTable` comment in `src/features/season/components/standings-panel.tsx` at this spec
- [x] T008 [P] `design/DESIGN.md` §8.9: columns and phone anatomy described, pointing at this spec
- [x] T009 [P] Backlink note at the top of `docs/plans/standings-tiebreakers.md` (its column list with Punkte and the narrow-screen scrolling are superseded)
- [x] T010 Running-app check per quickstart.md: `/` and `/spieler` at 390px light and dark, and at 1280px (done 2026-11-09: 340px table in 340px container, no scroll, badges under the name; desktop unchanged)
- [x] T011 Biome, typecheck and full test suite green (suite 1657/1657 locally on 2026-11-09 with this code; CI runs it again on push)

---

## Dependencies & Execution Order

- T001 to T006 touch one file and were done together.
- T007 to T009 are independent documentation edits.
- T010 and T011 close the feature after all others.
