---

description: "Task list for the shared Discord login across the Gemeinde sites"
---

# Tasks: Ein Discord-Login für alle Gemeinde-Seiten

**Input**: Design documents from `/specs/003-shared-discord-login/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/shared-session.md, quickstart.md

**Tests**: Required by the constitution (Principle II): unit tests for every piece of domain logic, integration tests against the local Supabase stack for multi-step flows. No E2E tests.

**Organization**: Tasks are grouped by user story. Paths without a prefix are in buli-hub; paths
prefixed `tippspiel:` are in `../gemeinde-tippspiel` (one commit there, referencing this spec).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4 from spec.md)

## Path Conventions

- buli-hub: `src/lib/supabase/` (session clients), `src/proxy.ts`, `src/features/auth/`, `src/app/datenschutz/`
- gemeinde-tippspiel: the same `src/lib/supabase/`, `src/proxy.ts`, `src/features/auth/`, plus `src/components/shell.tsx` and the deploy files

---

## Phase 1: Setup

**Purpose**: nothing to install; confirm the starting point

- [X] T001 Confirm both repos are clean and on their working branches (buli-hub `dev`, tippspiel `master`) and that no other session edits them (`git status`, ListAgents); no dependency changes are needed (`@supabase/ssr` 0.12.7 in both `package.json`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the one session definition both apps share (contracts/shared-session.md)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Write unit tests in src/lib/supabase/cookie-options.test.ts for `sessionCookieOptions(env)`: with `AUTH_COOKIE_DOMAIN=".vgcgemein.de"` it returns exactly `{ name: "gemeinde-auth", domain: ".vgcgemein.de", path: "/", sameSite: "lax", secure: true, httpOnly: true }`; with it unset or empty it returns exactly `{ httpOnly: true }`; and for `legacySessionKey(url)`: `https://comibjasharlauepcnye.supabase.co` → `sb-comibjasharlauepcnye-auth-token`, `http://127.0.0.1:54321` → `sb-127-auth-token` (the library's own derivation: first host label)
- [X] T003 Implement `sessionCookieOptions(env = process.env)`, and `legacySessionKey(supabaseUrl)` as pure functions in src/lib/supabase/cookie-options.ts, with a header comment pointing at specs/003-shared-discord-login/contracts/shared-session.md and saying the file is kept identical in gemeinde-tippspiel: a change goes into both repos in the same feature
- [X] T004 [P] Copy src/lib/supabase/cookie-options.ts and its test byte-identical to tippspiel:src/lib/supabase/cookie-options.ts and tippspiel:src/lib/supabase/cookie-options.test.ts (tippspiel's tests live under `src/**/*.test.ts`, so they run as they are)

**Checkpoint**: both repos have the tested definition; nothing uses it yet

---

## Phase 3: User Story 1 - Signed in once, signed in everywhere (Priority: P1) 🎯 MVP

**Goal**: one session for buli.vgcgemein.de and tippspiel.vgcgemein.de in production

**Independent Test**: with `AUTH_COOKIE_DOMAIN` set, a sign-in on one app is seen by the other (quickstart rows 2, 3, 5); without it, behaviour is as today (quickstart "Local")

### Tests for User Story 1 ⚠️

- [X] T005 [US1] Integration test in src/features/roles/sync.integration.test.ts: `getRole(userId, identity)` for an existing `auth.users` row with **no** `profiles` row creates the profile with the synced role and identity (FR-006, research D7); same fixtures and Discord stubs as the existing `syncMember` cases

### Implementation for User Story 1

- [X] T006 [P] [US1] Pass `cookieOptions: sessionCookieOptions()` to `createServerClient` in src/lib/supabase/server.ts
- [X] T007 [P] [US1] Pass `cookieOptions: sessionCookieOptions()` to `createServerClient` in src/proxy.ts
- [X] T008 [P] [US1] Same two changes in tippspiel:src/lib/supabase/server.ts and tippspiel:src/proxy.ts
- [X] T009 [US1] Confirm no other session client exists: `grep -rn "createServerClient\|createBrowserClient" src` in both repos lists only the server client, the proxy and buli-hub's unused src/lib/supabase/client.ts; delete that unused browser client, since with `httpOnly` it could never read the session (research D3)

**Checkpoint**: locally both apps behave as before (default names, host-only, now HttpOnly)

---

## Phase 4: User Story 2 - Signing out ends it everywhere (Priority: P1)

**Goal**: sign-out ends the session in this browser for every site, not on other devices (FR-002)

**Independent Test**: quickstart rows 4 and 6

### Implementation for User Story 2

- [X] T010 [P] [US2] `supabase.auth.signOut({ scope: "local" })` in src/features/auth/actions.ts, with a comment citing the spec's clarification
- [X] T011 [P] [US2] Same in tippspiel:src/features/auth/actions.ts

**Checkpoint**: local sign-out still clears the session; nothing else changes

---

## Phase 5: User Story 3 - The session stays protected (Priority: P2)

**Goal**: the session is hidden from page scripts everywhere and HTTPS-only in production (FR-003)

**Independent Test**: quickstart row 2 (production) and "Local" step 2 (HttpOnly locally)

- [X] T012 [US3] In both running dev servers, check in the browser's developer tools that the session cookie is HttpOnly and that `document.cookie` does not contain it; the production half (Secure, `.vgcgemein.de`) is quickstart row 2 after deploy

---

## Phase 6: User Story 4 - The switch costs one sign-in, nothing more (Priority: P2)

**Goal**: pre-switch sessions are ignored and their cookies removed once (FR-005, research D5)

**Independent Test**: quickstart row 1

### Implementation for User Story 4

- [X] T013 [P] [US4] In src/proxy.ts, only when `process.env.AUTH_COOKIE_DOMAIN` is set: call `clearAuthCookiesAtScopes({ getAll, setAll, storageKey: legacySessionKey(url), scopes: [{}] })` from `@supabase/ssr` with the proxy's request/response cookie adapters, after `getUser()`. The helper itself finds the key and its `.<n>` chunks (`isChunkLike`) and does nothing when there are none, so no own matcher (an extra `legacySessionCookies` from the analysis was dropped during implementation as a duplicate of the library's logic)
- [X] T014 [P] [US4] Same in tippspiel:src/proxy.ts

