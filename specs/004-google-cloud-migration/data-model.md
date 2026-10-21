# Data Model: Umzug von Supabase auf Google Cloud

Two new tables replace what Supabase Auth kept in its own `auth` schema. Every other table keeps
its columns; only the target of 30 foreign keys changes from `auth.users(id)` to `users(id)`.

## `users` (new)

The hub's own account record (spec FR-001, FR-002).

| Column | Type | Rules |
|--------|------|-------|
| `id` | `uuid` | primary key, `default gen_random_uuid()`. Migrated accounts keep their `auth.users.id`. |
| `discord_id` | `text` | not null, unique. The Discord snowflake as Discord sends it (a decimal string). |
| `created_at` | `timestamptz` | not null, `default now()`. Migrated accounts keep `auth.users.created_at`. |

- No name, username or avatar here: the Discord identity the hub shows stays on `profiles`
  (`display_name`, `username`, `avatar_url`), written by the member sync as today.
- No email (FR-022).
- Lookups: by `id` (every FK), by `discord_id` (sign-in, bans, season sync, membership sweep,
  replacements). Both are covered by the primary key and the unique constraint.
- Deleting a user cascades exactly as deleting an `auth.users` row did (see below).

**From the old system**: `id ← auth.users.id`, `discord_id ← coalesce(raw_user_meta_data->>'provider_id',
raw_user_meta_data->>'sub')`, `created_at ← auth.users.created_at`. A source row without a Discord
id stops the transfer (spec edge case: reported, never dropped).

## `sessions` (new)

One signed-in browser (spec FR-005, FR-006, FR-008).

| Column | Type | Rules |
|--------|------|-------|
| `token_hash` | `text` | primary key. SHA-256 of the session token, hex. The token itself is never stored. |
| `user_id` | `uuid` | not null, FK `users(id) on delete cascade`, indexed. |
| `created_at` | `timestamptz` | not null, `default now()`. |
| `last_seen_at` | `timestamptz` | not null, `default now()`. |

- **Valid** while `last_seen_at > now() - interval '30 days'`.
- **Renewed** by use: a request with a valid session moves `last_seen_at` to `now()` when it is
  older than one day (at most one write per session per day).
- **Ended** by sign-out (row deleted), by the maintainer's runbook command (all rows of one
  `user_id` deleted), by the user's deletion (cascade), or by expiry. Expired rows are never
  honored and are deleted on every sign-in (one statement over a table of a few hundred rows),
  so no scheduled job is needed.
- Not migrated: every Supabase session ends with the move (FR-008).

State transitions:

```text
(none) --sign-in--> active --use, >1 day since last_seen--> active (last_seen_at = now)
active --sign-out | runbook command | user deleted--> (deleted)
active --30 days without use--> expired --next sign-in of anyone--> (deleted)
```

## Sign-in attempt (no table)

The state that ties Discord's response to the browser that started the sign-in (FR-003): a random
`state` and a PKCE `code_verifier`, held in one short-lived httpOnly cookie (10 minutes,
path `/auth/callback`), compared and deleted on the callback. Nothing is stored server-side.

## Foreign keys re-pointed to `users(id)`

Unchanged `ON DELETE` behavior (FR-002). Like every FK of the hub they stay in the custom
migration (`drizzle/0001_constraints.sql`), taken one to one from the old schema; `schema.ts`
declares none. 29 columns, read from the live schema (`pg_constraint`):

| Table.column | On delete |
|---|---|
| `profiles.user_id` | cascade |
| `registration_windows.opened_by` | no action |
| `registrations.user_id` | cascade |
| `placements.user_id` | cascade |
| `placements.dropped_by_id` | set null |
| `placements.late_dropped_by_id` | set null |
| `matches.player_a_id`, `matches.player_b_id` | cascade |
| `seeding_locks.holder_id` | cascade |
| `match_results.winner_id`, `match_results.reported_by_id` | cascade |
| `match_results.discussed_with_id`, `confirmed_by_id`, `corrected_by_id` | set null |
| `match_games.winner_id` | cascade |
| `disputes.opened_by_id` | cascade |
| `disputes.resolved_by_id` | set null |
| `motw_selections.selected_by_id` | cascade |
| `feedback_reports.reporter_id` | cascade |
| `regelwerk_acceptances.user_id` | cascade |
| `team_sheets.player_id` | cascade |
| `recording_holds.held_by_id` | cascade |
| `player_replacements.replacement_user_id` | cascade |
| `player_replacements.offered_by_id` | set null |
| `bans.banned_by_id`, `bans.lifted_by_id` | set null |
| `favorites.user_id`, `favorites.player_id` | cascade |
| `tie_orders.decided_by_id` | set null |

`sessions.user_id → users(id) on delete cascade` is added in the same migration.

## Removed

- Row-level security on all 28 tables, the three `profiles` policies on `auth.uid()`, every grant
  and revoke to `anon` / `authenticated` (FR-013).
- The `storage.buckets` insert for `stream-photos`; the bucket is infrastructure, created with
  `gcloud` (docs/deployment.md).
- Everything that read `auth.users` or `raw_user_meta_data` now reads `users.discord_id`.

## Unchanged

`profiles.stream_photo_path` keeps the object path (`<userId>/<uuid>.<ext>`); only the base URL that
turns it into an address changes (FR-015, FR-016). The trigger function `reject_closed_regular_write`
and its four triggers, internal FKs, partial indexes and every other constraint are carried into the
new baseline unchanged (FR-014).
