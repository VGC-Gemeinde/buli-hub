# Research: Ein Discord-Login für alle Gemeinde-Seiten

Facts checked on 2026-10-18 against the code of buli-hub and gemeinde-tippspiel and against
`@supabase/ssr` 0.12.7 / `@supabase/auth-js` as installed (both repos use the same versions).

## Starting point

- Both apps use the **same Supabase project** (Buli Hub production, ref `comibjasharlauepcnye`) and
  the **same Discord app**; tippspiel keeps no auth data of its own and keys its Firestore
  documents by the Supabase user id. Identities are already shared; only the session is per host.
- Both create the server client with `createServerClient` and pass no `cookieOptions`: buli-hub in
  `src/lib/supabase/server.ts` and `src/proxy.ts`, tippspiel in the same two files. Nothing else
  creates a session client (`admin.ts` is session-less; `client.ts` in buli-hub is not imported).
- So both write the library default: a host-only cookie `sb-<ref>-auth-token` (chunked as `.0`,
  `.1`, …), `path=/`, `SameSite=Lax`, `httpOnly=false`, `Max-Age` 400 days.
- Sign-out in both is `supabase.auth.signOut()`, whose default scope is `global`.

## Decisions

### D1 · The shared session is a cookie on `.vgcgemein.de`, set through `cookieOptions`

- **Decision**: in production both apps pass the same `cookieOptions` to every `createServerClient`
  call: `name: "gemeinde-auth"`, `domain: ".vgcgemein.de"`, `path: "/"`, `sameSite: "lax"`,
  `secure: true`, `httpOnly: true`. The values live in one pure function per repo
  (`src/lib/supabase/cookie-options.ts`), identical in both, specified in
  `contracts/shared-session.md`.
- **Rationale**: `@supabase/ssr` merges `cookieOptions` over its defaults for every set and every
  removal (`cookies.js`, set and `removeItem`), and uses `cookieOptions.name` as the storage key
  (`createServerClient.js`), so chunks and the PKCE code-verifier cookie follow the same scope. No
  new dependency, no auth server of our own.
- **Alternatives rejected**: a central auth app on `auth.vgcgemein.de` that issues tokens to the
  others (a second login flow and a token hand-off to build and secure, for what one cookie
  attribute does); a shared npm package for the ten-line function (a release process for one
  constant; FR-008 is met by the contract plus an identical, tested module).

### D2 · A new cookie name, and only in production

- **Decision**: the name `gemeinde-auth` and the domain apply only when `AUTH_COOKIE_DOMAIN` is set.
  Without it (local development, staging) the options are the library's defaults plus
  `httpOnly: true`, so the name stays `sb-<ref>-auth-token` and the cookie host-only.
- **Rationale**: a new name means a session from before the switch is simply not read (FR-005, the
  re-login the maintainer accepted) instead of competing with the new cookie of the same name at a
  different scope, which the browser would send both of. Keeping the default name outside
  production matters locally: buli-hub (`:3000`) and tippspiel (`:3001`) both run on `localhost`,
  cookies ignore the port, and the two talk to different Supabase projects there (buli-hub to the
  local stack). Their default names differ by project ref, so they cannot collide; one fixed name
  would.
- **Alternatives rejected**: keeping the default name with a domain (old host-only and new domain
  cookies coexist under one name; the library clears host-only chunks only on its own writes, so
  stale ones linger); a `__Secure-` prefix (sound, but it changes nothing `secure: true` does not
  already enforce for our sites, and makes the name differ between environments).

### D3 · `httpOnly` everywhere

- **Decision**: `httpOnly: true` in every environment.
- **Rationale**: no browser code reads the session in either app (buli-hub's `client.ts` is unused,
  tippspiel has no browser client), so hiding it from page scripts is free and is what makes
  sending the cookie to every Gemeinde subdomain acceptable (FR-003). Setting it locally too means
  development behaves like production.
