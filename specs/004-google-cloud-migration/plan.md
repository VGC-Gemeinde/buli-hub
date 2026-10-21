# Implementation Plan: Umzug von Supabase auf Google Cloud

**Date**: 2026-10-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-google-cloud-migration/spec.md`

## Summary

The hub stops using Supabase. Its database moves to Cloud SQL for PostgreSQL 17 (one instance,
production and staging as separate databases), sign-in with Discord is built into the hub
(authorization code with state and PKCE, sessions in a `sessions` table behind an opaque httpOnly
cookie), and stream photos move to a public Cloud Storage bucket under the same paths. A new
`users` table with a real `discord_id` replaces `auth.users`; every account keeps its id, so all
data stays attached. The migration chain restarts from a new baseline without RLS or Supabase
roles. A maintenance switch (an env var, no release) shows the approved page on every route while
a scripted, verified transfer moves the data; the transfer is rehearsed on staging first. Local
development and CI run on plain Postgres in Docker, with a GCS emulator for photos. No dependency
is added; the two Supabase packages are removed.

## Technical Context

**Stack**: Next.js App Router + TypeScript, **Postgres on Cloud SQL (was Supabase), the hub's own
Discord sign-in (was Supabase Auth), Cloud Storage (was Supabase Storage)**, Drizzle ORM, Zod,
Tailwind CSS + shadcn/ui. New dependencies: none. Removed: `@supabase/ssr`,
`@supabase/supabase-js`. The stack change itself was discussed and decided with the maintainer on
2026-10-21 (Principle III).

**Testing**: Vitest unit tests (domain logic), Vitest integration tests against the local Postgres
in Docker (was the local Supabase stack). No E2E.

**Target**: Cloud Run container with the built-in Cloud SQL connection; desktop and phone
browsers, light and dark mode.

**Affected areas**:
- `auth`: sign-in, callback, sign-out, identity mapping, sessions, users (rewritten).
- `roles` (`currentUser`, `syncMember`): identity now from `users` + `profiles` + Discord at sign-in.
- `bans`, `membership`, `discord-season`, `favorites`, `replacements`: read `users.discord_id`
  instead of `auth.users.raw_user_meta_data`.
- `stream-photos`, `stream-api`: storage calls and URL base.
- `dev`: personas, impersonation, seed, clone/scrub without GoTrue.
- `maintenance` (new): mode, routing decision, page.
- `move` (new): the transfer's pure parts (account mapping, FK capture, verification).
- `src/proxy.ts`, `src/app/layout.tsx`, `src/lib/db.ts`, `src/db/schema.ts`, the migration chain,
  38 integration test files, CI and backup workflows, Docker, docs.

**Reused building blocks**: `syncMember` / `getRole` (role and guild identity), `classifySignInError`
categories, `devToolsEnabled()`, `authorizeBearer`, `germanToday`/`formatGermanDateTime` (runbook
output), `STREAM_PHOTO` limits and `validateStreamPhoto`, the clone pipeline (`scrub`, `shift`),
the landing page anatomy and `<Tick>` for the maintenance page, `DISCORD_INVITE_URL`.

**Legacy context read**: `docs/plans/discord-sign-in.md` (callback shape),
`docs/plans/stream-photos.md`, `docs/decisions/migrations-squash-at-launch.md` (baseline
precedent and its verification), `docs/deployment.md` §1, §2, §4, §6, §7, §8, `specs/003-shared-discord-login/`
(session contract, superseded here).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design: unchanged.*

| Principle | Status | How |
|---|---|---|
| I. Pure, server-side logic | Pass, with amendment | Every rule is a pure, unit-tested function: PKCE and state, token hashing and session validity, Discord identity mapping, cookie options, maintenance routing, account mapping and verification of the move. Authorization stays in server code. **"RLS policies are still defined as defense in depth" no longer applies**: without Supabase's data API only the hub reaches the database, as one role. Amended in this feature (see Complexity Tracking, Documentation Impact). |
| II. Tests carry the weight | Pass | Unit tests for every pure function above; integration tests for users, sessions (create, resolve, renew, expire, revoke), the callback flow with Discord's endpoints stubbed, the rewritten queries (bans, membership, season sync, favorites), the move's load-and-verify against two local databases. The non-local guard stays; its messages change from "Supabase stack" to "local Postgres". |
| III. Boring tools | Pass | Decided stack change with the maintainer. No new npm dependency; Postgres, Cloud Storage and `fetch`. Tools outside npm (Docker, Cloud SQL Auth Proxy, gcloud) are pinned. |
| IV. Schema is code | Pass, with justified squash | New baseline: generated migration from `schema.ts` plus one `--custom` migration for the trigger function. Breaks append-only once, on the go-live precedent (Complexity Tracking). Ships in the same commit as the code. |
| V. Look and UX | Pass | One new view, mockup approved at Gate 1. Light and dark, desktop and phone. `/dev/ui` gains the maintenance page; `/dev` personas change shape (no GoTrue metadata, a Discord id per persona). |
| VI. League voice, German time | Pass | Maintenance and privacy copy as approved, straight quotes, no em dash. No new clock. |
| VII. Spoiler protection | Pass | No change to embargo or projections. The stream API's shape is unchanged; during maintenance it returns 503 and leaks nothing. |
| Architecture constraints | Pass | One deployable. `DISCORD_CLIENT_SECRET`, database password and tokens stay server-side. `/dev` route handlers keep `devToolsEnabled()`. Jobs stay bearer-authorized and idempotent. |

## Project Structure

### Documentation (this feature)

```text
specs/004-google-cloud-migration/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/
│   ├── session.md            # cookie, lifecycle, sign-in flow (supersedes 003's contract)
│   ├── maintenance.md        # switch, routing, page
│   └── switch-procedure.md   # the move script and its verification
├── mockups/wartung.html      # approved at Gate 1
└── tasks.md                  # /speckit-tasks
```

### Source Code (repository root)

```text
src/db/schema.ts                          # + users, sessions; 30 FKs → users(id)
drizzle/                                  # new baseline (replaces supabase/migrations/)
drizzle.config.ts                         # out: ./drizzle
compose.yaml                              # postgres:17 + fake-gcs-server:1.56.1

