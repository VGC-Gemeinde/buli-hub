# Implementation Plan: Ein Discord-Login für alle Gemeinde-Seiten

**Date**: 2026-10-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-shared-discord-login/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Both apps already share one Supabase project and one Discord app, so the person is already the
same user everywhere; only the session cookie is host-only. In production, buli-hub and
gemeinde-tippspiel pass the same `cookieOptions` to `@supabase/ssr` (name `gemeinde-auth`, domain
`.vgcgemein.de`, `httpOnly`, `secure`), read from a new env var `AUTH_COOKIE_DOMAIN`; sign-out
switches to `scope: "local"`; the proxies clear the old host-only cookies once. Plus two copy
changes approved in Gate 1: a paragraph in the privacy page's section 6 and a privacy link in the
Tippspiel footer. Research: [research.md](./research.md); the session definition other apps adopt:
[contracts/shared-session.md](./contracts/shared-session.md).

## Technical Context

**Stack**: Next.js App Router + TypeScript, Supabase (Postgres, Auth, Storage), Drizzle ORM, Zod,
Tailwind CSS + shadcn/ui. New dependencies: none (`clearAuthCookiesAtScopes` ships with the pinned
`@supabase/ssr` 0.12.7).

**Testing**: Vitest unit tests (domain logic), Vitest integration tests against the local Supabase
stack. No E2E.

**Target**: Cloud Run container; desktop and phone browsers, light and dark mode.

**Affected areas**:
- buli-hub `src/lib/supabase/` (server client, new cookie options) and `src/proxy.ts`: every
  session client gets the shared options; the proxy clears legacy cookies.
- buli-hub `src/features/auth/actions.ts`: sign-out scope.
- buli-hub `src/lib/supabase/client.ts`: deleted; it is imported nowhere, and with `httpOnly` a
  browser client could never read the session (research D3).
- buli-hub `src/app/datenschutz/page.tsx`: section 6 and the "Stand" line (FR-011).
- gemeinde-tippspiel `src/lib/supabase/`, `src/proxy.ts`, `src/features/auth/actions.ts`: the same
  three changes; `src/components/shell.tsx`: footer link (FR-012); `cloudbuild.yaml`,
  `scripts/deploy.sh`, `.env.deploy.example`: the new env var.

**Reused building blocks**: `currentUser()` → `getRole()` → `syncMember()` for the first visit
(research D7); `@supabase/ssr`'s own `cookieOptions` merging and `clearAuthCookiesAtScopes`;
`LegalPage` and the footer link style as they are.