- **Consequence**: a future browser-side Supabase client would not see the session. Any such need
  goes through a Server Action or route handler, which is the constitution's rule anyway
  (Principle I).

### D4 · Sign-out with `scope: "local"`

- **Decision**: both `signOut` actions call `supabase.auth.signOut({ scope: "local" })`.
- **Rationale**: the clarification (spec, Session 2026-10-18): this browser, every site; other
  devices stay signed in. `local` revokes only the current session's refresh token and clears the
  cookie; because the cookie is shared, every site in this browser loses it at once. `global`
  (today) would also end the phone's session.

### D5 · Old cookies are cleared once, by the proxy

- **Decision**: in production the proxy of each app clears the legacy `sb-<ref>-auth-token` chunks
  at host-only scope when the request still carries them, with the library's
  `clearAuthCookiesAtScopes`.
- **Rationale**: after the switch nothing reads them, but the browser keeps sending up to ~4 KB of
  them on every request for 400 days. The helper exists for exactly this migration; the project
  ref comes from `NEXT_PUBLIC_SUPABASE_URL` (its first host label).
- **Alternatives rejected**: leaving them to expire (harmless but wasteful for a year); clearing in
  the sign-in callback (misses players who never sign in again on that host).

### D6 · Parallel renewal is covered by the existing reuse interval

- **Decision**: no code; verify (SC-004).
- **Rationale**: refresh token rotation is on with `refresh_token_reuse_interval = 10` seconds, so
  when buli-hub and tippspiel renew the same session within that window, the second request gets
  the already-rotated session instead of a failure. Both apps then write the same shared cookie.
  The access token lives 3600 s, so a two-hour parallel session crosses at least one renewal.
- **Risk**: renewals more than 10 s apart are sequential and fine; truly simultaneous ones inside
  the window are what the interval exists for. The quickstart's two-tab run is the check.

### D7 · First visit to the Buli Hub after signing in elsewhere

- **Decision**: no new code; one test.
- **Rationale**: `currentUser()` calls `getRole()`, which runs `syncMember()` when there is no
  stored profile, and `syncMember` upserts the profile row (role, identity, guild membership). So a
  session minted by tippspiel is handled exactly like one minted by buli-hub's own callback
  (FR-006). `src/features/roles/sync.integration.test.ts` covers the write rules but not "no
  profile yet"; a test pins it.

### D8 · Configuration and rollout

- **Decision**: a new runtime env var `AUTH_COOKIE_DOMAIN=.vgcgemein.de`, set on both production
  services **before** the new code deploys; unset everywhere else.
  - buli-hub: once on the Cloud Run service (`gcloud run services update buli-hub
    --update-env-vars AUTH_COOKIE_DOMAIN=.vgcgemein.de`), like the other runtime variables; the CI
    deploy uses `--update-env-vars` and keeps it.
  - tippspiel: a `_AUTH_COOKIE_DOMAIN` substitution in `cloudbuild.yaml`, filled from
    `.env.deploy` by `scripts/deploy.sh`, like `_APP_BASE_URL`.
- **Rationale**: one-time bootstrap values are env vars (constitution Principle III). Setting it
  first is safe: today's code ignores it. Both apps deploy the same day; until the second one is
  out, each still works on its own, only without sharing.
- **No change needed** in the Supabase redirect allow-list (both hosts are on it), the Discord app
  (its redirect is the Supabase callback), or the callbacks (both build `redirectTo` from the
  request origin and land on their own `APP_BASE_URL`, FR-007).

### D9 · CSRF and other subdomains

- Server Actions keep Next's Origin/Host check; a shared cookie does not change which origin may
  call an app's actions, and `SameSite=Lax` stays.
- `vgcgemein.de` (the Go site) and any other Gemeinde subdomain receive the cookie and ignore it.
  All subdomains are the Gemeinde's (maintainer, 2026-10-18); a new subdomain pointing at a third
  party would receive session tokens, so that is now a rule for DNS (`docs/deployment.md`).
