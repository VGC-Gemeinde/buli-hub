# Buli Hub — Project Context

AI-assisted development context file. Read this before making any technical decisions or writing code.

## What this project is

Buli Hub is the tournament platform for the **VGC Bundesliga**, an online league run by the VGC Gemeinde (the largest German-speaking VGC / Pokémon community). Users are players and admins/organizers. Community coordination happens on Discord; the web UI is the primary interface.

**All domain decisions (league structure, match formats, rules, data model) are made during feature planning — never in this file.** This file covers the technical base only.

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
- **Discord integration** — no bot service. The Next.js backend calls the **Discord REST API directly with a bot token** (messages, embeds, threads). Token comes from secret management, never from client code.
- **Scheduled jobs** — Google **Cloud Scheduler** invoking route handlers
- **Hosting** — Docker container on **Google Cloud Run**, scale-to-zero
- **Tooling** — **npm** (package manager), **Biome** (lint + format)
- **Dependencies** — **exact version pinning** (`save-exact=true` in `.npmrc`, no `^`/`~` ranges), committed lockfile. Automated updates via **Renovate** once CI exists to validate update PRs.
- **CI/CD** — intentionally deferred until first deployment. Do not scaffold pipelines yet. Renovate activation is coupled to this milestone.

## Architectural principles

- **All business logic lives in the web app / database layer.** Discord integration is a thin output channel: it posts and notifies, it never decides.
- **Domain logic is pure functions.** Any rule or computation logic must be written as pure TypeScript functions, separated from database access, so it is exhaustively unit-testable.
- **Keep UI components dumb.** Logic belongs in tested functions and server actions; components only display. This is the explicit tradeoff that made cutting E2E tests safe.
- **Schema is code.** The Drizzle schema and committed SQL migrations are the source of truth for the data model. Any schema change goes through generate → review SQL → migrate.
- **Boring, well-documented tools over clever ones — this is a lesson learned, not a preference.** A previous iteration of this project failed on obscure tooling: AI assistance produced confidently wrong code for niche tools, and time went into fighting the toolchain instead of building features. The stack was chosen for AI-assisted development: one language end-to-end, types flowing DB → API → UI, everything visible in the repo, massive training/community representation for every tool. Do not introduce niche or exciting libraries without explicit discussion.
- **Feature-first folder structure.** Code is organized by feature (vertical slice), not by layer:

  ```
  src/
    features/
      <feature-name>/   # components, actions, logic, tests for this feature
      ...
    lib/                # genuinely shared: db client, discord.ts, auth helpers
    db/
      schema.ts         # Drizzle schema stays central (tables cross features)
    app/                # Next.js routes — thin wrappers importing from features/
  ```

## Testing strategy (pinned)

