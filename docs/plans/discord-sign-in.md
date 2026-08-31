# Discord sign-in

**Status: done** (2026-07-02) — sign-in verified end to end against the local
stack.

Users sign in to Buli Hub with their Discord account via Supabase Auth. The
signed-in user's Discord identity (username, avatar) is shown in the UI from
the session — no application tables involved.

## Scope

- In:
  - Discord OAuth provider enabled in Supabase (local config; prod is a later
    deployment concern).
  - Supabase client wiring for Next.js (`@supabase/ssr`): browser client,
    server client, session refresh in `src/proxy.ts` (Next 16's successor to
    middleware).
  - OAuth callback route (`/auth/callback`) exchanging the code for a session.
  - Sign-in with Discord / sign-out UI in the app shell, showing the current
    user's Discord username + avatar when signed in.
  - Email/password auth disabled — Discord is the only identity path.
- Out (explicitly decided):
  - **No schema changes.** No `players` table — the JWT/session covers the
    current user's own identity; a queryable players table is only needed once
    we display *other* users, which lands with the registration feature.
  - No sign-in restriction (anyone with a Discord account may sign in;
    participation is controlled later at registration).
  - No guild-membership check, no roles/admin, no Discord bot calls.

## Prerequisites (manual, maintainer)

The existing Discord application needs the local redirect URI added in the
Discord Developer Portal (OAuth2 → Redirects):
`http://127.0.0.1:54321/auth/v1/callback`

## Config changes

- `supabase/config.toml`: `[auth.external.discord]` enabled, `client_id` and
  `secret` via `env(...)` substitution (never committed); `[auth.email]`
  disabled.
- `.env.example` + `.env.local`: `SUPABASE_AUTH_EXTERNAL_DISCORD_CLIENT_ID`,
  `SUPABASE_AUTH_EXTERNAL_DISCORD_SECRET`. Exact mechanism for feeding these
  to `supabase start` verified during implementation.

## Files

- `src/lib/supabase/client.ts` — browser client (`createBrowserClient`)
- `src/lib/supabase/server.ts` — server client bound to request cookies
- `src/proxy.ts` — refreshes auth tokens on navigation (Next 16 proxy convention)
- `src/features/auth/`
  - `actions.ts` — server actions: `signInWithDiscord` (redirects to Discord),
    `signOut`
  - `identity.ts` — pure function mapping a Supabase `User` to a display
    identity (Discord ID, username, avatar URL); the unit-testable core
  - `identity.test.ts`
  - `sign-in-error.ts` — classifies a failed round-trip (`error_description`
    from Supabase Auth or the code-exchange error) into a fixed enum
    (`no_email`, `cancelled`, `unknown`) with our own German copy per kind.
    Raw provider strings are logged server-side only; the landing page reads
    `?auth_error=<kind>` and never renders anything from the upstream API.
  - `components/` — sign-in button, signed-in user menu (dumb components)
- `src/app/auth/callback/route.ts` — thin wrapper: exchange code, redirect;
  on failure logs the raw cause and redirects with the classified kind
- `src/app/layout.tsx` / `src/app/page.tsx` — minimal header slot showing
  sign-in state

## Discord touchpoints

None. OAuth only — no bot, no REST API calls.

## Tests

- Unit (Vitest): `identity.ts` mapping — complete metadata, missing avatar,
  missing username fallback, malformed metadata.
- Integration: none — the OAuth handshake is external (Discord) and E2E is
  deliberately out of scope. The callback route stays a thin wrapper around
  `exchangeCodeForSession`, keeping untested surface minimal.

## Open questions

None.
