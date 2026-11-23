# Implementation Plan: Feedback ideas for players

**Date**: 2026-11-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/007-feedback-ideas-for-players/spec.md`

## Summary

Ideas were limited to staff by one pure function, `canSubmit(role, kind)`, checked in the Server
Action and mirrored in the views as the prop `canSubmitIdea`. The restriction is removed, not
relaxed: the function, the action's check and the prop go, and the dialog always renders the switch
between "Fehler" and "Idee". Every other part of the intake (stored report, forum thread, tag,
rate limit, success state) already handles ideas and stays as it is.

## Technical Context

**Stack**: Next.js App Router + TypeScript, Postgres on Cloud SQL, the hub's own Discord sign-in, Cloud Storage, Drizzle ORM, Zod,
Tailwind CSS + shadcn/ui. New dependencies: none.

**Testing**: Vitest unit tests (domain logic), Vitest integration tests against the local Postgres
stack. No E2E. The unit tests of the removed `canSubmit` go with it; the integration test of the
action that asserted the refusal now asserts that a player's idea is stored as an idea with the
role Spieler and posted with the "[Idee]" title.

**Target**: Cloud Run container; desktop and phone browsers, light and dark mode.

**Affected areas**: `src/features/feedback/` (logic, action, dialog, panel, footer link, tests);
the two entry points that passed the role along (`src/components/site-footer.tsx`,
`src/features/auth/components/user-menu.tsx` with `src/components/site-header.tsx`); the `/dev/ui`
gallery and the design-sync preview of the panel.

**Reused building blocks**: everything in `src/features/feedback/` as built (`submitFeedback`,
`threadTitle`, `threadBody`, `submissionAllowed`, `FeedbackPanel`, `FeedbackActions`).

**Legacy context read**: `docs/plans/feedback.md` (ideas gated to staff, why there is no list
view, where the forum lives), `docs/plans/feedback-attachments.md`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|-----------|-------|--------|
| I. Pure, server-side domain logic | A rule is removed; the action still checks the sign-in and the rate limit server-side. | Pass |
| II. Tests carry the weight | The removed function's tests go; the action's integration test covers a player's idea. Full suite green. | Pass |
| III. Boring tools, smallest mechanism | Deleting the gate and its prop is smaller than keeping a function that always answers yes. No dependency. | Pass |
| IV. Schema is code | No schema change. | Pass |
| V. Look and UX | Mockup approved 2026-11-23; players get the existing staff variant, no new visual state; the gallery loses the variant without the switch. The switch is always present, so nothing relayouts. | Pass |
| VI. League voice and German time | No new copy; the existing description line is now the only one. | Pass |
| VII. Spoiler protection | Not touched: the intake shows no results. | Pass |

Re-check after design: unchanged, all pass.

## Project Structure

### Documentation (this feature)

```text
specs/007-feedback-ideas-for-players/
├── spec.md
├── mockups/feedback-dialog.html
├── plan.md              # this file
├── checklists/requirements.md
└── tasks.md
```

No `research.md` (nothing to decide beyond the spec), no `data-model.md` (no data change), no
`contracts/` and no `quickstart.md` (the check in the running app is listed in tasks.md).

### Source Code (repository root)

```text
src/features/feedback/feedback.ts                          # canSubmit removed
src/features/feedback/feedback.test.ts                     # its tests removed
src/features/feedback/actions.ts                           # role check removed
src/features/feedback/actions.integration.test.ts          # a player's idea is accepted
src/features/feedback/components/feedback-dialog.tsx       # no canSubmitIdea, one description
src/features/feedback/components/feedback-panel.tsx        # switch always rendered
src/features/feedback/components/feedback-footer-link.tsx  # no prop
src/components/site-footer.tsx                             # no role passed
src/features/auth/components/user-menu.tsx                 # isStaff prop removed (only fed the dialog)
src/components/site-header.tsx                             # no longer passes isStaff to UserMenu
src/features/dev/components/gallery.tsx                    # one form specimen instead of player/staff
.design-sync/previews/FeedbackPanel.tsx                    # preview without the prop
CLAUDE.md                                                  # map paragraph "Feedback"
docs/plans/feedback.md                                     # backlink note
```

## Schema & Migrations

None.

## Authorization & Visibility

`submitFeedback` accepts both kinds from every signed-in user and refuses a signed-out caller, as
before. The rate limit (five reports per user per hour, both kinds together) is unchanged and is
the only cap. Nobody gets a list of reports. No embargo or spoiler implication.

## Discord Touchpoints

No change to messages, tags or channels. The forum receives idea threads from players from now on;
their context block names the role Spieler.

## Routes, Navigation & Staff Integration

None. Both entry points exist; no route, row entry, staff page or todo changes.

## Documentation Impact

`CLAUDE.md` gets a paragraph "Feedback" in the map (the feature had none) pointing at this spec.
`docs/plans/feedback.md` gets the backlink note, since its rule "Idee einreichen: staff" is
superseded. No constitution amendment.
