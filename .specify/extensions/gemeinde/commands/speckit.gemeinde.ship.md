---
description: "Check the Definition of Done, freeze spec and plan to what was built, and hand the work to the maintainer for approval"
---

# Ship (Gate 3)

Runs as a mandatory hook after `/speckit-converge`. It checks the Definition of Done from the
constitution, makes the spec directory a true record of what was built, and hands the finished
work to the maintainer. It never commits.

Everything project-specific comes from the constitution (`.specify/memory/constitution.md`): its
**Definition of Done** and its **Workflow profile**. Read both first.

## User Input

```text
$ARGUMENTS
```

## 1. Is implementation finished?

Run `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` and read
`FEATURE_DIR`. If `tasks.md` has any unchecked task (`- [ ]`), including ones converge just
appended, stop here: list them and say that `/speckit-implement` runs next. Do not continue.

## 2. Checks

1. Every command under the profile's **Checks**, in the order given, honouring its caveats (a check
   that touches shared local state, such as a database, is run only after the maintainer says yes).
2. The profile's **Copy checks** on the changed files (`git diff --name-only` plus untracked
   files), with the exemptions the constitution grants.
3. Every view in the running app against the approved mockups in `FEATURE_DIR/mockups/`: each width
   and theme the **Mockup frame** names, every state. Use a browser tool if one is available;
   otherwise list exactly what the maintainer needs to look at. Follow the profile's
   **Running-app check** for how.
4. The profile's **Dev tooling to extend**, where this feature added what it covers.

Fix what fails and run the affected checks again. Report anything you could not check as not
checked, never as passed.

## 3. Freeze the record

- `spec.md`, `plan.md` and the mockups describe what was built. Bring them in line with every
  deviation from implementation; this is the last time they change.
- Every file under the profile's **Living documents** is updated where this feature changed what it
  describes; the architecture map points at `FEATURE_DIR`.
- Every legacy document (the profile's **Legacy documents**) and every older spec whose content this
  feature supersedes gets the profile's backlink line at its top, content untouched.
- Code comments added by this feature point at `FEATURE_DIR`, not at legacy documents.
- A decision that spans features became a constitution amendment (`/speckit-constitution`), with
  its reasoning in this feature's `research.md`.

## 4. Gate 3

Present to the maintainer:

- What was built, per user story, and what deviates from the approved spec or mockups and why.
- The check results from step 2, including anything not checked.
- The documentation changes from step 3.
- A proposed commit message: one commit for the whole feature, in the repository's commit style.

Then stop. Commit only after the maintainer explicitly approves, on the profile's **Commit
target**, staging the feature's paths explicitly (other sessions may be working in the same tree).