**Checkpoint**: with `AUTH_COOKIE_DOMAIN` set locally for a test run, an old `sb-…-auth-token` cookie is removed on the first request and the session reads only `gemeinde-auth`; unset it again afterwards

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: the approved copy, configuration, documentation and the Definition of Done

### Copy (approved in Gate 1, spec UX decisions)

- [X] T015 [P] src/app/datenschutz/page.tsx: second paragraph in section 6, verbatim from the spec's UX decisions; "Stand: Juli 2026" → "Stand: Oktober 2026"
- [X] T016 [P] tippspiel:src/components/shell.tsx: footer link "Datenschutz" after "Impressum" to `https://buli.vgcgemein.de/datenschutz`, `target="_blank" rel="noreferrer"`, same classes as the imprint link, both links in one wrapping group per mockups/tippspiel-footer.html

### Configuration

- [X] T017 [P] tippspiel:cloudbuild.yaml (`_AUTH_COOKIE_DOMAIN` substitution, empty by default, appended to `--set-env-vars`), tippspiel:scripts/deploy.sh (pass `_AUTH_COOKIE_DOMAIN=${AUTH_COOKIE_DOMAIN}`), tippspiel:.env.deploy.example (`AUTH_COOKIE_DOMAIN=.vgcgemein.de`, production only)
- [X] T018 [P] .env.example: commented `AUTH_COOKIE_DOMAIN` with "production only, see specs/003-shared-discord-login"

### Documentation

- [X] T019 [P] docs/deployment.md: `AUTH_COOKIE_DOMAIN=.vgcgemein.de` in the runtime env vars with the one-time `gcloud run services update … --update-env-vars` line; staging must not set it; the DNS rule that every `*.vgcgemein.de` host is the Gemeinde's (research D9)
- [X] T020 [P] CLAUDE.md: the auth line in Architecture (the living architecture map) gains the shared session (name, domain, production only, `scope: "local"` sign-out) and points at specs/003-shared-discord-login/; env var list gains `AUTH_COOKIE_DOMAIN`
- [X] T021 [P] tippspiel:README.md and tippspiel:docs/deployment.md: the env var and that the session is shared with buli-hub per buli-hub's specs/003-shared-discord-login/contracts/shared-session.md

