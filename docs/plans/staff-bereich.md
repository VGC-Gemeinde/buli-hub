# Staff-Bereich: Anmeldungs-Verwaltung

**Status: done** (2026-07-02) — verified end to end: access matrix via personas, typed-confirmation open flow, and auto-close derivation.

A separate area at `/staff`, accessible to staff and above (staff, admin,
dev), managing the season registration window. First feature to *enforce*
roles — every access path checks `getRole` (TTL-revalidated).

## Registration states

Derived purely from data — no scheduled job:

| state         | condition                        | staff sees                                          |
|---------------|----------------------------------|-----------------------------------------------------|
| `not_started` | no registration window exists    | set end date + open (guarded), copy link            |
| `open`        | latest window `closes_at > now`  | player list + count (0 for now), closes-at, copy link |
| `closed`      | latest window `closes_at <= now` | player list + count — no copy, no reopen            |

- Auto-close is pure derivation: the moment `now` passes `closes_at`, the
  page renders the closed state. No cron, no mutation.
- There is deliberately no close action, and `closed` is terminal for now —
  reopening belongs to the seasons feature.

## Opening the registration (guarded destructive action)

- Staff sets the end date/time (must be in the future; Zod-validated on the
  server) and clicks "Anmeldung öffnen".
- Confirmation dialog (shadcn `dialog`): explains the consequence and
  requires typing the exact phrase **`Anmeldung öffnen`** — the confirm
  button stays disabled until it matches. GitHub-style typed confirmation.
- The server action re-checks the role (UI gating alone is never trusted),
  validates, and inserts the window row. It also rejects opening when a
  window already exists.

## Registration link

`{origin}/anmeldung` — the future player-registration page (404 until that
feature lands). Copy button uses the clipboard API with "Kopiert"-feedback.

## Access

- `/staff` page: `getRole` → below staff → `redirect("/")`.
- Header user menu gets a "Staff-Bereich" item, rendered only for staff+
  (SiteHeader already loads the user; it additionally resolves the role).
- Role comparison via a pure `roleAtLeast(role, minimum)` helper in
  `features/roles` (dev > admin > staff > player), unit-tested.

## Schema

`registration_windows` — a row exists only once a registration was opened:

| column     | type            | notes                                |
|------------|-----------------|---------------------------------------|
| id         | uuid PK         | `gen_random_uuid()`                   |
| opened_at  | timestamptz     | not null, default now()               |
| closes_at  | timestamptz     | not null                              |
| opened_by  | uuid            | FK → auth.users (custom migration)    |

Custom migration: FK + `enable row level security` with **no policies** —
the PostgREST path can neither read nor write staff data; only server code
(which bypasses RLS) touches it.

## Files

- `src/features/staff/`
  - `registration-window.ts` — `registrationState(window, now)` + Zod
    schema for the open action (pure; may graduate to a registration
    feature later)
  - `queries.ts` — `latestWindow()`, `createWindow(closesAt, openedBy)`
  - `actions.ts` — `openRegistration`: role check → validate → insert
  - `components/registration-status.tsx` — the three state views (dumb)
  - `components/open-registration-dialog.tsx` — typed-confirmation dialog
  - `components/copy-link-button.tsx` — clipboard + feedback
  - tests
- `src/features/roles/roles.ts` — `roleAtLeast` + tests
- `src/app/staff/page.tsx` — thin wrapper: role gate, load window, render
- `src/features/auth/components/user-menu.tsx` + `site-header.tsx` —
  conditional "Staff-Bereich" menu item
- Dev tooling (definition of done): gallery renders the three state views
  and the copy button; personas already cover the access matrix (staff/
  admin/dev personas see `/staff`, player and signed-out do not).
- shadcn addition: `dialog`

## Tests

- Unit: `registrationState` (no window, future, past, exact boundary),
  `roleAtLeast` (full matrix), open-action Zod schema (past date rejected,
  invalid input rejected), confirmation-phrase match logic.
- Integration: `createWindow` + `latestWindow` round-trip; the
  already-exists rejection.
- Manual/browser: access matrix via personas, full open flow with typed
  confirmation, state flip to closed with a near-future end date.

## Open questions

None.
