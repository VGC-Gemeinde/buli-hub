# Research: Umzug von Supabase auf Google Cloud

Facts were checked on 2026-10-21 against Google Cloud, Discord and PostgreSQL documentation, the
Cloud SQL pricing tables, the installed `next` 16.4.2 and `postgres` 3.4.9 sources, and the
fake-gcs-server source. Points marked *unverified* are checked as the first step of the task that
depends on them.

## R1. Cloud SQL instance

- **Decision**: Cloud SQL for PostgreSQL **17** (`--database-version=POSTGRES_17`), **Enterprise**
  edition passed explicitly (`--edition=ENTERPRISE`; for PG 16+ the default is Enterprise Plus),
  zonal, europe-west1, tier **db-f1-micro** (maintainer, 2026-10-21; about $10/month; upgrade to db-g1-small is one `gcloud sql instances patch --tier` with a few minutes of restart, documented in the runbook), 10 GB SSD with automatic
  storage increase, automated daily backups kept 7 days, point-in-time recovery switched on
  explicitly (`--enable-point-in-time-recovery`, off by default from gcloud), public IP with **no
  authorized networks** (only IAM-authorized connector and Auth Proxy connections get in).
- **Rationale**: 17 matches the version the hub runs today and the local stack. Default for new
  instances is 18; staying on 17 keeps the move a move, an upgrade can follow on its own.
  The two shared-core tiers are the only affordable ones; both exist only in Enterprise and
  carry no SLA.

  | Tier | Memory | `max_connections` | europe-west1, zonal | With 10 GB SSD + backups |
  |---|---|---|---|---|
  | db-f1-micro | 0.6 GB | 25 | $7.67/month | about $10/month |
  | db-g1-small | 1.7 GB | 50 | $25.55/month | about $28/month |

  Connection budget on one instance for both environments: production Cloud Run runs up to 3
  instances, staging up to 2 (docs/deployment.md), and `postgres` opens up to 10 connections per
  instance by default, so 50 connections at peak plus admin and the Auth Proxy. On db-f1-micro
  that only fits with the pool capped at 4 per instance (20 at peak, 2 left for admin after the 3
  reserved); on db-g1-small with a cap of 6 (30 at peak). Either way the pool size becomes an
  explicit setting (`DATABASE_POOL_MAX`): **4** on db-f1-micro, for production and staging alike.
  Measured load for scale: about 800 to 1,100 page loads a day (usage stats, October 2026).
- **Alternatives considered**: a dedicated-core tier (db-custom-1-3840, about $50/month): more than
  the hub needs. Two instances: rejected by the maintainer (one instance, two databases). Enterprise
  Plus: no shared-core tiers. Private IP over VPC: needs a VPC connector or Direct VPC egress for
  Cloud Run, more infrastructure for no gain over IAM-authorized public IP.

## R2. Two databases, separate users

- **Decision**: databases `buli_hub` and `buli_hub_staging`, created in SQL with an explicit
  owner: `CREATE ROLE buli_hub LOGIN PASSWORD …; CREATE DATABASE buli_hub OWNER buli_hub;
  REVOKE CONNECT, TEMPORARY ON DATABASE buli_hub FROM PUBLIC;` and the same for staging. The app
  roles are created in SQL, not with `gcloud sql users create`, so they are **not** members of
  `cloudsqlsuperuser`. The built-in `postgres` user stays the admin of both and is used only by
  the runbook.
- **Rationale**: PUBLIC holds CONNECT on every database by default; revoking it and making each app
  role the owner of exactly one database is what keeps staging out of production (spec edge
  case). Users created through gcloud would join `cloudsqlsuperuser` and could reach both.
- **Alternatives considered**: separate schemas in one database: a staging migration would run in
  the same database as production; rejected.

## R3. Connecting

- **Cloud Run**: the built-in Cloud SQL connection (`--add-cloudsql-instances`), socket at
  `/cloudsql/<project>:europe-west1:<instance>`; the runtime service account gets
  `roles/cloudsql.client`. `postgres` (porsager) reaches a socket only through its `host` option
  (a host containing `/` becomes the socket path); `?host=` in the URL is **not** honored. So
  `src/lib/db.ts` reads `DATABASE_URL` (user, password, database) plus an optional
  `DATABASE_SOCKET` and passes it as `host`.
