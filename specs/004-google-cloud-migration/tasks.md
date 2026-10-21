---

description: "Task list for the move from Supabase to Google Cloud"
---

# Tasks: Umzug von Supabase auf Google Cloud

**Input**: Design documents from `/specs/004-google-cloud-migration/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (session, maintenance, switch-procedure), quickstart.md

**Tests**: Required by the constitution (Principle II): unit tests for every piece of domain logic, integration tests against the local Postgres (Docker) for constraints and multi-step flows. No E2E tests.

**Organization**: Tasks are grouped by user story. Unlike a usual feature, the stories share one codebase switch: nothing compiles against both Supabase and the new system, so Phases 1 and 2 must land first and the stories then complete in order; each story's checkpoint is still verified on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1 to US6 from spec.md)

## Path Conventions

- Feature code: `src/features/<feature>/` (logic, actions, components, colocated `*.test.ts`)
- Routes: `src/app/...`, schema: `src/db/schema.ts`, migrations: `drizzle/` (new; replaces `supabase/migrations/`)
- Shared code only in `src/lib/`; `/dev` tooling in `src/features/dev/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: a local stack without Supabase.

- [X] T001 Create `compose.yaml` with `postgres:17` (port `54322:5432`, user/password/db `postgres`, named volume) and `fsouza/fake-gcs-server:1.56.1` (`-scheme http -port 4443 -public-host localhost:4443 -backend memory`, `./dev/gcs-data` mounted at `/data` holding an empty `buli-hub-stream-photos/` directory with a `.gitkeep`), per research.md R8
- [X] T002 Update `package.json` scripts: `db:start` = `docker compose up -d --wait`, `db:stop` = `docker compose down`, `db:reset` = new `scripts/db-reset.ts` (drop + recreate the local database named in `DATABASE_URL`, refusing any non-local URL via `src/test/local-database.ts`, then `drizzle-kit migrate`), add `db:move-from-supabase`; keep every other script
- [X] T003 [P] Update `.env.example`: remove `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_AUTH_EXTERNAL_DISCORD_*`; add `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DATABASE_SOCKET` (empty locally), `DATABASE_POOL_MAX`, `STORAGE_API_URL=http://localhost:4443`, `STREAM_PHOTOS_BUCKET=buli-hub-stream-photos`, `NEXT_PUBLIC_STREAM_PHOTOS_URL=http://localhost:4443/buli-hub-stream-photos`, `MAINTENANCE` (commented), `SUPABASE_DATABASE_URL` / `MOVE_TARGET_DATABASE_URL` (move script only); straight quotes only
- [X] T004 [P] Point `drizzle.config.ts` at `out: "./drizzle"` (no `supabase` prefix option; default numbered names) and update its comment

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the new schema and baseline, the database client, and a test suite that runs on plain Postgres. Nothing else can be built or tested before this.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Extract the authoritative FK list from a production-shaped database built with the old chain: every `pg_constraint` with `confrelid = 'auth.users'::regclass`, its table, column and `confdeltype`; record it in a comment block at the top of the `users` section of `src/db/schema.ts` and correct data-model.md's table if it differs (notably `placements.late_dropped_by_id`, `registration_windows.opened_by`, any `seedings` column)
- [X] T006 Add `users` (`id uuid primary key default gen_random_uuid()`, `discord_id text not null unique`, `created_at timestamptz not null default now()`) and `sessions` (`token_hash text primary key`, `user_id uuid not null references users(id) on delete cascade`, index on `user_id`, `created_at timestamptz not null default now()`, `last_seen_at timestamptz not null default now()`) to `src/db/schema.ts`; turn every column from T005 into `.references(() => users.id, { onDelete: … })` with the recorded rule; remove the comments that say the FK lives in a custom migration
- [X] T007 Move `supabase/migrations/` out of the way (deleted in T068), generate the new baseline with `npx drizzle-kit generate --name baseline` into `drizzle/`, review the SQL (no RLS, no grants, FKs to `users`)
- [X] T008 Author `npx drizzle-kit generate --custom --name closed_season_locks` in `drizzle/` with `reject_closed_regular_write` and its four triggers exactly as they stand after `20261011222757_season_completion_lock.sql`, plus any other non-Supabase SQL from the old custom migrations that `schema.ts` cannot express (partial indexes not expressible in Drizzle, checks); nothing that mentions `auth.`, `storage.`, `anon`, `authenticated`, RLS or policies
- [X] T009 Verify the baseline per research.md R6: build the old chain (from git, into a local database that has the Supabase schemas, e.g. a throwaway `supabase start` from the previous commit or a nightly backup restore) and the new baseline into two databases, `pg_dump --schema-only` both, normalize, diff; document the diff in research.md R6 as the allowed list (auth/storage schemas, RLS, policies, grants, FK target `public.users`, `users`, `sessions`) and fix anything else
- [X] T010 Update `src/lib/db.ts`: `postgres(DATABASE_URL, { host: process.env.DATABASE_SOCKET || undefined, max: Number(process.env.DATABASE_POOL_MAX) || 10 })`, drop `prepare: false` and its comment, rewrite the RLS sentence of the header comment (no RLS; authorization in server code)
- [X] T011 [P] ~~Create `src/test/users.ts`~~ Dropped while building: the tests keep their inline-SQL idiom, `insert into users (id, discord_id) values (${id}, ${id})` (the id string is a unique Discord id)
- [X] T012 Replace every `auth.users` write in the 38 integration test files (`grep -rl "auth\.users" src --include=*.test.ts`) with plain `users` SQL; the three that insert `raw_user_meta_data` (`bans/queries.integration.test.ts`, `discord-season/queries.integration.test.ts`, `membership/sweep.integration.test.ts`) insert `users.discord_id` instead
- [X] T013 [P] Remove the RLS/grant assertions that switch to `role anon` in `src/features/feedback/queries.integration.test.ts` (FR-013); keep the rest of the file
- [X] T014 [P] Update messages in `src/test/setup.ts` and `src/test/local-database.ts` (and the Supabase example strings in `local-database.test.ts`) to name the local Postgres from `npm run db:start`; **tighten** the guard: a local hostname is accepted only on port `54322` (the compose port), because after the move the Cloud SQL Auth Proxy exposes production on `127.0.0.1` too; tests for both
- [X] T015 Replace the Supabase CLI in the `checks` job of `.github/workflows/ci.yml` with a `postgres:17` service container on `54322`, a `npx drizzle-kit migrate` step, and no Supabase env vars; build step env gets `NEXT_PUBLIC_STREAM_PHOTOS_URL` and `DISCORD_CLIENT_ID` dummies
- [X] T016 `npm run db:start && npm run db:reset`, run the suite once to see the foundation compile and the untouched areas pass (failures in auth-dependent code are expected until US1/US2)

