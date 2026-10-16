---
description: "Design and iterate the feature's mockups, export them into the spec, and get the maintainer's approval of spec and mockups"
---

# Mockups (Gate 1)

Runs as a mandatory hook before `/speckit-plan`. It designs what the feature looks like and how it
is used, before anyone decides how it is built. It ends in Gate 1: the maintainer approves the spec
and its mockups. Planning never starts without that approval.

## User Input

```text
$ARGUMENTS
```

Feedback on mockups from the maintainer may arrive here or in the conversation. Consider it before
doing anything else.

## 1. Locate the feature and decide whether there is work

1. Run `.specify/scripts/bash/check-prerequisites.sh --json --paths-only` from the repository root
   and read `FEATURE_DIR` and `FEATURE_SPEC`.
2. Read the spec's `## UX & Mockups` section.
   - It says "No visible change": confirm against the spec that no user (player, staff, public
     visitor, Discord reader) sees anything new or different. If that holds, report "No mockups
     needed" and return; planning continues. If it does not hold, the section is wrong: continue
     with step 2.
   - **Status** is `Approved YYYY-MM-DD` and every file in its table exists under
     `FEATURE_DIR/mockups/`: report "Mockups approved" and return; planning continues.
   - Otherwise continue.

## 2. Gather the design context

Read before drawing anything:

- `.specify/memory/constitution.md`, Principles V and VI (look and UX, league voice).
- `design/DESIGN.md` (living design system) and the tokens in `src/app/globals.css`, light and
  `.dark`.
- The real code of the views this feature changes or sits next to (`src/features/*/components/`,
  `src/app/**/page.tsx`), so the mockup matches what exists: same header, same section row, same
  primitives (`SectionHeader`, `Tick`, `EmptyStateCard`, links, zone and form colors).
- Legacy hand-offs for the area (`design/NAVIGATION.md`, `design/STAFF-DASHBOARD.md`,
  `design/<FEATURE>.md`) and older specs' mockups, as history; the code wins where they differ.

## 3. Decide what to show

For every view in the spec:

- Who sees it (public, signed-in, player, participant, staff, admin) and what differs between them.
- Every state it can be in: empty, first use, normal, many entries, error, spoiler covered and
  revealed, embargoed, closed season, and whatever the spec's edge cases name.
- Its explanation level: a flow page guides the user; a display page lets the layout speak.
  Write one sentence why.

## 4. Build the mockups

One self-contained HTML file per view (`<view-name>.html`):

- Tokens copied from `src/app/globals.css` into the file's own `<style>`, with the dark set under a
  class toggle. Fonts as loaded in `src/app/layout.tsx`. No dependency on any runtime, so the file
  opens from the repository in any browser.
- Desktop and phone width (about 390px) side by side, a light/dark switch, and a state switcher
  covering every state from step 3.
- Real German copy following Principle VI (straight quotes, no em-dash, `·` as separator) and
  realistic league data. Real behavior where it clarifies UX (tabs, dialogs, reveal), nothing more.
- Look and UX are optimised, not merely laid out: hierarchy, spacing, touch targets, what the eye
  lands on first, what the phone layout drops or folds.

## 5. Iterate with the maintainer

- With the Artifact tool available (Claude Code with claude.ai): publish each file as a private
  Artifact (load the `artifact-design` skill first; the published page is the same file) and give
  the maintainer the links, so they can check desktop and phone and comment.
- Otherwise: write the files to `FEATURE_DIR/mockups/` and give the maintainer the paths.
- Apply feedback, republish, repeat. Every decision taken while iterating that the plan must honor
  goes into the spec's **UX decisions** right away, not at the end. A requirement that changes
  goes into the spec's requirements too.

## 6. Gate 1

When the maintainer approves:

1. Write the final version of every file to `FEATURE_DIR/mockups/`. These files are the record;
   Artifact links never appear in the spec.
2. Fill the spec's `## UX & Mockups` section: table of views and files, explanation level, UX
   decisions, **Status** `Approved YYYY-MM-DD`.
3. Re-read the whole spec once against the mockups; fix anything they contradict.
4. Report "Spec and mockups approved" and return; planning continues.

Until the maintainer has explicitly approved spec and mockups, do **not** return success: end the
turn after presenting the mockups and say that `/speckit-plan` continues after approval. Never treat
silence or a question as approval.