- **GitHub Actions** (`drizzle-kit migrate` in deploy, nightly backup, staging refresh): Cloud SQL
  Auth Proxy v2.26.2, the pinned binary from
  `storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.26.2/cloud-sql-proxy.linux.amd64`,
  started in the background after `google-github-actions/auth@v3` (which exports
  `GOOGLE_APPLICATION_CREDENTIALS`); the deployer service account gets `roles/cloudsql.client`.
  There is no official Action for the proxy. A small composite step in
  `.github/actions/cloud-sql-proxy/` keeps the download, checksum and start in one place for the
  three workflows.
- **Maintainer laptop** (`db:clone-prod`, the switch): `gcloud auth application-default login`,
  then `cloud-sql-proxy --port 5433 <instance>`; connection strings point at `127.0.0.1:5433`.
- **`prepare: false`** existed for Supabase's transaction pooler and is dropped: Cloud SQL is a
  direct connection.
- **Alternatives considered**: authorized networks with the laptop's IP: brittle, and GitHub's
  runner IPs are not fixed. Running migrations inside the container at start: two revisions could
  race, and a failed migration would fail the revision instead of the deploy step.

## R4. Discord sign-in

- **Decision**: authorization code flow with `state` and PKCE, client secret sent in the body.
  - Authorize: `https://discord.com/oauth2/authorize?response_type=code&client_id=…&scope=identify&redirect_uri=…&state=…&code_challenge=…&code_challenge_method=S256`.
  - Token: `POST https://discord.com/api/oauth2/token`, `application/x-www-form-urlencoded`,
    body `grant_type=authorization_code, code, redirect_uri, code_verifier, client_id,
    client_secret`.
  - Identity: `GET https://discord.com/api/users/@me` with the access token; scope `identify`
    returns `id`, `username`, `global_name`, `avatar` (no email). The access token is used once
    and discarded; no refresh token is kept.
  - Avatar: `https://cdn.discordapp.com/avatars/<id>/<hash>.png` when `avatar` is set, else null
    (the hub already falls back to initials). Animated hashes (`a_…`) also render as `.png` (the
    first frame), which is what the hub shows today.
- **Rationale**: Discord's discovery document lists `code_challenge_methods_supported: ["S256"]`
  and `client_secret_post`. `state` plus PKCE covers forged and replayed responses (FR-003).
  Everything is `fetch` and `node:crypto`; no OAuth library (Principle III).
- **Discord app change**: add `<APP_BASE_URL>/auth/callback` for production, staging and
  `http://localhost:3000/auth/callback` as redirect URIs; remove Supabase's callback after the
  move. Same client id and secret, moved from Supabase's provider settings into the hub's
  environment (`DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`).
