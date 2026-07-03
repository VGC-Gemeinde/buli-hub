# Migrations: keep per-feature, squash at go-live

**Decided:** 2026-07-03

Schema changes ship as committed SQL migrations, one migration with the feature
that uses it (the pinned `generate → review SQL → migrate` workflow). This holds
**even though there is no production database yet** and the pre-launch migration
history has no lasting value.

## Why keep them before launch

The migration files are not primarily a production-history record — before
go-live that history is disposable. They are **what reconstructs the local and
test databases**: `supabase db reset` and every integration-test run rebuild the
schema from these files. Something committed has to describe the schema, or
`db reset` and CI have nothing to build from.

Two parts of the schema are **not expressible in `schema.ts`** and live only in
hand-written `_fk_rls` migrations:

- **RLS policies** (server-only tables: RLS on, no policies), and
- **foreign keys into `auth.users`** (Drizzle does not manage the `auth` schema).

So `drizzle-kit push` (the "sync `schema.ts` to the DB, no migration files" mode)
is not an option: it would silently drop all RLS and auth-FK SQL. Any
push-based workflow would still need a hand-maintained policies/FK SQL file
applied after every push — trading per-feature migrations for a more
error-prone chore. That RLS/auth-FK SQL is written once regardless of *when* we
launch; deferring migrations only batches the work, it does not remove it.

## The squash

Because there is no production DB to migrate, **the migration chain is
disposable**: at go-live (or periodically before then) collapse all migrations
into a single clean baseline. This yields the clean single-migration schema we
want at launch without giving up reproducible dev/test databases in the
meantime. A squash rewrites the journal/snapshots and invalidates existing
local DBs — fine, since every local DB is rebuilt with `supabase db reset`.

## Authoring the non-`schema.ts` migrations

Custom SQL (RLS, auth FKs, grants) must be created with
`drizzle-kit generate --custom --name <x>`, which writes the migration file
**and** its journal + snapshot bookkeeping. Hand-writing the `.sql` file alone
leaves it out of the journal, so `drizzle-kit migrate` silently skips it (the DB
then lacks those constraints while everything appears to have run).
