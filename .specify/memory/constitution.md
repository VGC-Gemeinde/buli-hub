# Buli Hub Constitution

Buli Hub is the tournament platform of the VGC Bundesliga. This constitution holds the rules every
feature is specified, planned, built and reviewed against. `CLAUDE.md` holds the architecture map,
commands and environments; where the two overlap, this document wins.

## Core Principles

### I. Pure, Server-Side Domain Logic

- All business logic lives in the web app and the database layer. Discord is an output channel:
  it posts and notifies, it never decides.
- Every rule or computation is a pure TypeScript function, separated from database access.
- UI components are dumb: they display. Logic belongs in tested functions and Server Actions.
- Drizzle bypasses RLS, so authorization MUST be checked in server code (Server Actions, route
  handlers). RLS policies are still defined as defense in depth.

Rationale: correct results are what the community trusts the hub for, and pure functions are what
makes exhaustive testing possible without E2E tests.

### II. Tests Carry the Weight (NON-NEGOTIABLE)

- Every piece of domain logic MUST have Vitest unit tests, exhaustive over its cases.
- RLS policies, constraints and multi-step flows MUST have Vitest integration tests against the
  local Supabase stack.
- No E2E tests (no Playwright or similar). No tests of UI snapshots, styling or shadcn internals.
- The suite refuses a non-local `DATABASE_URL`; that guard is never weakened.
- Before any commit: Biome, typecheck and the full test run are green.

Rationale: cutting E2E tests was only safe because logic lives in tested functions (Principle I).

### III. Boring Tools, Smallest Mechanism

- The pinned stack (Next.js App Router + TypeScript, Supabase, Drizzle, Zod, Tailwind + shadcn/ui,
  npm, Biome, Cloud Run) changes only after explicit discussion with the maintainer.
- No niche or exciting library without explicit approval. Dependencies are pinned exactly; the
  lockfile is committed.
- Default to the smallest mechanism that satisfies the requirement. Before proposing a new table,
  command or abstraction, check whether a column, a guard or an env var already covers it.
  One-time bootstrap values are env vars, not config tables.

Rationale: a previous iteration failed on obscure tooling; well-known tools keep AI-assisted work
correct.

### IV. Schema Is Code

- The Drizzle schema (`src/db/schema.ts`) and committed SQL migrations are the source of truth.
- Every schema change goes through generate, review SQL, migrate. SQL that `schema.ts` cannot
  express (RLS, FKs into `auth.users`, grants) is authored with
  `drizzle-kit generate --custom --name <x>`; a hand-written `.sql` file is silently skipped.
- The migration chain is append-only. A migration ships in the same commit as the code using it.

### V. Look and UX Are the Product

- Every feature that changes what a user sees is designed before it is planned: mockups are made
  during the spec phase and approved by the maintainer (see Development Workflow).
- Look and UX are always optimised, never merely functional. Each view MUST work and look
  deliberate on desktop and on phone width (no horizontal page scroll), in light and dark mode.
- The design system is binding: `design/DESIGN.md` and the tokens in `src/app/globals.css`.
  No new color outside the tokens; shared primitives (§8 of `DESIGN.md`) are reused.
- Explanation follows the page's job. Pages that lead a user through a flow (registration,
  reporting a result, staff workflows) guide with clear copy. Pages that display (tables, stats,
  overviews) let the layout speak: no section comments, footnotes or sentences restating what a
  placeholder, color or outcome line already shows. The balance is decided per page in the
  mockups.
- Copy never explains game knowledge competitive players have (what a Mega stone does, how usage
  is counted, what a win rate means). Where a short label needs a longer definition, it sits
  behind the label as a tooltip, not on the page.
- Nothing that appears on a state change relayouts: revealing a spoiler, a control that shows once
  a filter is set, a control that exists for only some categories. Its space is reserved from the
  start. Irreversible actions use type-to-confirm.
- Buttons that open a dialog have plain labels, no trailing "…".
- A feature that adds components with visual states extends the `/dev/ui` gallery; one that adds
  user-specific data or new auth-metadata shapes extends the `/dev` personas.

### VI. League Voice and German Time

