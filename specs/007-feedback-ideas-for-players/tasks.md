---

description: "Task list for feedback ideas for players"
---

# Tasks: Feedback ideas for players

**Input**: Design documents from `/specs/007-feedback-ideas-for-players/`

**Prerequisites**: plan.md, spec.md

**Tests**: The removed rule's unit tests are removed with it; the action's integration test now
covers a player's idea. No E2E tests.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

None.

## Phase 2: Foundational

None.

---

## Phase 3: User Story 1 - A player submits an idea (Priority: P1) 🎯 MVP

**Goal**: Every signed-in user sees the switch and may submit an idea.

**Independent Test**: As the player persona, open the dialog from the user menu and the footer,
choose "Idee", submit; a stored idea report with the role Spieler exists.

- [x] T001 [US1] In `src/features/feedback/actions.integration.test.ts`, replace "refuses an idea from a player" with "accepts an idea from a player": stored as `idea` with `reporterRole` player, thread name starts with "[Idee] "
- [x] T002 [US1] Remove `canSubmit` from `src/features/feedback/feedback.ts` and its tests from `src/features/feedback/feedback.test.ts`
- [x] T003 [US1] Remove the role check from `submitFeedback` in `src/features/feedback/actions.ts`; sign-in gate and rate limit stay
- [x] T004 [US1] Remove `canSubmitIdea` from `FeedbackPanel` (`src/features/feedback/components/feedback-panel.tsx`, switch always rendered) and `FeedbackDialog` (`src/features/feedback/components/feedback-dialog.tsx`, one description line)
- [x] T005 [US1] Entry points: `src/features/feedback/components/feedback-footer-link.tsx` and `src/components/site-footer.tsx` without the role; `src/features/auth/components/user-menu.tsx` without `isStaff`, `src/components/site-header.tsx` no longer passes it

---

## Phase 4: User Story 2 - Staff are not affected (Priority: P2)

**Goal**: Staff, admins and devs keep the dialog they had.

**Independent Test**: The existing "accepts an idea from staff" integration test stays green; as
the staff persona the dialog is unchanged.

- [x] T006 [US2] Keep `actions.integration.test.ts` "accepts an idea from staff" unchanged and green

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T007 [P] `/dev/ui` gallery (`src/features/dev/components/gallery.tsx`): one form specimen "Fehler oder Idee (alle Angemeldeten)" instead of the player and staff variants; the other specimens without the prop
- [x] T008 [P] `.design-sync/previews/FeedbackPanel.tsx` without the prop
- [x] T009 Biome, typecheck, full test suite green
- [x] T010 `CLAUDE.md`: add the map paragraph "Feedback" pointing at this spec
- [x] T011 `docs/plans/feedback.md`: backlink note at the top

The view itself is the staff variant that has been in production since the feedback intake
shipped; it was not re-verified by eye for this change beyond the build on staging.

## Dependencies & Execution Order

T001 first (fails until T003), then T002 to T005 together (the prop removal does not typecheck
half-done), then Phase 5.
