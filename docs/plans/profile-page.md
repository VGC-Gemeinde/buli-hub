# Profile page

**Status: awaiting approval**

Signed-in users get a profile page at `/profil`: their Discord avatar and
name at the top (clean fallback when there is no avatar), below it editable
settings that save automatically.

## Scope

- In:
  - Route `/profil` (auth-guarded; signed-out users are redirected to `/`).
  - Identity header: Discord avatar + display name from the session
    (reusing `discordIdentityFromUser`); avatar-less users get an initials
    fallback — no broken images, no layout shift.
  - Settings, autosaved per field with debounce (no save button):
    - Discord-Handle (text)
    - Bluesky-Handle (text)
    - Herkunft: select with the 16 German Bundesländer + Österreich,
      Schweiz, Luxemburg + „Andere" which reveals a free-text input
  - Save feedback: „Speichern…" while in flight, „Gespeichert" on success,
    error message on failure. Only the latest edit wins (in-flight guard).
  - First schema migration: `profiles` table + RLS defense-in-depth.
  - Header user menu links to `/profil`.
- Out: public visibility of profiles (other users' pages), player
  registration, avatar upload (avatar always comes from Discord), any other
  settings.

## Schema

New table `profiles` (in `src/db/schema.ts`):

| column          | type        | notes                                  |
|-----------------|-------------|----------------------------------------|
| user_id         | uuid PK     | = `auth.users.id`                      |
| discord_handle  | text null   | trimmed, leading `@` stripped          |
| bluesky_handle  | text null   | trimmed, leading `@` stripped, lowercase |
| location        | text null   | either a known region name or free text |
| created_at      | timestamptz | default now()                          |
| updated_at      | timestamptz | set by the update action               |

- One generated migration (drizzle-kit) + one custom migration adding what
  Drizzle can't express against the Supabase-managed `auth` schema: the FK
  `user_id → auth.users(id) on delete cascade`, `enable row level security`,
  and owner-only select/insert/update policies (defense-in-depth; app
  queries bypass RLS per CLAUDE.md).
- The row is created lazily: the first autosave upserts it.
- „Andere" needs no extra column — the select is a UI concern; `location`
  stores whatever the user chose or typed. A pure function maps a stored
  value back to select+text form state.

## Domain logic (pure, unit-tested)

`src/features/profile/`
- `regions.ts` — const list: 16 Bundesländer, Österreich, Schweiz, Luxemburg.
- `settings.ts` — Zod schema + normalization (trim, strip `@`, empty → null,
  length caps); `locationToFormState(value)` / inverse.

## Files

- `src/features/profile/`
  - `regions.ts`, `settings.ts` + tests
  - `actions.ts` — `updateProfile` server action: auth check, Zod parse,
    Drizzle upsert
  - `queries.ts` — load own profile row
  - `components/profile-header.tsx` (avatar + name, initials fallback)
  - `components/settings-form.tsx` (client: debounced autosave, save-state
    feedback, „Andere" toggle)
- `src/app/profil/page.tsx` — thin wrapper: guard, load, render
- `src/features/auth/components/user-menu.tsx` — wrap identity in a link to
  `/profil`
- shadcn additions: `input`, `label`, `select`

## Tests

- Unit: normalization (trim/`@`/casing/empty→null), Zod boundaries,
  `locationToFormState` round-trip, region list integrity.
- Integration (first one in the repo, against local Postgres): upsert via
  the action logic — insert on first save, update on second, `updated_at`
  changes. Introduces a small `src/test/db.ts` helper (connect + truncate).
- Not tested: debounce timing/UI states (UI stays dumb per CLAUDE.md).

## Open questions

1. Discord handle default: prefill the field with the OAuth username when
   no profile row exists yet (proposed), or start empty?
2. `design/colors.json` (falinks-blue etc.) — wire the brand colors into the
   Tailwind theme as part of this feature, or keep that a separate slice?