- **Vitest unit tests** — the priority. Cover all domain logic (the pure functions). Correctness of computed results is critical to community trust; test exhaustively.
- **Vitest integration tests against real local Postgres** — run against the Supabase CLI stack. Test RLS policies, constraints, and multi-step flows. Clean state per test file via `supabase db reset` or truncation; shared seed helpers provide fixtures.
- **No E2E tests** — deliberate decision. Do not add Playwright or similar.
- Do not test: UI snapshots, styling, shadcn internals.

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
```
Workflow: edit `schema.ts` → `generate` → review generated SQL → `migrate`. Migrations are committed and versioned. SQL that `schema.ts` cannot express (RLS policies, FKs into `auth.users`, grants) goes in a **custom** migration authored with `npx drizzle-kit generate --custom --name <x>` — this writes the file *and* its journal/snapshot entry; a hand-written `.sql` file is silently skipped by `migrate`. Migrations are kept per-feature and **squashed into one baseline at go-live** (there is no production DB to preserve history for) — see `docs/decisions/migrations-squash-at-launch.md`.

### Testing
```bash
npm test                   # Vitest in watch mode
npm test -- --run          # single run (CI style)
```
Integration tests require the local Supabase stack to be running.

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

## Working method (pinned)

- **Features are vertical slices.** A feature is the complete cross-section needed to realize a piece of functionality: view + server actions/routes + schema changes/migration + Discord calls + tests. A backend route alone is not a feature. Work is planned, implemented, and committed as whole slices.
- **Commits only after maintainer approval.** Present the finished, verified work first; commit (or amend) only when the maintainer explicitly approves. This applies to every commit, including small fixups.
- **One commit per feature on main.** This is a forcing function for scope discipline: if a feature doesn't fit a reviewable commit, it's too big — split it into smaller features. Migrations ship in the same commit as the code using them, so a revert takes both. Escape hatch: commit freely on a feature branch, squash-merge to main.
- **Plan before implementing — always.** Every feature starts with a written plan (`docs/plans/<feature>.md` or `features/<name>/PLAN.md`): scope (in/out), schema changes, affected routes/views, Discord touchpoints, test cases, open questions. The plan is approved before implementation starts. Plan size scales with feature size — three bullet points is a valid plan for a tiny feature.
- **Documentation describes the present, not the journey.** Plans, decision docs, and code comments must make sense to a reader with zero conversation or revision history. When a spec changes, rewrite the affected text as if the current design had always been the design — no correction notes, no "previously X, now Y". History lives in git; reasoning that is still relevant to the current state belongs in `docs/decisions/`.
- **Session independence: if knowledge only exists in a chat, it doesn't exist.** Any AI session must be able to start fresh from repo state alone. A feature is only complete when: code is committed, its plan is marked done, and CLAUDE.md is updated if anything structural changed. Cross-feature decisions and their reasoning go into `docs/decisions/`.
- **Design happens in two passes.** A feature's first implementation carries a *rudimentary but intentional* design: functional and laid out, built with the design-system tokens (`design/DESIGN.md`) so it is on-brand and coherent — a viewer should not read it as a throwaway placeholder — but deliberately not polished. That working feature is what the maintainer takes to the designer, who returns a polished design as a hand-off doc at `design/<FEATURE>.md` (companion to `DESIGN.md`). A later **design pass** implements the hand-off and changes **views only** — domain logic, queries and tests stay as-is. So the arc is: functional build → designer hand-off → design pass. Do not wait for a hand-off to build; do not ship bare, unstyled controls either. The design passes are made for desktop views first. You still need to optimize for mobile your self.
- **The `/dev` tooling tracks the UI.** `/dev` (development-only, 404 in production builds) offers test-persona logins and a component-state gallery at `/dev/ui`. A feature that adds components with visual states extends the gallery (`src/features/dev/components/gallery.tsx`); a feature that adds user-specific data or new auth-metadata shapes extends the personas (`src/features/dev/personas.ts`). This is part of a feature's definition of done.
- **Don't be a yes-sayer.** The maintainer explicitly wants pushback: critically evaluate suggestions, call out wrong or suboptimal decisions, and ask for justification when a decision seems doubtful. Challenge first, then implement.

## The development loop

Start `supabase start` and `npm run dev` once; leave them running. Feature work happens in the hot-reload loop, with `npm test` in watch mode alongside. Schema changes: edit `schema.ts`, generate, review, migrate — the local DB is disposable; `supabase db reset` recovers from any broken state. Before every commit: Biome, typecheck, full test run.

Common commands should be wrapped as npm scripts (`db:generate`, `db:migrate`, `check`, etc.) so flags don't need to be remembered.

## Environment & secrets

- `.env` — the single local env file (template: `.env.example`), read by Next.js, drizzle-kit, and the Supabase CLI alike: Supabase URLs/keys, Discord bot token, and the OAuth credentials the CLI substitutes into `supabase/config.toml` via `env()` on `supabase start`
- Production secrets (Supabase service keys, Discord bot token) via Google Secret Manager, injected into Cloud Run
- The Discord bot token must never reach client-side code

## Open decisions (not yet pinned)

- CI/CD design (GitHub Actions → Cloud Run was the sketch; decide at first deployment, together with Renovate activation)

Domain-level open questions are intentionally not tracked here — they belong to feature plans (`docs/plans/`).