- **Alternatives considered**: Auth.js / Better Auth (new dependency, rejected by the maintainer);
  Google Identity Platform (no Discord provider; Discord's OIDC support exists but would add a
  second identity system in front of the hub's own users).

## R5. Moving the data

- **Decision**: build the target from the new baseline (`drizzle-kit migrate`), then load
  production's rows with plain `COPY`, with foreign keys dropped for the load and re-added after it
  (which re-validates every row), and the hub's own triggers disabled for the load
  (`ALTER TABLE … DISABLE TRIGGER USER`). The script captures each FK's definition with
  `pg_get_constraintdef` before dropping it, so nothing is hand-written.
- **Rationale**: Cloud SQL's `postgres` is not a superuser. `DISABLE TRIGGER ALL` (system FK
  triggers) and `pg_restore --disable-triggers` need a superuser; `session_replication_role` needs
  the `REPLICATION` attribute (*unverified* on the instance). Dropping and re-adding FKs and
  disabling user triggers need only table ownership, which the migrating role has. Re-adding the
  FKs fails loudly on any orphaned row, which is a verification in itself. Loading into the
  baseline (instead of restoring Supabase's schema and converting it) guarantees that production's
  schema is exactly the one every fresh database gets (FR-012).
- **As built** (2026-10-21): no `pg_dump` in the transfer. `loadIntoTarget` copies each table with
  `COPY … TO STDOUT` from the source connection and `COPY … FROM STDIN` into the target
  transaction, reading each table fully before writing it: piping the two COPY streams into each
  other stalled on real data (target waiting in `ClientRead` mid-table). Rehearsed read-only
  against production Supabase into a throwaway local database: 273 accounts, none without a
  Discord id, 3.8 MB in about 3 seconds, all 31 checks equal, 58 foreign keys restored.
- **Alternatives considered**: restore Supabase's full dump and convert it with a migration: two
  paths to the same schema that could drift; rejected. `--disable-triggers`: not permitted on Cloud
  SQL.

## R6. The new baseline

- **Decision**: the 41 migrations are replaced by a new baseline in `drizzle/` (the `supabase/`
  directory goes away): one migration generated from `schema.ts`, which now contains `users`,
  `sessions` and every FK into `users`, and one custom migration (`drizzle-kit generate --custom`)
  for what `schema.ts` cannot express: `reject_closed_regular_write` and its four triggers, and any
  other non-Drizzle SQL found in the old chain that is not Supabase-specific.
- **Verification** (as at go-live, docs/decisions/migrations-squash-at-launch.md): build the old
  chain and the new baseline into two local databases, `pg_dump --schema-only` both, normalize,
  and diff. The only differences allowed are: `auth`/`storage` schemas, RLS, policies, grants,
  FKs now pointing at `public.users` instead of `auth.users` (same columns, same delete rules), and
  the two new tables.
- **Result** (2026-10-21): `drizzle/0000_baseline.sql` (generated) and
  `drizzle/0001_constraints.sql` (custom: all 57 foreign keys taken from the old schema with
  `auth.users` → `public.users`, the `bans_discord_id_snowflake` check, the
  `disputes_one_open_per_match` index, `reject_closed_regular_write` and its four triggers).
  `schema.ts` declared no FK before and still declares none. The normalized diff of
  `pg_dump --schema-only --schema=public` against the old chain shows only `users`, `sessions`
  and their constraints; RLS and policies were filtered as intended.
- **Rationale**: the old chain cannot run on plain Postgres (it fails at `20260706095505` and
  `20260908183411`), and production gets a fresh database anyway. A new baseline is the precedent.
  The one-time backfill migrations (season 9 user UUIDs etc.) have done their work in production
  and their data comes across with the move.
- **Alternatives considered**: keep the chain and create shim `auth`/`storage` schemas and the
  Supabase roles in plain Postgres: carries Supabase into a system without Supabase forever.

## R7. Stream photos on Cloud Storage

- **Decision, revised after Gate 3** (maintainer, 2026-10-21): stream photos are not public. The
  buckets `buli-hub-stream-photos` and `buli-hub-stream-photos-staging` are private (uniform
  bucket-level access, public access prevention enforced); only the hub's runtime account reads
  them. The hub serves a photo at `/stream-photos/<path>` (`src/app/stream-photos/[...path]/route.ts`)
  to the player and staff through the session, and to the stream through an address carrying an
  HMAC-SHA256 over the path keyed by `STREAM_API_SECRET` (`src/features/stream-photos/access.ts`):
  no expiry, since a new photo is a new path; rotating the secret withdraws every address. Anyone
  else gets 404. gemeinde-streams loads the address as given, so nothing changes on its side. The
  first plan, a public bucket (`allUsers:objectViewer`), was refused by the organization's Domain
  Restricted Sharing policy, and would also have let anyone list every photo.
- **Original decision** (superseded): buckets with `allUsers:objectViewer`, public URL
  `https://storage.googleapis.com/<bucket>/<path>`. Upload with the JSON API, **multipart**
  (`uploadType=multipart`, a JSON metadata part with `contentType` and
  `cacheControl: public, max-age=31536000`, then the bytes), because `uploadType=media` cannot set
  `Cache-Control`. Delete with `DELETE /storage/v1/b/<bucket>/o/<encoded path>`. On Cloud Run the
  access token comes from the metadata server
  (`http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token`,
  header `Metadata-Flavor: Google`); the runtime service account gets
  `roles/storage.objectAdmin` on its bucket only.
- **Org policy**: the `buli-hub` project sits in the vgcgemein.de organization. Organizations
  created since 2024-05-03 enforce `iam.allowedPolicyMemberDomains` by default, which blocks
  `allUsers` bindings. Whether it applies here is *unverified* (the Org Policy API is not enabled
  on the project). The first infrastructure task tries the binding; if it is refused, the
  maintainer, who is organization admin (confirmed 2026-10-21), adds a project exception (runbook). Fallback if no exception is possible:
  serve photos through a hub route that reads the private bucket (decided only if needed).
- **Rationale**: no client library (`@google-cloud/storage` would be a new dependency); three
  small `fetch` calls. Object paths are unchanged and unique per upload, so caching for a year is
  safe, as today.
- **Alternatives considered**: `@google-cloud/storage` (new dependency, more than needed); the XML
  API `PUT` (sets `Cache-Control` in one request, but fake-gcs-server's XML support is not
  documented, and local and production should share one code path).

## R8. Local development and CI without Supabase

- **Decision**: `compose.yaml` with `postgres:17` (port 54322, as today, so `DATABASE_URL` keeps
  its shape) and `fsouza/fake-gcs-server:1.56.1` (`-scheme http -port 4443 -public-host
  localhost:4443`, data directory with an empty `buli-hub-stream-photos` folder so the bucket
  exists). The storage code takes its base URL from `STORAGE_API_URL` (unset = Google) and skips
  the token when it points at the emulator. CI runs the same `postgres:17` as a service container
  and needs no emulator (no test talks to storage).
  - `npm run db:start` / `db:stop` wrap `docker compose up -d` / `down`; `db:reset` drops and
    recreates the local database and runs `drizzle-kit migrate`.
- **Rationale**: the integration tests only need Postgres; the Supabase CLI was there for the
  `auth` schema. fake-gcs-server serves the same JSON API without auth and serves objects
  publicly at `http://localhost:4443/<bucket>/<path>` when `-public-host` matches.
- **Alternatives considered**: a development bucket on real GCS (developers would need
  credentials, and a laptop writing to Google is avoidable); a filesystem stand-in (a second code
  path that production never runs).

## R9. Sessions and the proxy

- **Decision**: the proxy never touches the database. It (a) answers maintenance (R10), (b)
  re-sends the session cookie with a fresh 30-day `Max-Age` when the request carries one, (c)
  deletes Supabase's `sb-*-auth-token*` cookies, and (d) keeps setting `x-pathname` and staging's
  `X-Robots-Tag`. The session is resolved in `currentUser()` (React `cache`, once per request):
  hash the cookie, join `sessions` and `users`, reject if older than 30 days, bump `last_seen_at`
  if older than a day. Server Actions and route handlers that act as a user resolve it the same
  way, as they do today through `currentUser()` / `getUser()`.
- **Rationale**: Next 16's proxy runs on Node, so it could query, but its documentation advises
  against data fetching and session management there (it runs for every prefetch). One indexed
  lookup per request where `currentUser()` runs replaces the Supabase Auth round trip that ran
  there before.
- **Alternatives considered**: a signed stateless cookie (JWT-like): cannot be revoked (FR-005);
  rejected with the clarification.

## R10. Maintenance mode

- **Decision**: `maintenanceMode(env)` (pure) reads `MAINTENANCE=on`. The proxy, before anything
  else, returns `503` JSON for `/api/**` and rewrites every other path except `/impressum`,
  `/datenschutz` and static assets to the internal route `/wartung` (rendered from the approved
  mockup), with status 503 and `Retry-After: 3600`. While on, the root layout skips the footer's
  `currentUser()` and the page-load counter; the legal pages and `/wartung` never touch the
  database. Switched with `gcloud run services update --update-env-vars MAINTENANCE=on` and
  `--remove-env-vars MAINTENANCE` (a new revision of the same image).
- **Verified** (2026-10-21, running app): `NextResponse.rewrite(url, { status: 503 })` keeps the
  status for the App Router page; every route answered 503 with the page, Server Action POSTs
  included, the legal pages 200, the APIs a JSON 503, and the database saw no write.
- **Alternatives considered**: a separate maintenance container or Cloud Run traffic switch: more
  infrastructure, and the legal pages would have to be duplicated.

## R11. Dependencies

- **Removed**: `@supabase/ssr`, `@supabase/supabase-js`.
- **Added**: none. `node:crypto`, `fetch` and the existing `postgres`/`drizzle-orm` cover
  everything. Tools outside npm: Docker (already required by the Supabase CLI), the Cloud SQL Auth
  Proxy binary (maintainer and CI, pinned), `gcloud` (already used).
