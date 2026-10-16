# Buli Hub — Project Context

AI-assisted development context file: the architecture map, commands and environments. The rules every change follows are the constitution, imported below.

## What this project is

Buli Hub is the tournament platform for the **VGC Bundesliga**, an online league run by the VGC Gemeinde (the largest German-speaking VGC / Pokémon community). Users are players and admins/organizers. Community coordination happens on Discord; the web UI is the primary interface.

**All domain decisions (league structure, match formats, rules, data model) are made in a feature's spec (`specs/`), never in this file.** This file covers the technical base and the map of what exists.

## Rules

@.specify/memory/constitution.md

The constitution (`.specify/memory/constitution.md`) holds every rule a change follows: architecture principles, testing, look and UX, copy, German time, spoiler protection, the feature process with its gates, and the Definition of Done. It applies to every change, also to bug fixes outside the Spec Kit flow. It is amended only through `/speckit-constitution` with the maintainer's approval; this file must not contradict it.

## Architecture (pinned — do not change without discussion)

One deployable: a full-stack **Next.js** app. No separate backend service, no persistent Discord bot process.

- **Next.js (App Router) + TypeScript** — frontend and backend in one app
  - Server Components for data-driven pages
  - Server Actions for mutations
  - Route Handlers only where an HTTP URL is required (e.g. Cloud Scheduler targets)
- **Supabase** — Postgres, Auth, Storage
  - Auth via **Discord OAuth provider** (all users have Discord accounts; Discord ID lives in user metadata)
  - Local development runs against **Supabase CLI** (`supabase start`, Dockerized local stack)