src/lib/db.ts                             # DATABASE_SOCKET, DATABASE_POOL_MAX, no prepare:false
src/lib/auth/cookie-options.ts            # (moved from lib/supabase) + test
src/lib/gcs.ts                            # access token, multipart upload, delete; + test
src/lib/supabase/                         # removed

src/features/auth/
├── discord.ts / discord.test.ts          # pure: PKCE, state, authorize URL, identity from /users/@me
├── discord-api.ts                        # token exchange, /users/@me (fetch)
├── session.ts / session.test.ts          # pure: token, hash, validity, renewal
├── sessions.ts                           # create, resolve, renew, end, endAllForUser, purgeExpired
├── users.ts                              # findOrCreateByDiscordId, discordIdOf
├── *.integration.test.ts                 # users, sessions, callback flow (Discord stubbed)
├── identity.ts                           # DiscordIdentity type stays; Supabase mapper removed
├── sign-in-error.ts                      # "no_email" category removed
└── actions.ts                            # signInWithDiscord, signOut
src/app/auth/callback/route.ts            # rewritten

src/features/maintenance/
├── mode.ts / mode.test.ts                # maintenanceMode(env), maintenanceRoute(path) → page | json | pass
└── components/maintenance-page.tsx       # the approved page
src/app/wartung/page.tsx                  # internal route the proxy rewrites to
src/proxy.ts                              # maintenance, cookie refresh, legacy cleanup; no Supabase
src/app/layout.tsx                        # skips DB-touching parts in maintenance

src/features/roles/guard.ts               # currentUser() from the session
src/features/{bans,membership,discord-season,favorites,replacements}/queries.ts  # users.discord_id
src/features/stream-photos/{storage,photo}.ts  # GCS; URL base from NEXT_PUBLIC_STREAM_PHOTOS_URL (build arg: three client components call it)
src/features/dev/{login,personas,seed}.ts, dev/impersonation/queries.ts, dev/clone/{scrub,restore}.ts
src/features/dev/components/gallery.tsx   # + maintenance page