### Definition of Done

- [X] T022 [P] `/dev/ui` gallery: no new visual state (copy only), nothing to extend; `/dev` personas: no new auth-metadata shape, nothing to extend (state both in the ship report)
- [ ] T023 Verify both views in the running apps against the approved mockups: /datenschutz at desktop and phone width, light and dark; the Tippspiel footer at desktop and phone width
- [X] T024 Biome, typecheck, full test suite green in buli-hub (ask before the integration tests) and in tippspiel
- [ ] T025 Run quickstart.md "Automated" and "Local"; production rows 1–9 after the rollout below
- [X] T026 No legacy document is superseded; confirm no backlink is needed; name the existing role, ban, membership and guild-gate tests in the ship report as the evidence for FR-009

### Rollout (maintainer, after Gate 3 and both commits)

- [ ] T027 Set `AUTH_COOKIE_DOMAIN=.vgcgemein.de` on the buli-hub production Cloud Run service and in tippspiel's `.env.deploy`, then deploy both on the same day (buli-hub via the squash PR `dev` → `main`, tippspiel via `npm run deploy`). The buli-hub PR ships **everything** on `dev`, not only this feature (see plan.md Rollout); the maintainer decides beforehand whether `dev` goes to production as a whole or is released first on its own

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)**: T002 before T003 (test first), T004 after T003
- **User Stories (Phases 3–6)**: all depend on Phase 2
- **Polish (Phase 7)**: copy and configuration tasks are independent of the stories and can run any
  time after Phase 1; T022–T026 run last; T027 only after Gate 3

### User Story Dependencies

- **US1 (P1)**: after Phase 2
- **US2 (P1)**: after Phase 2; independent of US1 (different files)
- **US3 (P2)**: after US1 (the options must be wired to be observable)
- **US4 (P2)**: after US1 (T013/T014 edit the proxy US1 touched)

### Parallel Opportunities

- T004 alongside nothing else in Phase 2 (it copies T003's result)
- T006, T007, T008 in parallel; T010, T011 in parallel; T013, T014 in parallel
- T015–T021 all in parallel

---

## Parallel Example: User Story 1

```bash
Task: "Pass cookieOptions in src/lib/supabase/server.ts"
Task: "Pass cookieOptions in src/proxy.ts"
Task: "Same two changes in tippspiel:src/lib/supabase/server.ts and tippspiel:src/proxy.ts"
```

---

## Implementation Strategy

### One feature, two commits, one rollout

The stories only make sense together in production: sharing a session (US1) without the local
sign-out (US2) or the cleanup (US4) would ship a half-changed behaviour. So everything is built
and verified locally, then committed as **one commit in buli-hub and one in tippspiel** after
Gate 3 (constitution: a feature ships as one reviewable commit), and rolled out together (T027).

### Order of work

1. Phase 2 (definition and tests), then US1 locally: both apps behave as before, now HttpOnly.
2. US2 and US4, then the copy and configuration tasks.
3. Checks (T022–T026), `/speckit-converge`, Gate 3, commits, rollout, production checks.

---

## Notes

- [P] tasks = different files, no dependencies
- Paths prefixed `tippspiel:` are in ../gemeinde-tippspiel
- Stage explicit paths when committing; other sessions may work in the same trees
- Never set `AUTH_COOKIE_DOMAIN` on staging

---

## Phase 8: Convergence

- [X] T028 Keep the tippspiel `.gitignore` exception `!.env.deploy.example` and commit the template (no secrets: the publishable key is empty; account and project as in gemeinde-tours' committed template), plus the commented `AUTH_COOKIE_DOMAIN` in tippspiel:.env.example; both requested by the maintainer on 2026-10-19, outside the plan; name them in the tippspiel commit message per plan: Documentation Impact (unrequested)
- [X] T029 Commit tippspiel:AGENTS.md's Next.js block as `next dev` 16.4.2 rewrote it during the local check (`#` → `##` heading), the same update buli-hub committed in 9867730, so the tree stays clean; name it in the tippspiel commit message per plan: Affected areas (unrequested)