- Every string a user reads (web UI and Discord messages) is plain, natural German. Exempt: game
  data shown as Showdown shows it (names of Pokémon, items, abilities, moves and natures,
  Showdown's move descriptions, and its abbreviations such as BP and ACC); the labels and
  sentences around it stay German.
- Quotes are straight `"` only, everywhere we author text: UI copy, Discord messages, code and CSS
  comments, docs, specs and mockups. `„` and `“` are regressions. Inside a JS/TS string or JSX
  attribute delimited by `"`, switch the delimiter to `'` rather than escaping. Exempt: the
  designer's `design/go-live/*.dc.html` and `design/REGELWERK.reference.html` records.
- No em-dash (`—`) in user-facing copy: split the sentence or use a comma or colon; `·` is the
  in-line separator. Exempt: `—` as the empty-value placeholder, code comments, `/dev` tooling
  copy, and the designer's `design/go-live/*.dc.html` records.
- Every clock is Europe/Berlin through `src/lib/german-time.ts` (`germanToday()`,
  `formatGermanDateTime`, `formatGermanDay`). A bare `Intl.DateTimeFormat` or
  `toISOString().slice(0, 10)` is a bug. Day strings are timezone-free calendar days; instants
  stay `timestamptz` and are converted only for display.

### VII. Spoiler Protection and Result Embargo

- An embargoed result (Match of the Week, recording hold) never reaches a viewer who is not
  entitled to it: not in HTML, not in a payload, not in a Discord post, not in public standings.
  The one rule lives in `src/features/spoilers/embargo.ts`.
- Public standings and anything counting results load through the public projections
  (`groupResults` / `groupStandingsInput`, `publicLeagueOverview`), so a new consumer inherits
  embargo and replacement handling instead of re-deriving it.
- Spoiler protection is pragmatic, not airtight: indirect leaks through aggregates (Bilanz, Platz)
  are acceptable. Point out a real leak once, then build the one design the maintainer picks.
  Coupled covering is fine where a number belongs to exactly one match, never in shared tables.

## Architecture Constraints

- One deployable: a full-stack Next.js app. No separate backend, no persistent Discord bot.
  Server Components for data pages, Server Actions for mutations, route handlers only where an
  HTTP URL is required.
- Feature-first folders: `src/features/<feature>/` holds components, actions, logic and tests;
  `src/lib/` only what is genuinely shared; `src/app/` routes are thin wrappers.
- Secrets (Discord bot token, service keys, job and stream secrets) never reach client code.
- Scheduled jobs and the stream API are bearer-authorized route handlers; jobs are idempotent
  converges, so a repeated run is harmless.
- `/dev` route handlers call `devToolsEnabled()` themselves; layouts do not cover them.
- Player data placement: a value that feeds a specific season's setup is snapshotted on the
  registration; a value consumed live (a capability or preference) lives on the profile. "How
  often it changes" is the wrong test.

## Development Workflow

### When the full flow applies

New or changed user-facing behavior, a schema change, or a Discord change goes through the full
Spec Kit flow. Bug fixes, refactors and copy corrections do not need a spec; they ship as a commit.

### Features are vertical slices

A feature is the complete cross-section that realizes a piece of functionality: views, Server
Actions or routes, schema and migration, Discord calls, tests. A backend route alone is not a
feature. A feature ships as one reviewable commit; one that does not fit is too big and is split
into smaller specs.

### The flow and its gates

1. `/speckit-specify`, then `/speckit-clarify`: what and why, no implementation.
2. Mockups (`/speckit-gemeinde-mockups`, runs as a mandatory hook before `/speckit-plan`): iterated
   as private Artifacts, exported as self-contained HTML to `specs/<NNN-feature>/mockups/`.
   **Gate 1:** the maintainer approves spec and mockups.
3. `/speckit-plan`, `/speckit-tasks`, `/speckit-analyze`. **Gate 2:** the maintainer approves
   plan and tasks.
4. `/speckit-implement`, then `/speckit-converge` until it finds no gaps. What changed during
   implementation flows back into `spec.md` and `plan.md` before shipping.
5. `/speckit-gemeinde-ship` (mandatory hook after converge): Definition of Done check.
   **Gate 3:** the maintainer approves the finished work; only then is it committed.

### Definition of Done

- Biome, typecheck and full test suite green; the feature verified in the running app on desktop
  and phone width, light and dark.
- `/dev` gallery and personas extended where Principle V requires it.
- The feature's paragraph in `CLAUDE.md` (the living architecture map) added or updated to point
  at its spec; `CLAUDE.md` updated for anything structural.
- Legacy documents whose content this feature supersedes carry a backlink (see below).
- `design/DESIGN.md` updated when the feature changes the design system or adds a cross-feature
  anatomy.
- Spec, plan and tasks reflect what was built.

### Specs are history

- A spec directory is frozen when its feature ships and is never edited afterwards. Later changes
  get a new spec.
- Precedence: code and tests over every document; a newer spec over an older spec or a legacy
  document.
- The one permitted edit to a frozen spec or a legacy document is a backlink note at its top:
  `> Abgelöst in Teilen durch specs/NNN-… (<Bereich>).` Its content stays untouched.
- What is true now lives in code, tests, this constitution and the `CLAUDE.md` map.
- Code comments point at the spec that last shaped the behavior they explain.

### Legacy documents

`docs/plans/`, `docs/decisions/` and the hand-offs `design/<FEATURE>.md` predate Spec Kit.
They stay in place (code comments link them) and describe how existing behavior came to be; nothing
new is added to them. `design/DESIGN.md` is not legacy: it is the living design system.

### Workflow profile

Read by the shared gates and templates (`gemeinde-dev-kit`).

- **Viewers**: public visitors, signed-in users, registered players and participants, staff,
  admins; Discord readers for posts and messages.
- **Design sources**: `design/DESIGN.md` (the living design system) and the tokens in
  `src/app/globals.css`, light and `.dark`; fonts as loaded in `src/app/layout.tsx`; shared
  primitives per `DESIGN.md` §8.
- **Mockup frame**: desktop and phone width (about 390px), light and dark.
- **Checks**: `npx biome check .`, `npm run typecheck`, `npm test -- --run`. The integration tests
  truncate the local database: ask the maintainer first whether they are testing by hand on it,
  and run only after a yes.
- **Copy checks**: no `„` or `“` anywhere; no `—` in user-facing strings (pages, components,
  Discord messages in `src/features/discord-posts/messages.ts`), with the exemptions of
  Principle VI.
- **Running-app check**: `supabase start` and `npm run dev` (localhost:3000); sign in through the
  `/dev` personas to see each viewer.
- **Dev tooling to extend**: the `/dev/ui` gallery (`src/features/dev/components/gallery.tsx`) for
  new visual states, the `/dev` personas (`src/features/dev/personas.ts`) for new user-specific
  data or auth-metadata shapes (Principle V).
- **Living documents**: `CLAUDE.md` (the architecture map), this constitution, `design/DESIGN.md`
  and `docs/deployment.md`.
- **Legacy documents**: `docs/plans/`, `docs/decisions/`, `design/<FEATURE>.md`; backlink line
  `> Abgelöst in Teilen durch specs/NNN-… (<Bereich>).`
- **Commit target**: `dev`, never `main`.

### Collaboration rules

- Commits only after the maintainer's explicit approval, including small fixups.
- Work happens on `dev`; `main` changes only through one squash PR `dev → main`, even when `dev`
  holds several features, after which `dev` is reset onto `main` (recipe in `CLAUDE.md`).
- Pushback is wanted: critically evaluate suggestions, call out wrong or doubtful decisions, ask for
  justification. Challenge first, then implement.
- Session independence: knowledge that exists only in a chat does not exist. Decisions land in the
  spec, this constitution or `CLAUDE.md` before the session ends.

## Governance

- This constitution supersedes other practice documents. `CLAUDE.md` is the runtime guide
  (architecture map, commands, environments) and must not contradict it.
- Amendments go through `/speckit-constitution` and need the maintainer's approval. A decision that
  spans features is an amendment; longer reasoning lives in the `research.md` of the spec that
  triggered it.
- Versioning is semantic: MAJOR for removed or redefined principles, MINOR for new or materially
  expanded ones, PATCH for wording.
- Compliance is checked by the Constitution Check in every `plan.md` and by `/speckit-analyze`;
  a violation is either fixed or justified in the plan's Complexity Tracking.

**Version**: 1.2.0 | **Ratified**: 2026-10-16 | **Last Amended**: 2026-10-18