src/features/move/
├── accounts.ts / accounts.test.ts        # auth.users rows → users rows, missing Discord ids
├── verify.ts / verify.test.ts            # compare counts, accounts, photos → report
├── load.ts                               # COPY between two connections, FKs dropped and re-added
├── photos.ts / photos.test.ts            # parse `gcloud storage ls -l`
└── load.integration.test.ts              # load + verify between two local databases
scripts/move-from-supabase.ts             # orchestration (drizzle-kit, load, gcloud storage, verify)
scripts/clone-prod.ts                     # Cloud SQL source, no auth tables

38 integration test files                 # inline `insert into users (id, discord_id)` instead of auth.users
src/test/local-database.ts                # guard tightened: localhost on port 54322 only
scripts/db-reset.ts                       # replaces `supabase db reset`

src/app/datenschutz/page.tsx              # section 7 copy
Dockerfile, package.json, .env.example
.github/workflows/{ci,backup,staging-refresh}.yml, .github/actions/cloud-sql-proxy/action.yml
supabase/                                 # removed
```

## Schema & Migrations

See [data-model.md](data-model.md). New tables `users` and `sessions` in `schema.ts`; the 29 FKs
that pointed at `auth.users` point at `users(id)` with the same delete rules, in the custom
migration like every other FK.
No RLS, no policies, no grants, no `storage.buckets`.

The chain restarts (research R6): `supabase/migrations/` (41 files + journal) is replaced by
`drizzle/` with a generated baseline and one custom migration
(`drizzle-kit generate --custom --name constraints`) holding every FK, the check and the index
Drizzle does not express, and `reject_closed_regular_write` with its four triggers. Verification: normalized
`pg_dump --schema-only` of old chain vs. new baseline, only the listed differences allowed.

Production does not "migrate" to the baseline: it is created fresh from it and filled by the move
(research R5, contracts/switch-procedure.md). From the first deploy on Cloud SQL the chain is
append-only again.

## Authorization & Visibility

- Sign-in, callback and sign-out are public routes; they only ever act on the browser's own
  session. The callback trusts nothing it did not create: `state` must match the cookie it set,
  the code is exchanged with the matching PKCE verifier.
- `currentUser()` is the single resolver, as before; every Server Action that acted on
  `supabase.auth.getUser()` now acts on it. Roles, bans and guild membership decide exactly what
  they decided before.
- Ending sessions for an account is a runbook command, no UI (clarification).
- `/dev` login and impersonation create a session directly, behind `devToolsEnabled()` in every
  route handler, as today; never reachable in production.
- During maintenance nobody gets past the proxy except to `/impressum`, `/datenschutz` and static
  assets.
- No change to embargo, spoiler protection or the public projections.

## Discord Touchpoints

- **Discord application settings** (not code): add the hub's callback URLs, later remove
  Supabase's. Same app, same client id and secret.
- **Bot calls**: unchanged. Role sync, season sync and membership sweep get the Discord id from
  `users` instead of auth metadata; they must make no change on the server they would not have
  made before (US1 scenario 4). Their only input from the move is the Discord id per account,
  which the verification compares one to one; in the rehearsal one season sync run against the
  test server after the move must report no created, changed or deleted object.
- No new messages. The maintenance is announced by staff by hand.

## Routes, Navigation & Staff Integration

- `/auth/callback`: rewritten, same URL. `/wartung`: internal, only reached through the proxy's
  rewrite during maintenance; no navigation entry.
- No section, row or `staffNav` change. No staff todo.
- Stream API: same routes and shape; `streamPhotoUrl` now returns
  `https://storage.googleapis.com/buli-hub-stream-photos/<path>`; 503 JSON during maintenance.
  gemeinde-streams needs no change (it loads URLs as given); its maintainers are told the host
  changes.

## Rollout

