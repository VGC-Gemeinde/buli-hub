# Buli Hub

Buli Hub is the tournament platform for the VGC Bundesliga, an online Pokémon
VGC league run by the [VGC Gemeinde](https://vgcgemein.de), the largest
German-speaking VGC community.

A season works a bit like a football league. Players sign up, staff sort them
into divisions by skill level, and each division is split into round-robin
groups that play one match per week. Results decide the standings, and at the
end of the season the top and bottom of each division move up or down.

The app covers all of that: registration, seeding, the schedule, match
reporting with replay links, disputes, mid-season drops, Match of the Week, and
a public league table that hides results you haven't watched yet. Reported
results also get posted to Discord, and those posts stay in sync if a result
changes later.

People sign in with Discord, since everyone in the community already has an
account, and their permissions come from their roles on the server.

The interface is in German. Code, comments and documentation are in English.

## Getting started

You'll need [Node.js](https://nodejs.org) 24 or newer, Docker, and the
[Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
npm install
cp .env.example .env
supabase start      # local Postgres + Auth in Docker
npm run db:migrate
npm run dev         # http://localhost:3000
```

`supabase start` prints the database URL and the keys that go into `.env`. The
rest of that file is optional. Without Discord credentials the app skips
anything Discord related, and you can sign in through the dev tools instead.

### Signing in

You don't need a Discord application to work on this. Open `/dev` and pick one
of the test personas. They cover the account shapes a single real login can't
produce, like a missing avatar, a very long display name, or empty metadata.
The same page links to `/dev/ui`, a gallery of every UI component and its
states.

### Working with real data

If you have production access, you can replace your local database with a copy
of production:

```bash
npm run db:clone-prod -- --shift="30 days"
```

The copy brings production's migration history with it, so running migrations
afterwards applies only the ones production hasn't seen yet, against real data.
That makes it a rehearsal for the next deploy as well as a way to develop
against realistic data. `docs/deployment.md` covers the flags and the rules
around personal data.

### Commands you'll use

```bash
npm run dev          # dev server with hot reload
npm test             # Vitest in watch mode (add -- --run for a single pass)
npm run check        # Biome lint and format, with fixes
npm run typecheck    # tsc --noEmit
npm run db:generate  # turn schema.ts changes into a migration
npm run db:migrate   # apply migrations locally
npm run db:studio    # browse the database
supabase db reset    # wipe and rebuild the local database
```

The integration tests need the local Supabase stack running. They also refuse
to run against anything other than a local database, because they clear tables
on startup.

## How it's built

It's one Next.js app doing both frontend and backend, running on Cloud Run.
There's no separate API service and no Discord bot process. When the app needs
to post something to Discord it calls the REST API directly.

- **Next.js** (App Router), React and TypeScript
- **Postgres** through Supabase, with **Drizzle ORM** and migrations committed
  to the repo
- **Supabase Auth** with the Discord provider
- **Tailwind CSS** and shadcn/ui
- **Biome** for linting and formatting, **Vitest** for tests
- Deployed from CI as a Docker image on **Google Cloud Run**

Anything that computes a result (standings, seeding, promotion and relegation)
is written as plain functions with no database access, so it can be tested
properly. Getting those wrong would cost the league's trust faster than
anything else. Components stay simple and there are no end-to-end tests.

## More documentation

- `CLAUDE.md` covers the architecture, conventions and how work is planned. It
  was written for AI-assisted development, but it's also the quickest way for a
  person to get oriented.
- `docs/deployment.md` is the infrastructure runbook: environments, deploys,
  cloning production, backups.
- `docs/plans/` has one document per feature explaining what it does and why.
- `docs/decisions/` holds decisions that cut across features.
