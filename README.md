# Buli Hub

The tournament platform for the **VGC Bundesliga** — an online Pokémon VGC
league run by the [VGC Gemeinde](https://vgcgemein.de), the largest
German-speaking VGC community.

A season works roughly like a football league. Players register, staff divide
them into **divisions** (skill tiers) and **sub-divisions** (round-robin groups
that play each other, one match per week), and a schedule is generated from
there. Players report their own results, opponents confirm them, and the
standings follow. At the end of the season the top and bottom of each division
are promoted and relegated.

Buli Hub is where all of that happens. The community lives on Discord and the
league is organised there, but the app is the primary interface: registration,
seeding, the schedule, match reporting with replay links, disputes, mid-season
drops, Match of the Week, and a public league overview with spoiler protection
for people who have not watched yet. Results are mirrored into Discord as posts
that stay in sync when a result changes.

Sign-in is Discord OAuth — everyone in the community already has an account —
and permissions come from Discord server roles.

> The user interface is **German**, matching the community. Code, comments and
> documentation are English.

---

## Getting started

**Prerequisites:** [Node.js 24+](https://nodejs.org), Docker (for the local
Supabase stack), and the [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
npm install
cp .env.example .env     # then fill in the values (see below)
supabase start           # local Postgres + Auth in Docker; prints URLs and keys
npm run db:migrate       # apply migrations to the local database
npm run dev              # http://localhost:3000
```

`supabase start` prints the values for `DATABASE_URL`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and
`SUPABASE_SECRET_KEY` — copy them into `.env`. Everything else in
`.env.example` is optional for local work: without Discord credentials the app
simply skips Discord integration, and you sign in through the dev tooling
instead.

### Signing in locally

You do not need a Discord application to develop. Open **`/dev`** and pick a
test persona — the personas cover the metadata shapes a single real account
cannot produce (no avatar, very long display name, empty metadata). `/dev` also
has a component gallery at `/dev/ui` showing every UI state in one place.

### Working with realistic data

Maintainers with production access can replace the local database with
production-shaped data:

```bash
npm run db:clone-prod -- --shift="30 days"
```

This is also how migrations are rehearsed: the clone brings production's
migration journal with it, so the following `drizzle-kit migrate` applies
exactly the migrations production has not seen yet — against real data. See
[`docs/deployment.md`](docs/deployment.md) §6 for the flags and the rules about
personal data.

### Everyday commands

```bash
npm run dev          # dev server with hot reload
npm test             # Vitest in watch mode (npm test -- --run for one pass)
npm run check        # Biome lint + format, with fixes
npm run typecheck    # tsc --noEmit
npm run db:generate  # schema.ts -> a new SQL migration
npm run db:migrate   # apply migrations locally
npm run db:studio    # browse the database
supabase db reset    # wipe and rebuild the local database
```

Integration tests need the local Supabase stack running. The suite refuses to
run against anything but a local database — it truncates tables on startup, so
that guard is deliberate.

---

## How it fits together

One deployable: a full-stack **Next.js** app on Cloud Run. No separate backend
service and no persistent Discord bot — the app calls the Discord REST API
directly when it needs to post.

| | |
|---|---|
| Framework | Next.js (App Router), React, TypeScript |
| Database | Postgres via Supabase; **Drizzle ORM**, migrations committed to the repo |
| Auth | Supabase Auth with the Discord provider |
| UI | Tailwind CSS + shadcn/ui |
| Tooling | Biome (lint + format), Vitest, npm |
| Hosting | Docker on Google Cloud Run, deployed from CI |

Domain logic is written as pure functions, separate from database access, and
tested exhaustively — computed standings have to be right for the community to
trust them. Components stay dumb; there are no end-to-end tests by design.

## Further reading

- [`CLAUDE.md`](CLAUDE.md) — architecture, conventions and working method.
  Written for AI-assisted development, but it is the fastest orientation for
  humans too.
- [`docs/deployment.md`](docs/deployment.md) — infrastructure runbook:
  environments, deploys, cloning production, backups.
- [`docs/plans/`](docs/plans) — one document per feature, describing what it
  does and why it was built that way.
- [`docs/decisions/`](docs/decisions) — cross-cutting decisions and their
  reasoning.
