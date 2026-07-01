# Scaffolding

**Status: done** (2026-07-02)

Set up the technical base described in CLAUDE.md. No domain features, no schema tables.

## Scope

- In: Next.js app skeleton, Drizzle + Supabase wiring, shadcn/ui, Vitest, Biome, npm scripts, folder structure.
- Out: any domain feature, CI/CD (deferred per CLAUDE.md), Discord integration code, auth flow, Dockerfile/Cloud Run config (belongs to the first-deployment milestone).

## What was set up

- `create-next-app` 16.2.10 — TypeScript, App Router, `src/` dir, Tailwind v4, Biome, Turbopack.
- Exact version pinning via `.npmrc` (`save-exact=true`); all dependencies pinned, no ranges.
- Supabase CLI project (`supabase init` → `supabase/config.toml`).
- Drizzle ORM + drizzle-kit; schema at `src/db/schema.ts` (empty placeholder), db client at `src/lib/db.ts` (postgres-js, `prepare: false` for pooler compatibility).
- shadcn/ui (CLI v3, `radix-nova` preset, neutral base color) → `components.json`, `src/lib/utils.ts`.
- Vitest with `@` alias; smoke test at `src/lib/utils.test.ts`.
- Feature-first folders: `src/features/`, `src/lib/`, `src/db/`, `docs/plans/`, `docs/decisions/`.
- npm scripts: `test`, `check`, `lint`, `typecheck`, `db:generate`, `db:migrate`, `db:studio`, `db:reset`.
- `.env.example` documenting required env vars; `.gitignore` keeps `.env*` ignored but allows the example file.

## Decisions

- **Drizzle migrations output to `supabase/migrations/`** with `migrations.prefix: "supabase"` (timestamp-style filenames). This is the documented Drizzle↔Supabase integration: `drizzle-kit migrate` and `supabase db reset` both apply the same files, so the CLAUDE.md workflow ("`supabase db reset` re-runs all migrations") holds.
- **`drizzle.config.ts` loads `.env.local` via Node's `process.loadEnvFile`** — drizzle-kit doesn't read Next.js env files, and this avoids a dotenv dependency.
- **`@types/node` pinned to 24.x** to match the local Node 24 runtime (create-next-app defaulted to 20).
- **shadcn CLI kept as a devDependency** (its init adds itself as a runtime dep; moved) so component additions use a pinned, Renovate-updatable version.
- **AGENTS.md from create-next-app kept** — it points AI sessions at the bundled Next.js 16 docs in `node_modules/next/dist/docs/`.

## Open questions

- None. Discord provider config in `supabase/config.toml` (client id/secret) is part of the auth feature, not scaffolding.
