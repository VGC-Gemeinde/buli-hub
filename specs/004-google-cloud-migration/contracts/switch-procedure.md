# Contract: the switch

Spec FR-017 to FR-022, User Story 3. One script, `npm run db:move-from-supabase`
(`scripts/move-from-supabase.ts`), orchestration only; every transformation and check it runs is a
pure, tested function under `src/features/move/`.

## Inputs

| Flag / variable | Meaning |
|---|---|
| `--source` / `SUPABASE_DATABASE_URL` | the Supabase session connection string (read-only use) |
| `--target` / `MOVE_TARGET_DATABASE_URL` | the empty Cloud SQL database, reached through the Cloud SQL Auth Proxy on `127.0.0.1` |
| `--photos-from` | the Supabase project URL whose public `stream-photos` objects are copied |
| `--photos-to` | the target bucket name (`buli-hub-stream-photos` or `…-staging`) |
| `--dry-run` | prints source, target and the steps, touches nothing |

The script refuses a target that already holds a `users` row (FR edge case: never merge into a
half-loaded target); `--reset-target` drops and recreates the target's `public` and `drizzle`
schemas first, after a typed confirmation of the target database name.

## Steps

1. **Preflight**: source and target differ; with `--reset-target` the target's schemas are
   dropped after the database name is typed; every `auth.users` row has a Discord id (else stop
   and list them). A target that already holds accounts is refused.
2. **Schema**: `drizzle-kit migrate` against the target, which builds the new baseline.
3. **Accounts**: copy `auth.users` into `users` (`id`, Discord id, `created_at`); no email.
4. **Data**: every public table of the source copied into the target with `COPY … TO STDOUT` →
   `COPY … FROM STDIN` between the two connections (`loadIntoTarget`, no `pg_dump`), in one
   transaction on the target. Before the copy the target's foreign keys are dropped (their
   definitions captured with `pg_get_constraintdef`) and the hub's own triggers disabled
   (`ALTER TABLE … DISABLE TRIGGER USER`), so closed seasons can be written back; after it the keys
   are re-added, which re-validates every row, and the triggers re-enabled before commit
   (research.md, R5). Source and target must have the same tables and columns, or nothing moves.
5. **Sequences**: none to carry over; the public schema has no sequence (ids are uuids, checked
   against the baseline on 2026-10-21).
6. **Photos**: every object in Supabase's `stream-photos` bucket copied to the target bucket under
   the same path, with its content type and `Cache-Control: public, max-age=31536000`.
7. **Verify** (FR-019), printed as a table, exit code 1 on any difference:
   - row count per table, source vs target, for every table in `public`;
   - `users`: every source account present with the same `id` and Discord id, and no other;
   - every `profiles.stream_photo_path` exists in the target bucket with the source's size;
   - (the target's schema is the committed baseline by construction: step 2 built it, and step 4
     refuses a source whose tables or columns differ).

The script never writes to the source. It does not switch the hub; the runbook does that with
`gcloud` around it (maintenance on → script → verify ok → secrets and env switched → maintenance
off), see `docs/deployment.md` "Umzug von Supabase".

## Rehearsal

Staging moves exactly as production will: first the existing staging refresh fills staging's
Supabase project with a scrubbed copy of production (production-shaped data, and no unscrubbed
personal data ever lands outside production, docs/deployment.md §6), then the same script moves
staging's Supabase project into the staging Cloud SQL database and bucket, and the staging service
is switched with the same runbook steps. SC-001 to SC-004 are checked on that rehearsal before the
production run is scheduled.