- **Drizzle ORM** (pinned) — schema defined in TypeScript (`schema.ts`), SQL migrations generated and committed to the repo. Drizzle connects directly to Postgres, so **RLS is bypassed for app queries: authorization checks live in server code (Server Actions)**. RLS policies are still defined as a defense-in-depth safety net.
- **Zod** — validation, schemas shared between server and forms
- **Tailwind CSS + shadcn/ui** — UI layer
- **Team sheets** — the league runs **Pokémon Champions**; teams are built in Showdown. The hub is its own paste service: every reported sheet is parsed, validated as a complete open team sheet, stripped of stats and published at `/pastes/<uuid>` (`src/features/teamsheets/`). Parsing/serialising is `@pkmn/sets` (no game data, so it cannot go stale); `@pkmn/dex` and `@pkmn/img` are display-only (mega resolution, sprite ids, nature arrows), so a dex gap can never reject a submission. Sprites come from a public GCS bucket with a Showdown-CDN fallback. Details: `docs/plans/teamsheet-pastes.md`.
- **Usage statistics** — the hub counts its own page loads (`src/features/usage/`, page at `/staff/nutzung` for admin+): the root layout renders `<CountPageLoad />`, which turns the request into a per-period salted hash folded into a HyperLogLog sketch and a counter in Postgres. Aggregates only, no per-request rows, no identifiers stored; `src/proxy.ts` passes the pathname along as `x-pathname` for it. History before the feature shipped is replayed once from Cloud Run logs (`npm run usage:backfill`). Details: `docs/plans/usage-stats.md`.
- **Result embargo** — a reported result the hub deliberately keeps from the public for a while, one rule with two reasons (`src/features/spoilers/embargo.ts`): the **Match of the Week** until its VOD is attached (`docs/plans/motw-result-embargo.md`), and a **recording hold** (`src/features/recordings/`, page at `/staff/aufnahmen`) while staff record a match for the Gemeinde stream, until they release it (`docs/plans/recording-holds.md`). Staff and the two participants see an embargoed result marked as not public; everyone else never receives it, and Discord posts nothing until it is released. An embargoed result also does not count in the **public standings** (`docs/plans/standings-embargo.md`): a table that counts it hands the result to anyone who compares it with the Spielplan. The table is never personalised, so staff and participants see the public one too; the true tally stays in `windowPlayerForm` (MotW picker) and the stream API.
- **Match of the Week** (`src/features/motw/`, page at `/staff/motw`) — per Spieltag staff nominate a Hauptkandidat and backups and confirm afterwards which one it was (`docs/plans/motw-candidates.md`). A candidate *is* a recording: candidacy is a role on the `recording_holds` row, so every candidate is withheld under the recording reason and released under Aufnahmen, and `motw_selections` means exactly one thing, the confirmed match. The public billboard features the most recently confirmed match, so it carries the previous week until the new one is confirmed. The MotW workspace never ends an embargo: revoking or replacing a confirmation puts the match back under a hold.
- **Player replacement** (`src/features/replacements/`) — a dropped player's slot taken over by someone who was not in the season: staff offer it with an entry round, the offered user accepts on `/spieler` with the registration questions, and the slot's matches from that round on move to them. From then on the slot is one table row, the replacement's, carrying the earlier rounds as the drop losses they are; the replaced player leaves every table. Standings get this from `groupResults` / `groupStandingsInput`, so a new standings consumer inherits it by loading through them. Details: `docs/plans/player-replacement.md`.
- **Banliste** (`src/features/bans/`, page at `/staff/banliste`) — Discord accounts barred from registering for future seasons, by hub user or by Discord-ID for people who never signed in. A ban is keyed on the Discord id, never on a hub user id, and blocks every way into a season (`register()`, replacement offers and acceptance); nothing else changes for the player, and the ban is visible to staff only. Before a ban goes through, conflicts in the current season (registration, placement, open replacement offer) are shown with links to resolving them, or must be explicitly acknowledged. Details: `docs/plans/banlist.md`.
- **Favoriten** (`src/features/favorites/`, page at `/favoriten` in the Liga row) — a signed-in user's private list of players to follow: their week, place, record and form on one page, and a star before their names in tables and match rows. Built on the public overview's projection (`publicLeagueOverview`), so it counts exactly what the public tables count. Spoiler protection as everywhere; only the running week's result is covered on the page, and Platz and Bilanz are covered with it there. Details: `docs/plans/favorites.md`.
- **Relegation und Playoffs** — what follows the last Spieltag (`docs/plans/relegation-and-playoffs.md` holds the rules, one plan per slice beside it). No umbrella term in UI or code: Relegation (`src/features/relegation/`, page `/relegation`) and the Division-1 Playoffs (`src/features/playoffs/`, page `/playoffs`) are separate things, tiebreakers belong to the regular season. Pairings are drawn between seats (a table plus a place in a played zone, `src/features/final-table/`), never between players, with Postgres-drawn lots (`placements.lot_number`, `sub_divisions.lot_number`) for equal ranks, so they are a pure function of the standings and nothing is ever redrawn. Their matches live in `matches` with `stage` and no sub-division (only regular matches have one, which keeps every other kind out of the standings); players stay null until staff publish, and `resolveRelegationPlayoffs` (`src/features/playoffs/progression.ts`) is the one source for who plays each side and how it ends, written into the matches by `syncSeats`. Their weeks are `matchdays` with `regular = false`: `matchdaysForWindow` is the regular Spieltage only, `allMatchdaysForWindow` every week. Publishing (`registration_windows.regular_season_closed_at`) makes regular results final and completing (`season_completed_at`) every result, enforced by the actions (`resultLockError`) and by the trigger `reject_closed_regular_write`; the season outcome is written onto `placements`. The flow lives on its own staff page `/staff/relegation-playoffs` (four steps: create the schedule, publish, play, complete); Discord gets a role and chat channel per stage through the season sync's rooms. The stream API carries their played matches with `stage`, `weekName` and `roundLabel`.
- **Site navigation** — the header is the same on every page and never collapses: each page passes the `section` it belongs to (Liga, Spieler-Dashboard, Staff-Bereich), whose entry becomes a tab running into that section's row (`sectionRow`, `src/features/navigation/`); a detail page (match, player profile, teamsheet) marks its section and no row entry, and carries its own `BackLink` ("← Zurück") in the content. No breadcrumbs. A new page picks its section; a new section page adds its row entry. Details: `docs/plans/site-navigation.md`, `design/NAVIGATION.md`.
- **Staff-Bereich** — every staff page is a `StaffPage` (`src/features/staff/components/staff-page.tsx`) in the Staff-Bereich section; its row's entries per phase and role come from the pure `staffNav` (`src/features/staff/nav.ts`). The overview `/staff` shows concrete problems as todos (the pure `staffTodos`) and everything normal as numbers; full lists live on subpages (`/staff/woche`, `/staff/teilnehmer`, …). A staff workspace that pages through Spieltage uses the shared `StaffWeekPager` (`src/features/staff/components/staff-week-pager.tsx`) with its own marks. A new staff page adopts the shell and adds its entry to `staffNav`; a new problem staff must act on becomes a todo, not a card. Details: `docs/plans/staff-dashboard.md`, `design/STAFF-DASHBOARD.md`.
- **Stream photos** — the picture the stream shows next to a player, uploaded and cropped by the player in `/profil` and stored in the Supabase Storage bucket `stream-photos` (`src/features/stream-photos/`). Offered only to the players a stream is about to show (Match of the Week, recording holds); staff see who has one in their workspaces and can take one down. Deliberately separate from the Discord avatar: the avatar is what the hub shows on its own pages, the photo is what the stream shows, and neither substitutes for the other. Details: `docs/plans/stream-photos.md`.
- **Discord integration** — no bot service. The Next.js backend calls the **Discord REST API directly with a bot token** (messages, embeds, threads, and since the season setup also roles, channels and permission overwrites). Token comes from secret management, never from client code. Season-scoped Discord objects the hub creates are tracked by id in `discord_season_resources` (`src/features/discord-season/`), and the server is kept converged onto the season by a periodic sync rather than by hooks in every action.
- **Scheduled jobs** — Google **Cloud Scheduler** invoking route handlers under `src/app/api/jobs/`, authorized by a shared secret (`Authorization: Bearer <JOBS_SECRET>`, checked by `authorizeBearer` in `src/lib/bearer.ts`; 503 without a configured secret). Jobs are idempotent converges, so an overlapping or repeated run is harmless. The first one is the Discord season sync (`docs/plans/discord-season-setup.md`); per-environment job setup lives in `docs/deployment.md` §8.
- **Hosting** — Docker container on **Google Cloud Run**, scale-to-zero
- **Stream API** — read-only route handlers under `src/app/api/stream/` for the stream backend (`../gemeinde-streams`): the played matches of the current season with team sheets and avatars (`src/features/stream-api/`). Authorized by its own shared secret (`Authorization: Bearer <STREAM_API_SECRET>`, `authorizeBearer`), never reached from a browser, and deliberately free of spoiler protection: the caller is the stream that shows the match. Details: `docs/plans/stream-api.md`, setup in `docs/deployment.md` §9.
- **Tooling** — **npm** (package manager), **Biome** (lint + format)
- **Dependencies** — **exact version pinning** (`save-exact=true` in `.npmrc`, no `^`/`~` ranges), committed lockfile. Automated updates via **Renovate** (`renovate.json`, weekly, grouped minor/patch), gated by CI.
- **Three environments** — local (Supabase CLI), **staging** (`buli-hub-staging` on Cloud Run + its own Supabase project, deployed from `dev`), and production (deployed from `main`). Staging exists to meet production-shaped data and rehearse migrations before production does; its database is refreshed on demand from production, never automatically. Full runbook: `docs/deployment.md` §7.
- **CI/CD** — `.github/workflows/ci.yml`: every push/PR runs Biome, typecheck, the full test suite against a Supabase CLI stack, and a production build. Pushes to `main` **and** `dev` then build the image, apply migrations (`drizzle-kit migrate`) and deploy — the same job, with `environment:` selecting `PROD` or `STAGING`, so the two cannot drift. Every `main` commit ships to production. `.github/workflows/staging-refresh.yml` clones production into staging, manual trigger only. One-time infrastructure setup lives in `docs/deployment.md`.

