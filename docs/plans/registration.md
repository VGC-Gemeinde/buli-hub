# Spieler-Anmeldung

**Status: done** (2026-07-02) — verified end to end: new-player + veteran flows, withdrawal, staff roster, and the capture-card profile toggle.

Signed-in users register for the season at `/anmeldung` while the registration
window is open. The staff roster (Staff-Bereich → Anmeldungen) shows the
registered players, drawn from these registrations joined to the stored guild
identity.

## Access & states

`/anmeldung`, for any signed-in user (role-independent — staff/admin may also
play). The view follows the window state (`registrationState`, reused):

| situation                          | view                                            |
|------------------------------------|-------------------------------------------------|
| signed out                         | explanation + „Mit Discord anmelden"            |
| signed in, `not_started`           | „Die Anmeldung ist noch nicht geöffnet."        |
| signed in, `open`, not registered  | the registration form                           |
| signed in, `open`, registered      | confirmation + submitted data + „Abmelden"      |
| signed in, `closed`, registered    | confirmation (read-only) — the season is set    |
| signed in, `closed`, not registered| „Die Anmeldung ist geschlossen."                |

Withdrawal („Abmelden") is possible only while the window is `open`.

## Returning vs. new player

The form adapts to whether the player has taken part in the league before.
Detection alone is insufficient: earlier seasons ran without this system, so
veterans have no registration data here and would look new. So detection is
backed by a self-report step.

Three form variants:

1. **System-detected returning** — a registration of theirs exists in an
   *earlier* window → **base fields only**, no self-report, no extra
   questions (we already have their history).
2. **Not detected** — the form first asks „Hast du schon einmal
   teilgenommen?" (ja/nein):
   - **ja** → self-reported veteran → base + veteran-history questions (so
     staff can match them to pre-system records)
   - **nein** → new player → base + new-player questions

Resolved status is *returning* (detected **or** self-report „ja") or *new*
(self-report „nein"). A detected veteran never sees the self-report question.
Because this is the first season, no one is detected — everyone answers the
self-report and branches from there.

Pure functions:
- `isReturningPlayer(priorRegistrationCount)` — detection from our own data
- `resolvePlayerStatus({ detectedReturning, participatedBefore })` →
  `{ status, needsVeteranHistory }`, or null when an undetected player has not
  answered the self-report yet

Each status has its own question set. Answers, the resolved status, and the
self-report answer (when asked) are stored on the registration row; the
new-player answers live in nullable columns.

## Form fields

Base fields (all players):

| field              | required | notes                                                        |
|--------------------|----------|--------------------------------------------------------------|
| Anzeigename        | —        | **read-only**, greyed out; the guild display name (from the stored identity), with a note that it comes from the Discord server nickname and is changed there. Not stored on the registration. |
| Plattform          | yes      | choice: „Pokémon Showdown" or „Cartridge (Pokémon Champions)"; seeds the division setup |

Capture-card ownership is *not* a registration field — it is live profile
state (see `docs/decisions/registration-vs-profile-data.md`). This feature
also adds it to the profile: a `has_capture_card` boolean shown as a toggle in
the „Für die Orga" settings, autosaved like the other settings.

Veteran-history set (self-report „ja" only — detected returning players skip
this):

| field           | required | notes                                        |
|-----------------|----------|----------------------------------------------|
| Letzte Saison   | yes      | which season they last took part in          |
| Damaliger Name  | yes      | the name they played under                   |
| Division        | yes      | which division they were in                  |
| Platzierung     | yes      | the place they finished at                   |

New question set (self-report „nein"):

| field              | required | notes                                          |
|--------------------|----------|------------------------------------------------|
| Selbsteinschätzung | yes      | integer 0–10; anchors: 0 = blutiger Anfänger, 5 = konstanter 4-4-Spieler auf Regionals, 10 = VGC-Weltmeister |
| Größte VGC-Erfolge | no       | free text; a true beginner may have none       |

Registration fields are a season-specific snapshot on the registration row;
live per-user attributes belong on the profile
(`docs/decisions/registration-vs-profile-data.md`).

## Profile hint

Above the form, a dismissible hint points players to their profile for
optional info. It shows only when the player has neither edited their profile
nor dismissed the hint — both tracked as timestamps on `profiles`
(`settings_edited_at`, set by the settings save; `registration_hint_dismissed_at`,
set by the dismiss action). Editing the profile in any way, or dismissing,
hides it permanently. `shouldShowProfileHint(profile)` is the pure decision.

## Schema

`registrations`:

| column           | type        | notes                                    |
|------------------|-------------|-------------------------------------------|
| id               | uuid PK     | `gen_random_uuid()`                       |
| window_id        | uuid        | FK → registration_windows                 |
| user_id          | uuid        | FK → auth.users                           |
| platform         | text/enum   | not null: `showdown` \| `cartridge`       |
| created_at       | timestamptz | not null, default now()                   |
| status           | text/enum   | not null: `returning` \| `new` (resolved)  |
| participated_before | boolean  | nullable: the self-report answer, null when detection settled it |
| prev_season      | text        | nullable; veteran-history (self-report „ja") |
| prev_name        | text        | nullable; veteran-history                     |
| prev_division    | text        | nullable; veteran-history                     |
| prev_placement   | text        | nullable; veteran-history                     |
| skill_self_rating| integer     | nullable; new-player set, 0–10                 |
| greatest_achievements | text   | nullable; new-player set, free text           |

Veteran-history columns are free text: they are self-reported recollections
of pre-system seasons for staff to match by hand, not structured references.

- `unique (window_id, user_id)` — one registration per user per window;
  withdrawal deletes the row, so re-registering while open is allowed.
- Custom migration: both FKs + `enable row level security` with **no
  policies** (server code only, like `registration_windows`). The
  `window_id` FK is `on delete cascade`.

## Domain logic (pure, unit-tested)

`src/features/registration/`
- `registration.ts` — Zod `registrationSchema` (platform is one of the two
  choices), extended per resolved status with the veteran-history fields
  (self-reported veterans) or the new-player fields (rating 0–10 required,
  achievements optional); `isReturningPlayer(priorRegistrations)` and
  `resolvePlayerStatus({ detectedReturning, participatedBefore })`.

## Server actions (never trust UI gating)

- `register(input)` — auth check; re-derive window state and reject unless
  `open`; Zod-validate; insert (reject if already registered).
- `withdraw()` — auth check; window must be `open`; delete the user's row.

Both `revalidatePath("/anmeldung")` and `revalidatePath("/staff")`.

## Files

- `src/features/registration/`
  - `registration.ts` + `registration.test.ts`
  - `queries.ts` — `getRegistration(windowId, userId)`,
    `createRegistration`, `deleteRegistration`,
    `listRegistrations(windowId)` (join profiles → display name + avatar),
    `countRegistrations(windowId)`
  - `actions.ts`
  - `components/registration-form.tsx` (client), `components/*` for the
    confirmation and state views (dumb)
  - `queries.integration.test.ts`
- `src/app/anmeldung/page.tsx` — thin wrapper: window state + own
  registration → render
- `src/app/staff/page.tsx` + `registration-status.tsx` — roster comes from
  `listRegistrations`/`countRegistrations` instead of the empty array
- Dev tooling: gallery renders the confirmation view (new-player and veteran
  variants); the form and state messages are exercised via the real
  `/anmeldung` flow with personas (their profiles already exist).
- shadcn additions: `radio-group` (platform), `slider` (0–10 self-rating),
  `textarea` (achievements)

## Tests

- Unit: `registrationSchema` (missing IGN, IGN too long, bad/edge friend
  codes, rules false); `normalizeFriendCode` (prefixed/plain/spaced/invalid).
- Integration: create/get/delete round-trip; the unique constraint rejects a
  double registration; `listRegistrations` returns the joined identity;
  `countRegistrations`; window-cascade delete removes registrations.
- Manual/browser: full flow (open → register → confirmation → withdraw),
  roster + count appear in Staff-Bereich, closed/not-open messages, signed-out
  view.

## Open questions

1. Self-rating scale: 0–10 (assumed, since 0 = brand-new is anchored) vs. the
   literal „1–10" — confirm.
2. „Platzierung" as free text vs. a number — free text handles „Halbfinale",
   „2. Platz", etc.; confirm free text is fine.