**Checkpoint**: schema, baseline and test harness on plain Postgres.

---

## Phase 3: User Story 1 - Everyone is still who they were (Priority: P1) 🎯 MVP

**Goal**: every rule that needs a Discord id reads `users.discord_id`; accounts are found by Discord id.

**Independent Test**: integration tests for bans, membership sweep, season sync inputs, favorites and replacements pass with `users` rows; quickstart §7 checks on staging.

### Tests for User Story 1 ⚠️

- [X] T017 [P] [US1] Integration test `src/features/auth/users.integration.test.ts`: `findOrCreateUserByDiscordId` returns the existing id for a known Discord id, creates a new row for an unknown one, never creates a second row for the same Discord id under concurrency (two parallel calls → one row), `discordIdOf(userId)` returns it
- [X] T018 [P] [US1] Adapt `src/features/bans/queries.integration.test.ts`, `src/features/discord-season/queries.integration.test.ts`, `src/features/membership/sweep.integration.test.ts`, `src/features/favorites/*.integration.test.ts`, `src/features/replacements/*.integration.test.ts` to assert the Discord id comes from `users.discord_id`

### Implementation for User Story 1

- [X] T019 [US1] Implement `src/features/auth/users.ts`: `findOrCreateUserByDiscordId(discordId)` (`insert … on conflict (discord_id) do update set discord_id = excluded.discord_id returning id`), `discordIdOf(userId)`
- [X] T020 [P] [US1] `src/features/bans/queries.ts`: replace the `userDiscordId` fragment over `raw_user_meta_data` with a join on `users` in `listBans`, `banCandidates`, `hubUserByDiscordId`, `bannedUserIds`, `discordIdOfUser`
- [X] T021 [P] [US1] `src/features/membership/queries.ts` `listRegisteredIdentities`: join `users` + `profiles` and build the `DiscordIdentity` from `users.discord_id` and the profile's `display_name`, `username`, `avatar_url`
- [X] T022 [P] [US1] `src/features/discord-season/queries.ts` `listPlacedPlayers`: Discord id from `users`
- [X] T023 [P] [US1] `src/features/favorites/queries.ts` `hubUserExists`: `select id from users`
- [X] T024 [US1] `grep -rn "auth\.\|raw_user_meta_data" src --include=*.ts --exclude=*.test.ts` finds nothing outside `src/features/move/` and the dev clone code handled in US6