The feature paragraphs above are the **living map** of the hub: each says what exists now and where its record lives. A feature that ships adds or updates its paragraph and points it at its spec (`specs/NNN-…/`); a paragraph that still points at `docs/plans/` describes a feature built before Spec Kit.

## Code layout

Code is organized by feature (vertical slice), not by layer:

```
src/
  features/
    <feature-name>/   # components, actions, logic, tests for this feature
    ...
  lib/                # genuinely shared: db client, discord.ts, auth helpers
  db/
    schema.ts         # Drizzle schema stays central (tables cross features)
  app/                # Next.js routes — thin wrappers importing from features/
scripts/              # maintenance entry points, run via `node scripts/<x>.ts`
```

`scripts/` holds orchestration only (spawning `pg_dump`, `psql`, `drizzle-kit`). Anything with logic worth testing lives under `src/features/` as a pure function and is imported from there — Node 24 runs TypeScript directly, so scripts need no build step and no extra dependency. Node does not resolve the `@/` alias or extension-less imports on its own, so a script that imports feature code which in turn imports `@/lib/db` or `@/db/schema` runs with `--import ./scripts/load-env.mjs --import ./scripts/src-alias.register.mjs` (`.env` loaded before any module evaluates, plus a 30-line resolve hook; see `usage:backfill` in `package.json`). A script's own `process.loadEnvFile` is too late for modules with import-time env guards such as `src/lib/db.ts`. Import-free pure modules, like the clone helpers, need nothing.

## Documentation layout

Why there are both `specs/` and `docs/plans/`: features were planned in hand-written plans until 2026-10-16; since then they go through GitHub Spec Kit, which keeps one directory per feature. The old plans were not migrated, because code comments link them and they remain the best record of how the existing behavior came to be.

