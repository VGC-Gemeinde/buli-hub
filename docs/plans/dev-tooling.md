# Dev tooling: test personas + UI gallery

**Status: done** (2026-07-02) — verified in the browser; /dev routes confirmed 404 in a production build.

Local-development-only tooling to manually test UI states that a single real
Discord account cannot produce. Two routes, both hard-404 outside development.

## Scope

- In:
  - `/dev` — index page linking the tools below.
  - `/dev/login?persona=<id>` — signs the browser in as a crafted test
    persona against the **local** Supabase stack: creates (or reuses) an auth
    user with the persona's metadata via the admin API, then establishes a
    real session server-side (admin magic link + `verifyOtp` with the token
    hash — no email involved) and redirects to `/`.
  - Personas (auth metadata variants):
    | id            | covers                                              |
    |---------------|-----------------------------------------------------|
    | `voll`        | avatar + global name — the happy path               |
    | `kein-avatar` | no avatar → initials fallback everywhere            |
    | `langer-name` | ~40-char display name → truncation                  |
    | `leer`        | empty metadata → every fallback at once             |
  - `/dev/ui` — static gallery rendering the dumb components in forced
    states: `ProfileHeader` (all persona shapes), `UserMenu` chip,
    `SignInButton` variants, `SaveIndicator` (idle/saving/saved/error, which
    requires exporting it from `settings-form.tsx`), the landing error line.
  - Gating: every `/dev` route calls `notFound()` unless
    `process.env.NODE_ENV === "development"`. The login route additionally
    requires `SUPABASE_SECRET_KEY`, which only exists locally anyway.
- Out: Storybook, visual-regression tooling, E2E, anything reachable in a
  production build. Database states (filled/empty profile) are not seeded —
  they are reachable through the app itself once signed in as a persona.

## Files

- `src/features/dev/`
  - `personas.ts` — persona table; pure `personaToAdminPayload(persona)`
    mapping a persona to the admin-API user attributes + test
  - `login.ts` — create-or-reuse user, mint session (server-side, local only)
  - `components/gallery.tsx` — the state grid
- `src/app/dev/page.tsx`, `src/app/dev/ui/page.tsx`,
  `src/app/dev/login/route.ts` — thin, each gated
- `src/features/profile/components/settings-form.tsx` — export
  `SaveIndicator`

## Tests

- Unit: `personaToAdminPayload` — each persona produces the intended
  metadata shape (no avatar key when absent, legacy name format, length).
- The login flow itself is exercised manually; it is dev tooling, not
  domain logic.

## Open questions

None.
