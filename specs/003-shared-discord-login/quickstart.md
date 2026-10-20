# Quickstart: verifying the shared login

## Automated (both repos)

```bash
npx biome check . && npm run typecheck && npm test -- --run
```

- buli-hub: unit tests for `sessionCookieOptions` and the legacy key; the integration test that a
  session without a profile creates one (needs `supabase start`; it truncates the local database,
  so ask first).
- tippspiel: unit tests for `sessionCookieOptions` (same cases as buli-hub).

## Local (FR-004, SC-005)

1. `npm run dev` in both repos (buli-hub `:3000` with the local stack, tippspiel `:3001`).
2. Sign in on each. Both still need their own sign-in; the cookies are `sb-<ref>-auth-token`,
   host-only, and in the browser's developer tools marked HttpOnly.

## Production, after both deploys (SC-001 to SC-004, SC-006)

Preconditions: `AUTH_COOKIE_DOMAIN=.vgcgemein.de` set on both services before the deploy; both
deployed the same day.

| # | Do | Expect |
|---|---|---|
| 1 | Open buli.vgcgemein.de with a session from before the switch | Signed out, no error; the old `sb-…-auth-token` cookies are gone after the first request |
| 2 | Sign in on buli.vgcgemein.de | Cookie `gemeinde-auth` for `.vgcgemein.de`, HttpOnly and Secure (developer tools) |
| 3 | Open tippspiel.vgcgemein.de | Signed in on the first page load, same person |
| 3a | Sign out everywhere, then sign in on tippspiel and separately on buli | Each lands where it does today: tippspiel on `/tipps`, buli on `/` (FR-007) |
| 4 | Sign out on tippspiel | Reload buli: signed out |
| 5 | Sign in on tippspiel (an account that never used the Buli Hub), then open buli | Signed in; the account's profile exists with its role (staff list or `/profil`) |
| 6 | Sign in on laptop and phone; sign out on the laptop | Phone still signed in on both sites |
| 7 | Keep buli and tippspiel open in two tabs for two hours, using both | Never signed out |
| 8 | Staging (`*.run.app`) | Behaves as before |
| 9 | Data check after re-login | Registrations, team sheets, results and tips unchanged |