- **`specs/NNN-feature/`**: one directory per feature since Spec Kit (`spec.md`, `mockups/`, `plan.md`, `research.md`, `tasks.md`, …). Frozen when the feature ships; history, not a living document.
- **`docs/plans/`**: **legacy.** Plans of every feature built before Spec Kit. Read as history; nothing new is added. A plan whose content a later spec supersedes carries a backlink note at its top.
- **`docs/decisions/`**: **legacy.** Cross-feature decisions from before Spec Kit; the rules from them now live in the constitution. New cross-feature decisions are constitution amendments.
- **`design/<FEATURE>.md`**: **legacy** design hand-offs from the time a designer polished features after a first build (`NAVIGATION.md` and `STAFF-DASHBOARD.md` included; the code they shaped is the current anatomy). Feature design now happens in the spec's mockups. `design/go-live/*.dc.html` and `design/REGELWERK.reference.html` are records of what was handed off.
- **Living documents**: this file, the constitution, `design/DESIGN.md` (the design system; a new cross-feature anatomy is added here) and `docs/deployment.md` (the runbook).

Precedence when documents disagree: code and tests, then the newest spec, then older specs and legacy documents.

## Spec Kit

- **CLI pinned** to `specify-cli` 1.1.3: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.1.3` (needs `uv`). Upgrades are deliberate: bump the tag here, run `specify init --here --force --integration claude`, review the diff.
- **Generated, do not edit:** `.claude/skills/speckit-*` and `.specify/templates/*.md`, `.specify/scripts/`. An upgrade overwrites them.
- **Our customizations** survive upgrades: the constitution, the template overrides in `.specify/templates/overrides/` (spec with a UX & Mockups section, plan with the pinned stack and our sections, tasks with mandatory tests and the Definition of Done), and the project extension `buli` (source in `.specify/extensions-src/buli/`, reinstall after editing with `specify extension add --dev .specify/extensions-src/buli --force`). It adds `/speckit-buli-mockups` as a mandatory hook before `/speckit-plan` and `/speckit-buli-ship` as a mandatory hook after `/speckit-converge`.
- **No git extension:** Spec Kit creates no branches and makes no commits; work stays on `dev`.
- The flow, its three maintainer gates and when it applies: constitution, Development Workflow.

## Commands

### One-time setup
```bash
npm config set save-exact=true --location=project   # writes .npmrc: exact version pinning
npm install          # install dependencies
supabase init        # create supabase/ config (once per repo)
supabase start       # start local Postgres + Auth (Docker); prints URLs/keys for .env
```

### Daily development
```bash
supabase start       # if not already running
npm run dev          # Next.js dev server with hot reload (Fast Refresh) → localhost:3000
```

### Database & schema changes
```bash
npx drizzle-kit generate   # diff schema.ts → new SQL migration file
npx drizzle-kit migrate    # apply migrations to local DB
npx drizzle-kit studio     # browser GUI to inspect data
supabase db reset          # wipe local DB, re-run all migrations + seed
npm run db:clone-prod      # replace the local DB with production-shaped data
```
`db:clone-prod` is the migration rehearsal: it copies production (including the drizzle journal) into the local stack, optionally shifts every date by one interval, then runs `drizzle-kit migrate` — so pending migrations meet real data before production does. Needs `pg_dump`/`psql` ≥ 17 and `PROD_DATABASE_URL`. Details, flags and the scrub-vs-no-scrub privacy rule: `docs/deployment.md` §6.

Workflow: edit `schema.ts` → `generate` → review generated SQL → `migrate`. Migrations are committed and versioned. SQL that `schema.ts` cannot express (RLS policies, FKs into `auth.users`, grants) goes in a **custom** migration authored with `npx drizzle-kit generate --custom --name <x>` — this writes the file *and* its journal/snapshot entry; a hand-written `.sql` file is silently skipped by `migrate`. Migrations are per-feature and **append-only** — the pre-launch chain was squashed into a baseline at go-live (see `docs/decisions/migrations-squash-at-launch.md`); the deploy workflow applies new migrations to production with each release.

### Testing
```bash
npm test                   # Vitest in watch mode
npm test -- --run          # single run (CI style)
```
Integration tests require the local Supabase stack to be running; shared seed helpers provide fixtures, and each test file starts from a clean state via truncation.

- **The suite refuses to run against a non-local `DATABASE_URL`** (`src/test/local-database.ts`, enforced from `src/test/setup.ts`). The integration tests delete and truncate on startup against whatever that variable points at, so a pasted production string would destroy live data — this is the only thing standing in the way. Override deliberately with `ALLOW_NONLOCAL_TEST_DATABASE=true`.
- **A test run wipes the local database**, including a `db:clone-prod` fixture and whatever the maintainer is testing by hand. Ask before running the suite while they might be; re-clone afterwards.

### Code quality
```bash
npx biome check --write .  # lint + format with auto-fix
npx tsc --noEmit           # typecheck without building
```

### Occasionally
```bash
supabase stop              # shut down local stack
npm run build && npm start # production build, verify locally
npx drizzle-kit migrate    # against prod DB URL when deploying schema changes
```

## Git workflow

- **Commits only after the maintainer's explicit approval**, including small fixups. One commit per feature on `dev`, migrations included, so a revert takes both.
- **`dev` is where work happens; `main` is the release branch.** Default to `dev` — commit there freely, push as often as you like, and every push deploys to staging. Production only ever changes by promoting `dev` into `main`, always through a pull request. **Direct pushes to `main` are rejected server-side** by the `main-protection` ruleset: a PR is required, the `checks` job must pass, only squash merges are allowed, and there are no bypass actors, so it applies to admins too. `.githooks/pre-push` refuses the same push locally with a more useful message; enable it once per clone with `git config core.hooksPath .githooks`. Because the ruleset is authoritative, `--no-verify` will not get past it: an emergency means disabling the ruleset in Settings → Rules, pushing, and re-enabling it.

  ```bash
  # work
  git checkout dev && …                      # commit freely; each push → staging
  # promote, once staging looks right
  gh pr create --base main --head dev --title "<features>"
  gh pr merge --squash --delete-branch=false  # one commit on main → production
  # REQUIRED afterwards, see below
  git checkout dev && git fetch origin && git reset --hard origin/main && git push --force-with-lease
  ```

  **The reset is not optional.** A squash-merge puts one new commit on `main` while `dev` keeps the originals — same tree, divergent history. Skip the reset and the *next* promotion takes the old merge base, replays commits already on `main`, and conflicts. Resetting `dev` onto `main` after every promotion keeps them a single line. (Merge commits would avoid the reset but put every intermediate commit on `main`, breaking one commit per promotion.)

  Corollaries: never let work exist only on `dev` for long — it is promoted or discarded. A production hotfix that cannot wait for `dev` goes on a branch off `main` and straight into a PR to `main`, then `dev` is reset onto it.
  - **Staging is not a substitute for the local loop.** Push to `dev` when something genuinely needs a real deployment — hosted Supabase, the Discord OAuth round-trip, Cloud Run behaviour, a migration meeting production-sized data. For everything else the local stack with `npm run db:clone-prod` is more realistic *and* faster than waiting for a deploy.
  - **One PR per promotion**, even when `dev` holds several features; its squash commit message lists the features it contains.

## `/dev` tooling

`/dev` offers test-persona logins, impersonation of any real user, and a component-state gallery at `/dev/ui` (`src/features/dev/components/gallery.tsx`, personas in `src/features/dev/personas.ts`); when a feature must extend them is in the constitution. The gate is `devToolsEnabled()` (`src/features/dev/enabled.ts`): always on in `npm run dev`; outside development it needs `ENABLE_DEV_TOOLS=true` **and** an unlock cookie set via `/dev/unlock?token=<DEV_TOOLS_TOKEN>`. Pages are gated once in `src/app/dev/layout.tsx`; route handlers are not covered by layouts and must call `devToolsEnabled()` themselves. **Neither variable is ever set on the production Cloud Run service** — together they allow signing in as any user.

## The development loop

Start `supabase start` and `npm run dev` once; leave them running. Feature work happens in the hot-reload loop, with `npm test` in watch mode alongside. Schema changes: edit `schema.ts`, generate, review, migrate — the local DB is disposable; `supabase db reset` recovers from any broken state. Before every commit: Biome, typecheck, full test run.

Common commands should be wrapped as npm scripts (`db:generate`, `db:migrate`, `check`, etc.) so flags don't need to be remembered.

## Environment & secrets

- `.env` — the single local env file (template: `.env.example`), read by Next.js, drizzle-kit, and the Supabase CLI alike: Supabase URLs/keys, Discord bot token, and the OAuth credentials the CLI substitutes into `supabase/config.toml` via `env()` on `supabase start`
- `NEXT_PUBLIC_SPRITE_BASE` — root of the sprite bucket (`/pokemon`, `/pokemon-pixel`, `/items` are appended). Unset → the shared `justhit-sprites` bucket, which is what production uses.
- Production secrets (Supabase service keys, Discord bot token) via Google Secret Manager, injected into Cloud Run
- The Discord bot token must never reach client-side code

## Open decisions (not yet pinned)

- None currently.

Domain-level open questions are intentionally not tracked here; they belong to a feature's spec (`specs/`).