**Legacy context read**: `docs/deployment.md` §1 (Supabase Auth and Discord URLs), §3 (runtime env
vars), §7 (staging's own project and Discord app); `docs/plans/deployment.md`; tippspiel
`README.md`, `docs/deployment.md` and commit 373ab8f (guild gate "as in buli-hub").

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Pure, server-side logic | The options are a pure function of the environment; every session read stays on the server (`httpOnly` makes that binding); authorization untouched (FR-009) | Pass |
| II. Tests carry the weight | Unit tests for the options and the legacy key; integration test for a session without a profile; no E2E | Pass |
| III. Boring tools, smallest mechanism | No dependency, no auth service; one env var for a one-time bootstrap value | Pass |
| IV. Schema is code | No schema change | Pass (N/A) |
| V. Look and UX | Both views mocked up and approved in Gate 1 (2026-10-18); no new visual state, so no `/dev/ui` entry; no new auth-metadata shape, so no persona change | Pass |
| VI. League voice | Approved German copy, straight quotes, no em-dash | Pass |
| VII. Spoiler protection | Not touched | Pass (N/A) |
| Architecture: secrets never reach the client | Strengthened: the session leaves page scripts' reach | Pass |

Post-design re-check: unchanged, all pass.

## Project Structure

### Documentation (this feature)

```text
specs/003-shared-discord-login/
├── spec.md
├── mockups/             # datenschutz.html, tippspiel-footer.html (approved in Gate 1)
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── shared-session.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
# buli-hub
src/lib/supabase/cookie-options.ts       # sessionCookieOptions(env), legacySessionKey(url): pure
src/lib/supabase/cookie-options.test.ts  # unit tests
src/lib/supabase/server.ts               # passes cookieOptions
src/proxy.ts                             # passes cookieOptions, clears legacy cookies in production
src/features/auth/actions.ts             # signOut({ scope: "local" })
src/features/roles/sync.integration.test.ts  # + a session without a profile creates one
src/app/datenschutz/page.tsx             # section 6 paragraph, "Stand: Oktober 2026"

# gemeinde-tippspiel (one commit, referencing this spec)
src/lib/supabase/cookie-options.ts       # identical to buli-hub's
src/lib/supabase/cookie-options.test.ts  # identical cases
src/lib/supabase/server.ts, src/proxy.ts, src/features/auth/actions.ts
src/components/shell.tsx                 # footer: Datenschutz link
cloudbuild.yaml, scripts/deploy.sh, .env.deploy.example   # _AUTH_COOKIE_DOMAIN
```

## Schema & Migrations

None.

## Authorization & Visibility

Unchanged in both apps (FR-009): a shared session says who someone is; roles, bans, guild
membership, staff checks in Server Actions and pages, the Tippspiel's guild gate and admin list
decide what they decide today. Embargo and spoiler logic are not touched. `/dev` tooling keeps its
own host-only `buli_dev_tools` cookie and its gate; the dev persona login goes through
`createClient()` and so gets the same options (default name, host-only, locally).

## Discord Touchpoints

None. The Discord app's redirect stays the Supabase callback; no message, role or channel changes.

## Routes, Navigation & Staff Integration

No new route. `/datenschutz` gains one paragraph. The Tippspiel footer links to
`https://buli.vgcgemein.de/datenschutz`. No staff page, todo or stream API change.

## Rollout

1. Set `AUTH_COOKIE_DOMAIN=.vgcgemein.de` on the production services of both apps (buli-hub: once
   on the Cloud Run service; tippspiel: in `.env.deploy`, passed by `scripts/deploy.sh`). Harmless
   before the code ships.
2. Deploy both on the same day: buli-hub through the squash PR `dev` → `main`; tippspiel with
   `npm run deploy`. That PR ships everything on `dev`, not only this feature: today also the
   dependency and GitHub Actions upgrade, the self-hosted fonts, the Supabase CLI bump, the move to
   the shared Spec Kit kit and the design-sync and playoffs commits, all live on staging but not on
   production. Decide before Gate 3 whether production gets `dev` as a whole with this feature or
   `dev` is released first on its own.
3. Run the production checks in `quickstart.md`.

Staging gets no `AUTH_COOKIE_DOMAIN`: it has no Gemeinde domain and its own Supabase project.

## Documentation Impact

- `CLAUDE.md`: the auth line (architecture, "Discord ID lives in user metadata") gains the shared
  session and points at this spec; the env var list gains `AUTH_COOKIE_DOMAIN`.
- `docs/deployment.md`: `AUTH_COOKIE_DOMAIN` in the runtime env vars (§3) and a DNS rule: every
  `*.vgcgemein.de` host must be the Gemeinde's (research D9).
- `.env.example`: `AUTH_COOKIE_DOMAIN` (commented, production only).
- tippspiel `README.md` / `docs/deployment.md`: the same env var, and that the session is shared
  per this spec.
- No legacy document is superseded; no constitution amendment (the contract is a feature artifact,
  not a cross-feature rule; a future third app that adopts it would reference this spec).

## As built

Deviations from this plan during implementation (tasks.md records each):

- The proxy's legacy-cookie cleanup calls `clearAuthCookiesAtScopes` directly; the library finds the
  old cookie and its chunks itself (`isChunkLike`) and does nothing without them, so the
  `legacySessionCookies` matcher added after `/speckit-analyze` was dropped as a duplicate.
- `cookie-options.ts` takes `Record<string, string | undefined>` as its environment, so
  `process.env` is accepted as the default.
- Outside the plan, on the maintainer's request (2026-10-19): tippspiel's `.env.deploy.example` is
  now committed (`.gitignore` exception) and both `.env.example` files name `AUTH_COOKIE_DOMAIN`;
  tippspiel's `AGENTS.md` carries the Next.js block `next dev` 16.4.2 rewrote; buli-hub's
  `.env.example` lost three curly quotes the copy check found.

## Complexity Tracking

No violations.
