# Finalize rework (seeding)

**Status: done** (2026-07-03)

A rework of the existing pre-season staff flow, in service of the season
schedule (`docs/plans/season-schedule.md`). Three things: rename the seeding
„publish" to „finalisieren" everywhere (the seeding is locked as final, nothing
is made public — the player-facing view is deferred); make the app's
type-to-confirm prompts name the **action** instead of the season; and add the
staff-area entry points the schedule needs.

Ships as its own commit, before the schedule feature.

## Type-to-confirm: action-specific phrases

Today both type-to-confirm dialogs (open registration, seeding finalize) make
staff type the season name „Saison 1" — the same prompt regardless of action.
The phrase should name what is being committed to.

- **Shared field + helper.** Extract the duplicated confirm block into a dumb
  `TypeToConfirm` component (`src/components/type-to-confirm.tsx`: the „Gib
  {phrase} ein, um zu bestätigen" label + input), and a pure
  `matchesConfirmationPhrase(input, phrase)` (`src/lib/confirm.ts`, unit-tested)
  generalised from the current single-phrase helper in
  `staff/registration-window.ts`. Both existing dialogs and the schedule dialog
  use them.
- **Action phrases** (each equal to its confirm button label):
  - Open registration → **„Anmeldung öffnen"** (`OPEN_CONFIRMATION_PHRASE`).
  - Finalize seeding → **„Einteilung finalisieren"**.
  - (Create schedule → „Spielplan erstellen" — lives with the schedule feature.)
- **Client-side gate.** The phrase is a deliberateness gate; the server actions
  enforce the real protections (role + state). For consistency, open
  registration's **server-side** phrase refine in `openRegistrationSchema` is
  **removed** (date validation stays) — the phrase becomes client-only there
  too, matching the seeding finalize. No server action gains a confirmation
  argument.

This touches the registration feature, so it could be its own commit; folding it
into this one avoids editing the seeding finalize dialog twice (rename + phrase).

## Rename: publish → finalisieren

Full rename, code and UI. Code identifiers go English, UI strings German —
matching the codebase's existing split.

- **DB:** `seedings.published_at` → `finalized_at` (new migration; no production
  data).
- **Code:** `publishSeeding` → `finalizeSeeding` (action + query), the
  `published`/`publishedAt` props → `finalized`/`finalizedAt`, `PublishDialog`
  (`publish-dialog.tsx`) → `FinalizeDialog` (`finalize-dialog.tsx`), the
  „bereits veröffentlicht" error strings, the `placement.ts` comment, the
  integration test names.
- **UI (German „finalisieren"):** button „Einteilung finalisieren", dialog title
  „Einteilung finalisieren?", body „…wird finalisiert und kann danach nicht mehr
  geändert werden.", pending „Wird finalisiert…", badge „Finalisiert —
  endgültig", notice „Die Einteilung wurde am … finalisiert und ist endgültig."
- **Docs:** reword `division-seeding.md` and `seeding-auto-init.md` (which say
  „publish"/„not published") to match — docs describe the present.

The seeding's confirm phrase changes to „Einteilung finalisieren" and moves to
the shared `TypeToConfirm` field (below). The schedule feature reuses that
shared field — not the whole `FinalizeDialog` — since it has no finalize step
but its own terminal generate confirm.

## Staff-area entry points (`/staff`)

The „Einteilung" section (shown when registration is closed) becomes
state-aware, which means the staff page also loads the seeding state
(`getSeeding` → `finalizedAt`):

- Seeding not finalized: „Divisionen einteilen" (unchanged — edit).
- Seeding finalized: the button becomes **„Divisionen ansehen"** (the seeding
  page already renders read-only when finalized).

The „Spielplan erstellen" button and the regular-season entry belong to the
schedule feature (they target routes that only exist there) and land with it.

## Backlink

`/staff/seeding` gains a **„← Zurück zum Staff-Bereich"** link, top-left near
the page title.

## Tests

Rename the existing seeding integration test (`sets finalized_at`); no new
behaviour, so no new test cases. Biome + typecheck + full run before commit.

## Dev tooling

The gallery entry „Seeding: Veröffentlichen" → „Einteilung: Finalisieren"; the
`FinalizeDialog` state updated accordingly.