**Checkpoint**: identity continuity in code; every Discord-id consumer reads `users`.

---

## Phase 4: User Story 2 - Signing in and out works as today (Priority: P1)

**Goal**: Discord sign-in with state and PKCE, revocable sessions, sign-out, sliding 30-day expiry, contracts/session.md.

**Independent Test**: quickstart §2 in the running app; unit and integration tests below.

### Tests for User Story 2 ⚠️

- [X] T025 [P] [US2] Unit tests `src/lib/auth/cookie-options.test.ts` (replaces `src/lib/supabase/cookie-options.test.ts`): with `AUTH_COOKIE_DOMAIN` → `gemeinde-auth`, domain, `Path=/`, `Lax`, `Secure`, `HttpOnly`, Max-Age 30 days; without → `buli-hub-auth`, host-only, `Secure` unless the base URL is `http://localhost…`
- [X] T026 [P] [US2] Unit tests `src/features/auth/session.test.ts`: token is 43 base64url chars and differs per call; hash is SHA-256 hex and stable; `sessionState(lastSeenAt, now)` → `valid` / `expired` exactly at 30 days; `needsRenewal` true only when older than one day
- [X] T027 [P] [US2] Unit tests `src/features/auth/discord.test.ts`: `pkceChallenge(verifier)` matches the RFC 7636 appendix B vector; `authorizeUrl` contains `response_type=code`, `scope=identify`, `state`, `code_challenge`, `code_challenge_method=S256`, the redirect URI; `discordIdentityFromDiscordUser` maps `global_name` → `username` fallback, avatar URL `https://cdn.discordapp.com/avatars/<id>/<hash>.png`, null avatar → null
- [X] T028 [P] [US2] Unit tests `src/features/auth/sign-in-error.test.ts`: only `cancelled` (`error=access_denied`) and `unknown`; `no_email` removed (FR-009)
- [X] T029 [P] [US2] Integration test `src/features/auth/sessions.integration.test.ts`: create → resolve returns user; `last_seen_at` older than a day is bumped on resolve, younger is not; 30 days old → null; `endSession` deletes one row only; `endAllSessionsForUser` deletes all of one user; `purgeExpiredSessions` deletes only expired rows; deleting the user cascades
- [X] T030 [P] [US2] Integration test `src/features/auth/sign-in.integration.test.ts` for `completeSignIn` (the callback's core, Discord calls injected): matching state → user found or created, profile synced (sync stubbed), session row created; mismatched or missing state → no session, `unknown`; `error=access_denied` → `cancelled`; a token-exchange failure → `unknown`

### Implementation for User Story 2

- [X] T031 [P] [US2] Create `src/lib/auth/cookie-options.ts` per contracts/session.md (pure, reads `AUTH_COOKIE_DOMAIN` and `APP_BASE_URL`); delete `src/lib/supabase/cookie-options.ts` and its test
- [X] T032 [P] [US2] Create `src/features/auth/session.ts` (pure, `node:crypto`): `newSessionToken`, `hashSessionToken`, `sessionState`, `needsRenewal`, `SESSION_MAX_AGE_DAYS = 30`
- [X] T033 [P] [US2] Create `src/features/auth/discord.ts` (pure): `newOAuthState`, `newCodeVerifier`, `pkceChallenge`, `authorizeUrl`, `discordIdentityFromDiscordUser`; and `src/features/auth/discord-api.ts`: `exchangeCode` (form-encoded `POST https://discord.com/api/oauth2/token` with `client_id`, `client_secret`, `code_verifier`), `fetchDiscordUser` (`GET https://discord.com/api/users/@me`)
- [X] T034 [US2] Create `src/features/auth/sessions.ts`: `createSession(userId)` (returns the token; also runs `purgeExpiredSessions`), `resolveSession(token)` (hash, join `users`, renew if needed), `endSession(token)`, `endAllSessionsForUser(userId)`
- [X] T035 [US2] Reduce `src/features/auth/identity.ts` to the `DiscordIdentity` type (remove `discordIdentityFromUser` and the `@supabase/supabase-js` import); update `identity.test.ts` accordingly or delete it if nothing remains
- [X] T036 [US2] Rewrite `src/features/auth/actions.ts`: `signInWithDiscord` (state + verifier into the `buli-hub-oauth` cookie, `Path=/auth/callback`, Max-Age 600, redirect to `authorizeUrl` with `redirect_uri = (APP_BASE_URL || origin) + "/auth/callback"`), `signOut` (`endSession` for this cookie, clear the cookie, `redirect("/")`)
- [X] T037 [US2] Rewrite `src/app/auth/callback/route.ts` as a thin wrapper around `completeSignIn` in `src/features/auth/sign-in.ts` (read and clear `buli-hub-oauth`, compare state, exchange, fetch user, `findOrCreateUserByDiscordId`, best-effort `syncMember`, `createSession`, set the session cookie, redirect to base; failures → `/?auth_error=<kind>`, raw reason logged)
- [X] T038 [US2] `src/features/auth/sign-in-error.ts`: drop `no_email`, classify from Discord's `error` param and the internal failure; remove the "no verified email" copy wherever the landing page renders it (`src/app/page.tsx` or its component)
- [X] T039 [US2] `src/features/roles/guard.ts` `currentUser()`: resolve the session via `resolveSession` (cookie through `cookies()`), identity = `users.discord_id` + profile fields; `getRole(userId, identity)` as before
- [X] T040 [US2] Replace `supabase.auth.getUser()` in `src/features/membership/actions.ts`, `src/features/profile/actions.ts`, `src/features/registration/actions.ts` (both call sites), `src/features/staff/actions.ts`, `src/app/page.tsx` with `currentUser()`; update the mock in `src/features/regelwerk/actions.integration.test.ts`
- [X] T041 [US2] `src/proxy.ts`: remove the Supabase client and `getUser()` refresh; re-send the session cookie with a fresh Max-Age when present; delete `sb-*-auth-token` and `sb-*-auth-token.<n>` cookies; keep `x-pathname` and staging `X-Robots-Tag`
- [X] T042 [US2] Delete `src/lib/supabase/` (server.ts, admin.ts, env.ts) once nothing imports it; `npx tsc --noEmit` clean for these areas
- [X] T043 [US2] Document the runbook command for ending an account's sessions (`delete from sessions where user_id = (select id from users where discord_id = '<id>')`) in `docs/deployment.md` (section "Sitzungen beenden")

**Checkpoint**: sign-in, sign-out, renewal, expiry and revocation work locally against a real Discord app (quickstart §2).

---

## Phase 5: User Story 3 - A rehearsed switch without data loss (Priority: P1)

**Goal**: maintenance mode (contracts/maintenance.md, approved mockup) and the verified transfer (contracts/switch-procedure.md).

**Independent Test**: quickstart §5 and §6 locally; §7 on staging.

### Tests for User Story 3 ⚠️

- [X] T044 [P] [US3] Unit tests `src/features/maintenance/mode.test.ts`: `maintenanceMode` true only for `MAINTENANCE=on`; `maintenanceRoute(path)` → `pass` for `/impressum`, `/datenschutz`, `/_next/static/…`, images and fonts; `json` for `/api/**`; `page` for everything else including `/auth/callback`, `/dev`, `/`
- [X] T045 [P] [US3] Unit tests `src/features/move/accounts.test.ts`: `auth.users` rows → `users` rows using `provider_id` then `sub`; rows without a Discord id are returned as a separate list; no email in the output
- [X] T046 [P] [US3] Unit tests `src/features/move/verify.test.ts`: equal inputs → ok; a count difference, a missing account, a changed Discord id, an extra account, a missing or differently sized photo each produce a named failure; report rows are sorted by table
- [X] T047 [US3] Integration test `src/features/move/load.integration.test.ts` (copies with `COPY … TO STDOUT` → `COPY … FROM STDIN` in Node, no pg_dump): in two local databases (source with an `auth.users`-shaped table and the hub's tables, target from the baseline), `loadIntoTarget` copies all rows with FKs dropped and re-added and user triggers disabled (a closed-season result survives the load), refuses a non-empty target, and `verifyTransfer` reports ok; an orphaned row makes the FK re-add fail

### Implementation for User Story 3

- [X] T048 [P] [US3] Create `src/features/maintenance/mode.ts` (pure) per contracts/maintenance.md
- [X] T049 [P] [US3] Build `src/features/maintenance/components/maintenance-page.tsx` per the approved `mockups/wartung.html` (landing anatomy, `<Tick size="s">`, copy verbatim, `DISCORD_INVITE_URL`, footer with Impressum and Datenschutz, system theme) and `src/app/wartung/page.tsx`
- [X] T050 [US3] In `src/proxy.ts`, first thing: when `maintenanceMode`, answer per `maintenanceRoute` (503 JSON with `Retry-After: 3600`, or rewrite to `/wartung` with status 503, `Retry-After: 3600`, `Cache-Control: no-store`); first verify that `NextResponse.rewrite(url, { status: 503 })` keeps the status in the running app, else serve the prerendered `/wartung` HTML (research.md R10)
- [X] T051 [US3] `src/app/layout.tsx`, `src/components/site-header.tsx` and `src/components/site-footer.tsx`: when `maintenanceMode`, render no `currentUser()`-dependent part (header user menu and nav, footer feedback link) and no `<CountPageLoad />`; check with the query log that `/impressum` and `/datenschutz` touch no database in that mode
- [X] T052 [P] [US3] Create `src/features/move/accounts.ts` and `src/features/move/verify.ts` (pure) per contracts/switch-procedure.md
- [X] T053 [US3] Create `src/features/move/load.ts`: `captureForeignKeys`, `dropForeignKeys`, `restoreForeignKeys` (from `pg_get_constraintdef`), `disableUserTriggers` / `enableUserTriggers`, `loadIntoTarget`, `readCounts`, `verifyTransfer`
- [X] T054 [US3] Create `scripts/move-from-supabase.ts` (orchestration only: preflight, `drizzle-kit migrate` on the target, accounts, `loadIntoTarget` (Node COPY between the two connections), photo copy with `gcloud storage cp` and `--cache-control="public, max-age=31536000"`, verification table, exit code), with `--dry-run` and `--reset-target` (typed confirmation of the database name); runs with `--import ./scripts/load-env.mjs --import ./scripts/src-alias.register.mjs`
- [X] T055 [US3] Write `docs/deployment.md` section "Umzug von Supabase": the switch for staging and production step by step (maintenance on, scheduler paused, script, verification, secrets and env switched, deploy, smoke check, maintenance off, scheduler resumed), abort path, and what stays untouched in Supabase

**Checkpoint**: maintenance and the move work locally between two databases.

---

## Phase 6: User Story 4 - Stream photos and the stream keep working (Priority: P2)

**Goal**: photos on Cloud Storage, same paths, URLs from the new base; stream API unchanged in shape.

**Independent Test**: quickstart §4 locally against fake-gcs-server.

### Tests for User Story 4 ⚠️

- [X] T056 [P] [US4] Unit tests `src/lib/gcs.test.ts`: the multipart body (boundary, JSON part with `name`, `contentType`, `cacheControl: "public, max-age=31536000"`, then the bytes); object names are URL-encoded in delete URLs (`/` → `%2F`); the emulator base skips the token
- [X] T057 [P] [US4] Update `src/features/stream-photos/photo.test.ts`, `src/features/stream-api/to-stream-match.test.ts` and `src/features/stream-api/queries.integration.test.ts` to the URL shape `<NEXT_PUBLIC_STREAM_PHOTOS_URL>/<path>`

### Implementation for User Story 4

- [X] T058 [P] [US4] Create `src/lib/gcs.ts`: `accessToken()` (metadata server, cached until shortly before expiry; none when `STORAGE_API_URL` is set), `uploadObject(bucket, name, bytes, contentType)` (multipart), `deleteObject(bucket, name)`
- [X] T059 [US4] Rewrite `src/features/stream-photos/storage.ts` on `src/lib/gcs.ts` with `STREAM_PHOTOS_BUCKET`; same limits, same best-effort delete
- [X] T060 [US4] `src/features/stream-photos/photo.ts` `streamPhotoUrl(path, base = process.env.NEXT_PUBLIC_STREAM_PHOTOS_URL)` → `${base}/${path}`; check the three client components that call it still receive the value
- [X] T061 [P] [US4] `src/features/dev/stream-photo.ts` (seed upload) on `src/lib/gcs.ts`

**Checkpoint**: upload, replace, remove and the stream API work against the emulator.

---

## Phase 7: User Story 5 - Backups keep running and cover everything (Priority: P2)

**Goal**: nightly backup against Cloud SQL plus photos; Cloud SQL's own backups documented.

**Independent Test**: one manual run of the workflow after the rehearsal, restored locally (quickstart §7).

- [X] T062 [US5] Create `.github/actions/cloud-sql-proxy/action.yml` (composite): download `cloud-sql-proxy` v2.26.2 for linux amd64, verify its SHA-256 (pinned in the file), start it in the background on `127.0.0.1:5432` for the given instance, wait until it accepts connections
- [X] T063 [US5] Rewrite `.github/workflows/backup.yml`: auth, the proxy action, `pg_dump --schema=public --schema=drizzle --no-owner` (users and sessions are in `public`; no auth tables), the not-empty check now on `INSERT`/`COPY` rows of `public.users`, `gcloud storage rsync gs://buli-hub-stream-photos gs://buli-hub-backups/stream-photos/` after the dump; comments rewritten (no Supabase)
- [X] T064 [US5] `docs/deployment.md` §4: Cloud SQL automated backups (7 days) and PITR, the nightly dump, the photo copy, and a restore walk-through into the local stack

**Checkpoint**: backups cover database and photos.

---

## Phase 8: User Story 6 - Development without Supabase (Priority: P3)

**Goal**: personas, impersonation, seed, clone, staging refresh and deploy work without Supabase.

**Independent Test**: quickstart §1 and §3.

### Tests for User Story 6 ⚠️

- [X] T065 [P] [US6] Update `src/features/dev/personas.test.ts` (no admin payload; each persona has a fixed Discord id), `src/features/dev/clone/scrub.test.ts` and `restore.test.ts` (no `auth.users`, no `supabase_admin`)

### Implementation for User Story 6

- [X] T066 [US6] `src/features/dev/personas.ts` and `src/features/dev/login.ts`: personas carry a Discord id; `loginAsPersona` upserts the `users` row by Discord id and the profile, creates a session and sets the cookie; `loginAsUser` (impersonation) creates a session for the chosen user id; remove `generateLink`, `verifyOtp`, `createUser`, `updateUserById` and email addressing; `src/features/dev/impersonation/queries.ts` lists `users` joined with `profiles`
- [X] T067 [US6] `src/features/dev/seed.ts`: seed users into `users` (no GoTrue columns, no `auth.identities`); the banned user's Discord id on `users`
- [X] T068 [US6] `scripts/clone-prod.ts`, `src/features/dev/clone/scrub.ts`, `src/features/dev/clone/restore.ts`: dump and restore `public` + `drizzle` only (accounts are in `public.users`); scrub rewrites `users.discord_id` for anonymised accounts (staff+ keep theirs) instead of auth metadata; drop the `supabase_admin` ACL stripping if nothing else needs it; messages name the Auth Proxy connection; delete `supabase/` (config.toml, migrations, `.gitignore`)
- [X] T069 [US6] `.github/workflows/staging-refresh.yml`: both ends through the proxy action (one instance, two databases), pg_dump 17 install kept, comments updated
- [X] T070 [US6] `.github/workflows/ci.yml` deploy job: the proxy action before `drizzle-kit migrate` (DATABASE_URL secrets now point at `127.0.0.1:5432`), build arg `NEXT_PUBLIC_STREAM_PHOTOS_URL` instead of the two Supabase ones, header comment updated (and its stale `staging.yml` reference fixed); `Dockerfile` build args and placeholders likewise (`SUPABASE_SECRET_KEY` placeholder removed)
- [X] T071 [P] [US6] Extend the `/dev/ui` gallery with the maintenance page (`src/features/dev/components/gallery.tsx`)

**Checkpoint**: from a fresh clone, setup, suite, personas, impersonation and clone work without Supabase.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T072 [P] `src/app/datenschutz/page.tsx` section 7: list "Google Cloud (Hosting der Anwendung, Datenbank und Speicher)," and "Discord (Anmeldung und Identität)."; remove Supabase; "Stand" stays "Oktober 2026" (FR-027)
- [X] T073 Remove `@supabase/ssr` and `@supabase/supabase-js` from `package.json` and the lockfile (`npm uninstall`), confirm no import remains
- [X] T074 `grep -rni supabase` over the repository: only backlink notes, legacy docs, frozen specs, `scripts/move-from-supabase.ts`, `src/features/move/` and the runbook's move section may remain (SC-007)
- [X] T075 `docs/deployment.md` §1, §2, §3, §6, §7: Cloud SQL instance, databases and roles (research R1, R2), buckets and the `allUsers` binding check (R7), IAM roles for the runtime and deployer service accounts, Secret Manager entries, Cloud Run flags (`--add-cloudsql-instances`, env vars), GitHub variables, Discord redirect URIs, clone and `usage:backfill` via Auth Proxy, staging on the shared instance, costs, the one-command tier upgrade
- [ ] T076 Constitution amendment via `/speckit-constitution` (maintainer approval): Principle I without the RLS line, Principle III's pinned stack, Principle II and the Workflow profile's "local Postgres", Running-app check with `npm run db:start`
- [X] T077 `CLAUDE.md`: architecture bullets (database, auth paragraph pointing at this spec, storage, RLS sentence removed), code layout, commands, environments, `/dev` tooling, stream photos and shared-login paragraphs; `.specify/templates/overrides/plan-template.md` and `tasks-template.md` Stack/Testing/migration path lines
- [X] T078 [P] Backlink notes `> Abgelöst in Teilen durch specs/004-google-cloud-migration (<Bereich>).` at the top of `specs/003-shared-discord-login/spec.md`, its `contracts/shared-session.md`, `docs/plans/discord-sign-in.md`, `docs/plans/stream-photos.md`, `docs/decisions/migrations-squash-at-launch.md`, and every other legacy plan found describing Supabase behavior
- [ ] T079 Biome, typecheck, full test suite green (ask the maintainer before running the suite)
- [ ] T080 Verify in the running app: sign-in, sign-out, personas, impersonation, photo upload, maintenance page and legal pages during maintenance, on desktop and phone width, light and dark, against the approved mockup
- [ ] T081 Run quickstart.md §1 to §6

---

## Phase 10: Rollout (after Gate 3 and the commit)

**Purpose**: plan.md "Rollout". Operational; each step is confirmed with the maintainer before it runs.

- [ ] T087 Ahead of the move: a commit with maintenance mode (`src/features/maintenance/`, `/wartung`, proxy, header, footer, layout, `currentUser()` short-circuit) and the scrub dropping `stream_photo_path`, built on the Supabase code of `main`; Gate approval, commit, `dev` → `main`; maintenance tried once on staging and production
- [ ] T082 Infrastructure per `docs/deployment.md`: Cloud SQL instance (db-f1-micro, `DATABASE_POOL_MAX=4`), databases and roles, buckets and `allUsers` check, IAM (staging gets its own runtime service account), secrets, Cloud Run flags for staging, Discord redirect URIs
- [ ] T083 Staging: refresh staging's Supabase from production (scrubbed), maintenance on for staging, `db:move-from-supabase` into the staging database and bucket, verification ok, push `dev` (deploys to staging on Cloud SQL), maintenance off
- [ ] T084 Rehearsal checks on staging: SC-001 to SC-004, real staff and player sign-in, one season sync with no changes, nightly backup run and local restore (SC-006); the staging role is refused when it connects to the production database (`psql` as `buli_hub_staging` on `buli_hub`); the time from maintenance on to maintenance off is recorded and stays under one hour (SC-003)
- [ ] T085 Production at a quiet time, with the maintainer: maintenance on, scheduler paused, move, verification ok; only then switch production's configuration (Cloud Run `--add-cloudsql-instances`, `DATABASE_URL` / `DATABASE_SOCKET` / `DATABASE_POOL_MAX` / `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` / `STREAM_PHOTOS_BUCKET`, GitHub PROD variable `NEXT_PUBLIC_STREAM_PHOTOS_URL` and secret `PROD_DATABASE_URL` in the Auth Proxy form), never earlier, because main's nightly backup and deploy still read them for Supabase; promote `dev` → `main`, smoke check, maintenance off, scheduler resumed, `dev` reset onto `main`
- [ ] T086 Afterwards: remove Supabase's callback from the Discord app, drop the Supabase GitHub variables and secrets; Supabase itself stays until the maintainer deletes it

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)**: blocks everything.
- **US1 (Phase 3)** before **US2 (Phase 4)**: sign-in uses `findOrCreateUserByDiscordId`.
- **US2** before **US3**, **US4**, **US6**: `src/lib/supabase/` can only go once auth is replaced, and the proxy changes in US2 and US3 touch the same file (US3 adds maintenance on top).
- **US4** and **US5** are independent of each other after US2; **US6** after US2 (dev login creates sessions) and after US4 (seed photo upload).
- **Polish (Phase 9)** after all stories; **Rollout (Phase 10)** after Gate 3 and the commit.

### Within Each User Story

- Tests first, failing; pure functions before queries; queries before actions and routes.

### Parallel Opportunities

- Phase 1: T003, T004.
- Phase 2: T011, T013, T014 alongside T005 to T010.
- US1: T020 to T023 together after T019.
- US2: T025 to T030 together; T031 to T033 together.
- US3: T044 to T046 together; T048, T049, T052 together.
- US4: T056, T057 together; T058 and T061.
- Polish: T072, T078.

---

## Parallel Example: User Story 2

```bash
Task: "Unit tests src/lib/auth/cookie-options.test.ts"
Task: "Unit tests src/features/auth/session.test.ts"
Task: "Unit tests src/features/auth/discord.test.ts"
Task: "Integration test src/features/auth/sessions.integration.test.ts"

Task: "Create src/lib/auth/cookie-options.ts"
Task: "Create src/features/auth/session.ts"
Task: "Create src/features/auth/discord.ts and discord-api.ts"
```

---

## Implementation Strategy

### MVP

There is no partial release: the hub either runs on Supabase or on Google Cloud. The MVP is
Phases 1 to 5 (foundation, identity, sign-in, maintenance and move), which is what a production
switch strictly needs; US4 to US6 complete the feature and ship in the same commit.

### Delivery

1. Phases 1 to 9 locally, verified with quickstart §1 to §6.
2. `/speckit-converge`, `/speckit-gemeinde-ship`, Gate 3, one commit on `dev`.
3. Phase 10: staging move and rehearsal, then production.

---

## Notes

- [P] tasks = different files, no dependencies
- Ask the maintainer before every full test run (the suite wipes the local database)
- No commit before Gate 3