0. **Ahead of the move** (decided 2026-10-21, found while writing the runbook): the revisions
   running on Supabase must already honor `MAINTENANCE=on`, or the move would run with the hub
   open. Maintenance mode therefore ships first, as its own small commit on the Supabase code,
   together with the scrub change that drops stream photo paths from clones (staging's profiles
   would otherwise point at photo files that only production's bucket holds). It goes `dev` →
   `main` like any release and is tried once on staging and production.
1. **Infrastructure** (runbook, before the code ships): Cloud SQL instance, both databases and
   roles, both buckets (check the `allUsers` binding, R7), IAM for runtime and deployer service
   accounts, Secret Manager entries (`DATABASE_URL`, `DISCORD_CLIENT_SECRET`), Discord redirect
   URIs.
2. **Code** lands on `dev` as one commit (after Gate 3). The staging deploy at that point
   switches staging to Cloud SQL, so the staging move runs right before that push: refresh
   staging's Supabase from production (scrubbed), maintenance on for staging, move, verify, push,
   maintenance off.
3. **Rehearsal checks** on staging: SC-001 to SC-004, sign-in with real staff accounts (the scrub
   keeps staff identities), one season sync run that changes nothing, nightly backup triggered and
   restored locally (SC-006).
4. **Production** at a quiet time: maintenance on (production still on the old revision), move,
   verify, promote `dev` → `main` (the deploy brings the new code and switches to Cloud SQL),
   smoke check that the revision is up, maintenance off. Abort before the promotion = remove
   maintenance, nothing changed (FR-020).
5. **Afterwards**: Supabase stays untouched until the maintainer deletes it; remove Supabase's
   callback from the Discord app; drop the Supabase GitHub variables and secrets.

The order "move, then deploy" matters: the new code cannot run against Supabase, and the old code
cannot run against Cloud SQL. Maintenance covers the gap; the deploy's own migrate step finds the
baseline already applied and does nothing.

## Documentation Impact

- **Constitution** (amendment via `/speckit-constitution`, MINOR): Principle I drops the RLS line;
  Principle III's pinned stack names Cloud SQL, Cloud Storage and the hub's own Discord sign-in
  instead of Supabase; Principle II and the Workflow profile say "local Postgres" instead of "local
  Supabase stack"; the Running-app check names `npm run db:start`.
- **CLAUDE.md**: architecture section (Supabase bullet replaced; auth paragraph rewritten against
  this spec; RLS sentence removed), code layout, commands (`db:start`, `db:reset`, the Auth Proxy
  for clone), environments, `/dev` tooling, the stream photos and shared login paragraphs; the
  plan template override's Stack and Testing lines.
- **docs/deployment.md**: §1 Supabase → Cloud SQL and Cloud Storage setup; §2 secrets; §4 backups
  (Cloud SQL backups and PITR + nightly dump + photos); §6 clone via Auth Proxy; §7 staging on the
  shared instance; new section "Umzug von Supabase" (the switch runbook, kept as history after the
  move); sessions runbook command.
- **Backlinks** (`> Abgelöst in Teilen durch specs/004-google-cloud-migration (<Bereich>).`):
  `specs/003-shared-discord-login/spec.md` and its contract, `docs/plans/discord-sign-in.md`,
  `docs/plans/stream-photos.md`, `docs/decisions/migrations-squash-at-launch.md`, and any other
  legacy plan the build finds describing Supabase behavior.
- **design/DESIGN.md**: none (the maintenance page reuses the landing anatomy).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Principle I: RLS no longer defined | RLS existed against Supabase's public data API; without it only the hub, as one role, reaches the database, and policies on `auth.uid()` cannot even be expressed | Rebuilding RLS with custom roles protects nothing the server code does not already decide; decided by the maintainer 2026-10-21; amended in the constitution |
| One feature, two commits | Maintenance mode must be live on the Supabase revisions before the move; it cannot arrive with the code that needs the move | Cloud Run ingress `internal` during the move: no writes either, but visitors see Google's error page instead of the approved one; rejected by the maintainer |
| Principle IV: migration chain restarts | The old chain cannot run on Postgres without Supabase's schemas and roles, and production is created fresh | Shim `auth`/`storage` schemas and Supabase roles would carry Supabase forever; go-live precedent |
