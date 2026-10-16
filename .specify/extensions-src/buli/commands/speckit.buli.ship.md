---
description: "Check the Definition of Done, freeze spec and plan to what was built, and hand the work to the maintainer for approval"
---

# Ship (Gate 3)

Runs as a mandatory hook after `/speckit-converge`. It checks the Definition of Done from the
constitution, makes the spec directory a true record of what was built, and hands the finished
work to the maintainer. It never commits.

## User Input

```text
$ARGUMENTS
```

## 1. Is implementation finished?

Run `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` and read
`FEATURE_DIR`. If `tasks.md` has any unchecked task (`- [ ]`), including ones converge just
appended, stop here: list them and say that `/speckit-implement` runs next. Do not continue.

## 2. Checks

1. `npx biome check .` and `npm run typecheck` are clean.
2. The full test suite: `npm test -- --run`. The integration tests truncate the local database, so
   **ask the maintainer first** whether they are testing by hand on it; run only after a yes.
3. Copy rules on the changed files (`git diff --name-only` plus untracked files): no `„` or `“`
   anywhere; no `—` in user-facing strings (pages, components, Discord messages in
   `src/features/discord-posts/messages.ts`), with the exemptions from constitution Principle VI.
4. Every view in the running app against the approved mockups in `FEATURE_DIR/mockups/`: desktop
   and phone width, light and dark, every state. Use a browser tool if one is available; otherwise
   list exactly what the maintainer needs to look at.
5. `/dev/ui` gallery extended for new visual states; `/dev` personas extended for new user-specific
   data or auth-metadata shapes.

Fix what fails and run the affected checks again. Report anything you could not check as not
checked, never as passed.

## 3. Freeze the record

- `spec.md`, `plan.md` and the mockups describe what was built. Bring them in line with every
  deviation from implementation; this is the last time they change.
- The feature's paragraph in `CLAUDE.md` (the living architecture map) is added or updated and
  points at `FEATURE_DIR`. Anything structural is reflected in `CLAUDE.md`.
- Every legacy document (`docs/plans/`, `docs/decisions/`, `design/<FEATURE>.md`) and every older
  spec whose content this feature supersedes gets one backlink line at its top, content untouched:
  `> Abgelöst in Teilen durch specs/NNN-… (<Bereich>).`
- Code comments added by this feature point at `FEATURE_DIR`, not at legacy plans.
- `design/DESIGN.md` is living: update it where this feature changed the design system or added
  a cross-feature anatomy.
- A decision that spans features became a constitution amendment (`/speckit-constitution`), with
  its reasoning in this feature's `research.md`.

## 4. Gate 3

Present to the maintainer:

- What was built, per user story, and what deviates from the approved spec or mockups and why.
- The check results from step 2, including anything not checked.
- The documentation changes from step 3.
- A proposed commit message: one commit for the whole feature, migrations included.

Then stop. Commit only after the maintainer explicitly approves; on `dev`, never `main`.
