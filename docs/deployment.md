# Deployment runbook

Production = one Cloud Run service (region **europe-west1**, Belgium — Cloud Run domain mapping is not available in Frankfurt) +
one database on a Cloud SQL instance it shares with staging + one Cloud Storage
bucket for stream photos. Every push to `main` deploys via
`.github/workflows/ci.yml` (checks → image → migrations → deploy). This
runbook is the one-time setup; keep it current when infrastructure changes.

The hub ran on Supabase until `specs/004-google-cloud-migration`; §10 is the
switch from there, kept as history once it has run.

Placeholders used below: `buli-hub` (the GCP project id), `<DOMAIN>`
(production: `buli.vgcgemein.de`), `<GH_REPO>` (e.g. `owner/buli-hub`),
`<PROJECT_NUMBER>` (the project's number, `gcloud projects describe buli-hub
--format='value(projectNumber)'`).

## 1. Cloud SQL and Cloud Storage

The project and its APIs come from §2; when starting from scratch, run that
first and come back here. Everything below is shared by production and
staging: one instance, one database and one login role per environment, one
bucket per environment (`specs/004-google-cloud-migration`, research.md R1,
R2, R7).

### Instance

```bash
gcloud sql instances create buli-hub-db \
  --database-version=POSTGRES_17 --edition=ENTERPRISE --tier=db-f1-micro \
  --region=europe-west1 --availability-type=zonal \
  --storage-type=SSD --storage-size=10GB --storage-auto-increase \
  --backup-start-time=01:00 --retained-backups-count=7 \
  --enable-point-in-time-recovery --retained-transaction-log-days=7
# The three database passwords live in Secret Manager, generated there and
# read back only where a command needs one (hex, so they need no URL escaping):
for name in CLOUDSQL_PASSWORD_ADMIN CLOUDSQL_PASSWORD_BULI_HUB CLOUDSQL_PASSWORD_BULI_HUB_STAGING; do
  openssl rand -hex 24 | tr -d '\n' | gcloud secrets create $name --data-file=-
done
gcloud sql users set-password postgres --instance=buli-hub-db \
  --password="$(gcloud secrets versions access latest --secret=CLOUDSQL_PASSWORD_ADMIN)"
```

- **PostgreSQL 17**, the version the hub ran on Supabase and the one the local
  stack runs; gcloud's default for new instances is newer. A major upgrade is
  its own step later.
- **`--edition=ENTERPRISE` is not optional**: for PostgreSQL 16 and later the
  default is Enterprise Plus, which has no shared-core tiers.
- **db-f1-micro**, about **$10/month** including 10 GB SSD and backups. It has
  no SLA and **25 connections** (3 reserved). The upgrade path is one command
  and a few minutes of restart, about $28/month for 50 connections:

  ```bash
  gcloud sql instances patch buli-hub-db --tier=db-g1-small
  ```

  The instance is shared with gemeinde-tours (its own databases
  `gemeinde_tours` and `gemeinde_tours_staging`, its own roles; gemeinde-tours
  `docs/deployment.md` and `specs/001-server-foundation/`), and so is the
  connection budget. Keep this table in step with the one there:

  | Service | Max instances | Pool | Connections |
  |---|---|---|---|
  | buli-hub production | 3 | 4 | 12 |
  | buli-hub staging | 1 | 4 | 4 |
  | gemeinde-tours production | 3 | 1 | 3 |
  | gemeinde-tours staging | 1 | 1 | 1 |
  | Auth Proxy (both repositories' CI, backups, clones, your `psql`) | | | 2 |
  | **Total** | | | **22** |

  A deploy briefly runs old and new instances side by side; `remaining
  connection slots are reserved` in the logs means the budget is spent, and the
  answer is the tier above, not a bigger pool.
- **Backups**: daily, 7 kept; **point-in-time recovery** is off by default from
  gcloud, hence the explicit flag. Start time in UTC, ahead of the nightly dump
  at 03:17 (§4).
- **Public IP with no authorized networks.** Nothing reaches the instance by
  address: Cloud Run connects through its built-in connector and everything
  else through the Cloud SQL Auth Proxy, both authorized by IAM
  (`roles/cloudsql.client`). Never add an authorized network.

The built-in `postgres` user is the instance admin. It is used only for the
setup below and never by the hub.

### Databases and roles

Connect as `postgres` through the Auth Proxy (§6 has the install):

```bash
gcloud auth application-default login
cloud-sql-proxy --port 5433 buli-hub:europe-west1:buli-hub-db &
psql "postgresql://postgres:<admin password>@127.0.0.1:5433/postgres"
```

```sql
CREATE ROLE buli_hub LOGIN PASSWORD '<production password>';
CREATE DATABASE buli_hub OWNER buli_hub;
REVOKE CONNECT, TEMPORARY ON DATABASE buli_hub FROM PUBLIC;

CREATE ROLE buli_hub_staging LOGIN PASSWORD '<staging password>';
CREATE DATABASE buli_hub_staging OWNER buli_hub_staging;
REVOKE CONNECT, TEMPORARY ON DATABASE buli_hub_staging FROM PUBLIC;
```

- The roles are created **in SQL, not with `gcloud sql users create`**: users
  made through gcloud join `cloudsqlsuperuser` and could open both databases.
  Every Postgres database grants `CONNECT` to `PUBLIC` by default; revoking it,
  and making each role the owner of exactly one database, is what keeps staging
  out of production.
- If `CREATE DATABASE` answers `must be able to SET ROLE "buli_hub"` (PostgreSQL
  16+ does not let the creator of a role act as it by default), run
  `GRANT buli_hub TO postgres;` first, likewise for staging. The same goes for a
  `REVOKE` that prints `WARNING: no privileges could be revoked`: it did nothing,
  and the check below fails.
- Each environment's migrations run as its own role (§3), so every table
  belongs to the role the app connects as. Never migrate as `postgres`.

**Check**, and keep the result: the staging role must be refused by the
production database, and the other way round.

```bash
psql "postgresql://buli_hub_staging:<staging password>@127.0.0.1:5433/buli_hub" -c 'select 1'
# FATAL:  permission denied for database "buli_hub"
psql "postgresql://buli_hub:<production password>@127.0.0.1:5433/buli_hub_staging" -c 'select 1'
# FATAL:  permission denied for database "buli_hub_staging"
```

The schema arrives through `drizzle-kit migrate` (the deploy workflow, or §10
for the first fill); nothing is applied by hand.

### Buckets

```bash
for bucket in buli-hub-stream-photos buli-hub-stream-photos-staging; do
  gcloud storage buckets create "gs://$bucket" --location=europe-west1 \
    --uniform-bucket-level-access --public-access-prevention
done
```

The buckets are **private** (decided 2026-10-21): stream photos are for the
player, staff and the stream only. Nothing but the hub's runtime account
(IAM below) reads them; the hub serves them at `/stream-photos/<path>`, to
the player and staff through the session and to the stream through the signed
address the stream API hands out (HMAC over the path, keyed by
`STREAM_API_SECRET`; rotating that secret withdraws every address given out).
`--public-access-prevention` makes sure no one ever grants `allUsers` on them;
the organization's Domain Restricted Sharing policy would refuse it anyway.

Check: `curl -sI https://storage.googleapis.com/buli-hub-stream-photos/<any object>`
answers 403 without credentials, and
`https://<hub>/stream-photos/<path>` answers 404 when signed out.

### IAM

Production runs as the project's default compute service account, staging as
an account of its own (decided 2026-10-21), so IAM, not configuration, keeps
staging out of production's bucket. Each gets the Cloud SQL connector and write
access to its own photo bucket only:

```bash
PROD_SA=<PROJECT_NUMBER>-compute@developer.gserviceaccount.com
gcloud iam service-accounts create buli-hub-staging-run \
  --display-name="buli-hub staging runtime"
STAGING_SA=buli-hub-staging-run@buli-hub.iam.gserviceaccount.com

for sa in "$PROD_SA" "$STAGING_SA"; do
  gcloud projects add-iam-policy-binding buli-hub \
    --member="serviceAccount:$sa" --role=roles/cloudsql.client
done
gcloud storage buckets add-iam-policy-binding gs://buli-hub-stream-photos \
  --member="serviceAccount:$PROD_SA" --role=roles/storage.objectAdmin
gcloud storage buckets add-iam-policy-binding gs://buli-hub-stream-photos-staging \
  --member="serviceAccount:$STAGING_SA" --role=roles/storage.objectAdmin

# Staging reads its own secrets (the *_STAGING / *_TEST ones of §7):
for secret in DATABASE_URL_STAGING DISCORD_CLIENT_SECRET_STAGING DISCORD_BOT_TOKEN_TEST \
              JOBS_SECRET_STAGING STREAM_API_SECRET_STAGING; do
  gcloud secrets add-iam-policy-binding "$secret" \
    --member="serviceAccount:$STAGING_SA" --role=roles/secretmanager.secretAccessor
done

# The deployer deploys revisions that run as it:
gcloud iam service-accounts add-iam-policy-binding "$STAGING_SA" \
  --member="serviceAccount:github-deployer@buli-hub.iam.gserviceaccount.com" \
  --role=roles/iam.serviceAccountUser
```

`objectAdmin` is granted per bucket, never on the project, so neither account
can touch the backups bucket, and the staging account cannot touch production's
photos. The staging service is switched to its account once
(`gcloud run services update buli-hub-staging --service-account=$STAGING_SA`);
CI deploys keep it.

The deployer service account needs `roles/cloudsql.client` too, for migrations,
the nightly backup and the staging refresh (§2).

### Discord application

Sign-in is the hub's own (authorization code with state and PKCE, scope
`identify` only; `specs/004-google-cloud-migration`, contracts/session.md).
Discord sends the browser back to `/auth/callback` on the host the sign-in
started on, so every address the hub is reachable under must be registered as
a redirect in the Developer Portal (*OAuth2* → *Redirects*, then *Save
Changes*). A Cloud Run service answers under two `run.app` names
(`<service>-<project number>.<region>.run.app` and `<service>-<hash>-ew.a.run.app`);
register both where people may use them:

- **production application**: `https://buli.vgcgemein.de/auth/callback`;
- **non-production application** (§7): `https://buli-hub-staging-225990213981.europe-west1.run.app/auth/callback`,
  `https://buli-hub-staging-a2336uoihq-ew.a.run.app/auth/callback`
  and `http://localhost:3000/auth/callback`.

Supabase's `https://<ref>.supabase.co/auth/v1/callback` stays registered until
the move is done, and is removed afterwards (§10).

### Locally

None of the above exists on a laptop. `npm run db:start` starts `compose.yaml`:
`postgres:17` on port **54322** and the Cloud Storage emulator
`fake-gcs-server` 1.56.1 on **4443**; `npm run db:reset` rebuilds the local
database from `drizzle/`. `.env.example` holds the matching values.

## 2. Google Cloud project

```bash
gcloud projects create buli-hub   # or reuse; link billing
gcloud config set project buli-hub
gcloud services enable run.googleapis.com artifactregistry.googleapis.com \
  iamcredentials.googleapis.com secretmanager.googleapis.com \
  monitoring.googleapis.com sqladmin.googleapis.com storage.googleapis.com
gcloud artifacts repositories create buli-hub --repository-format=docker \
  --location=europe-west1
```

### Deployer service account + Workload Identity Federation

```bash
gcloud iam service-accounts create github-deployer
gcloud projects add-iam-policy-binding buli-hub \
  --member="serviceAccount:github-deployer@buli-hub.iam.gserviceaccount.com" \
  --role="roles/run.admin"
gcloud projects add-iam-policy-binding buli-hub \
  --member="serviceAccount:github-deployer@buli-hub.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"
# Migrations, backup and staging refresh reach Cloud SQL through the Auth Proxy.
gcloud projects add-iam-policy-binding buli-hub \
  --member="serviceAccount:github-deployer@buli-hub.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"
gcloud iam service-accounts add-iam-policy-binding \
  "$(gcloud iam service-accounts list --filter=compute --format='value(email)')" \
  --member="serviceAccount:github-deployer@buli-hub.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud iam workload-identity-pools create github --location=global
gcloud iam workload-identity-pools providers create-oidc github \
  --location=global --workload-identity-pool=github \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='VGC-Gemeinde/buli-hub'"
gcloud iam service-accounts add-iam-policy-binding \
  github-deployer@buli-hub.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/github/attribute.repository/VGC-Gemeinde/buli-hub"
```

### Secrets (runtime, injected into Cloud Run)

```bash
# User, password and database only: on Cloud Run the host is the socket in DATABASE_SOCKET.
printf '%s' 'postgresql://buli_hub:<password>@localhost/buli_hub' | gcloud secrets create DATABASE_URL --data-file=-
printf '%s' '<client secret>' | gcloud secrets create DISCORD_CLIENT_SECRET --data-file=-   # production Discord application
printf '%s' '<value>' | gcloud secrets create DISCORD_BOT_TOKEN --data-file=-
openssl rand -hex 32 | tr -d '\n' | gcloud secrets create JOBS_SECRET --data-file=-   # scheduled job routes, see §8
openssl rand -hex 32 | tr -d '\n' | gcloud secrets create STREAM_API_SECRET --data-file=-   # stream API, see §9
# Grant the *runtime* service account access:
gcloud secrets add-iam-policy-binding DATABASE_URL \
  --member="serviceAccount:<PROJECT_NUMBER>-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"   # repeat per secret
```

Secrets mounted as `:latest` are resolved **when an instance starts**, not when
the revision is deployed. A new version therefore reaches the next cold start
without a deploy, which is why the switch in §10 adds the Cloud SQL version of
`DATABASE_URL` only at its own step and not during setup.

### Cloud Run service (first deploy creates it; then pin the config)

```bash
gcloud run deploy buli-hub --image <first image> --region europe-west1 \
  --no-invoker-iam-check \
  --min-instances=0 --max-instances=3 --memory=512Mi \
  --add-cloudsql-instances=buli-hub:europe-west1:buli-hub-db \
  --set-secrets=DATABASE_URL=DATABASE_URL:latest,DISCORD_CLIENT_SECRET=DISCORD_CLIENT_SECRET:latest,DISCORD_BOT_TOKEN=DISCORD_BOT_TOKEN:latest,JOBS_SECRET=JOBS_SECRET:latest,STREAM_API_SECRET=STREAM_API_SECRET:latest \
  --set-env-vars=APP_BASE_URL=https://<DOMAIN>,DATABASE_SOCKET=/cloudsql/buli-hub:europe-west1:buli-hub-db,DATABASE_POOL_MAX=4,DISCORD_CLIENT_ID=1393596376591499365,STREAM_PHOTOS_BUCKET=buli-hub-stream-photos,DISCORD_GUILD_ID=…,DISCORD_ROLE_ID_DEV=…,DISCORD_ROLE_ID_ADMIN=…,DISCORD_ROLE_ID_STAFF=…,DISCORD_ROLE_ID_MOTW=…,DISCORD_RESULTS_TOP_CHANNEL_ID=…,DISCORD_RESULTS_CHANNEL_ID=…,DISCORD_MOTW_CHANNEL_ID=…,DISCORD_FEEDBACK_FORUM_CHANNEL_ID=…,DISCORD_FEEDBACK_TAG_BUG=…,DISCORD_FEEDBACK_TAG_IDEA=…,DISCORD_LEAGUE_CATEGORY_ID=…,DISCORD_ROLE_ID_BULI_PLAYER=…
```

`min-instances=0` all year: the service scales to zero, and the first request
after a quiet spell waits for a cold start.
Later deploys from CI swap the image and set `APP_BUILD_SHA` to the deployed
commit (`--update-env-vars`, so everything else sticks to the service).
`--no-invoker-iam-check` (instead of `--allow-unauthenticated`): the GCP
project sits under the VGC-Gemeinde organization, whose Domain Restricted
Sharing policy forbids `allUsers` IAM bindings — this flag is Cloud Run's
supported way to serve public traffic under that policy.

The database settings, each for a reason:

- `--add-cloudsql-instances` mounts the instance's socket at
  `/cloudsql/buli-hub:europe-west1:buli-hub-db`. `DATABASE_SOCKET` hands that
  path to the driver: `postgres.js` reaches a socket only through its `host`
  option, never through `?host=` in the URL (`src/lib/db.ts`).
- `DATABASE_POOL_MAX=4`: the connection budget of the shared instance (§1).
- `APP_BASE_URL` and `STREAM_API_SECRET` also sign the stream photo addresses
  the stream API hands out (§1, "Buckets"); without either, the stream gets no
  photos.

### Discord feedback forum

The in-app "Feedback geben" dialog opens one forum post per report.
`DISCORD_FEEDBACK_FORUM_CHANNEL_ID` may point at a forum in **any guild the
bot is a member of** — the API addresses channels by id alone — so reports can
live on the staff server while `DISCORD_GUILD_ID` stays the main server. To
use a second server, invite the same bot there and give it *View Channel*,
*Create Posts* and *Send Messages in Posts* on the forum.

The reporter only gets a "zum Thread" link when the thread's guild is
`DISCORD_GUILD_ID`; on any other server the app shows a plain thank-you
instead of a link the reporter cannot open. Moving the forum to the main
server later switches the links on by itself — but **the tag ids change with
the forum**, so `DISCORD_FEEDBACK_TAG_BUG` / `_IDEA` must be updated at the
same time. They fail silently: posts are simply created untagged.

### Domain

Cloud Run → custom domain mapping for `<DOMAIN>`, then set the DNS records
it prints at the registrar. `APP_BASE_URL`, the Discord redirect
`<APP_BASE_URL>/auth/callback` (§1), and the Datenschutz page's imprint must
all match the final domain.

### Shared sign-in across the Gemeinde sites

The hub issues and checks its own session (`specs/004-google-cloud-migration`,
`contracts/session.md`, which supersedes 003's contract). One runtime variable
decides the cookie (`src/lib/auth/cookie-options.ts`):

| `AUTH_COOKIE_DOMAIN` | Cookie |
|---|---|
| unset (local, staging, and production for now) | `buli-hub-auth`, host-only |
| `.vgcgemein.de` (production only) | `gemeinde-auth` on `Domain=.vgcgemein.de` |

**Leave it unset until another Gemeinde site reads the hub's session.** The
next one planned is the tournament site (gemeinde-tours, turniere.vgcgemein.de);
it joins through a contract of its own, in a later spec, and that spec also
brings back the privacy page's sentence on the shared cookie. Until then the
setting shares nothing. gemeinde-tippspiel, the only other site that signed in
with Discord, is offline since 2026-10-21. The two names differ so a host-only
cookie can never shadow the domain one while the setting is being switched on.

When the time comes, it is one command, kept by every CI deploy:

```bash
gcloud run services update buli-hub --region europe-west1 \
  --update-env-vars=AUTH_COOKIE_DOMAIN=.vgcgemein.de
```

Never on staging or locally. And once it is set, every `*.vgcgemein.de` host
must be operated by the Gemeinde: the session cookie is sent to all of them, so
a subdomain pointed at a third-party service would receive every player's
session.

### Sitzungen beenden

A session lives 30 days from its last use; signing out in the app ends it in
that browser only. To end **every** session of one account (a lost device, a
compromised Discord account), delete its rows through the Auth Proxy (§6). There
is no UI for this.

```bash
cloud-sql-proxy --port 5433 buli-hub:europe-west1:buli-hub-db &
psql "postgresql://buli_hub:<password>@127.0.0.1:5433/buli_hub" -c \
  "delete from sessions where user_id = (select id from users where discord_id = '<discord id>');"
```

The account's next request is signed out, on every device. `DELETE 0` means it
had no session, or the Discord id is wrong. This ends sessions, it does not
block sign-in: the same Discord account can sign in again right away.

## 3. GitHub repository configuration

Settings → Environments → **PROD** (the deploy job declares
`environment: PROD` — values anywhere else are not injected):

| Kind | Name | Value |
|---|---|---|
| Variable | `GCP_PROJECT_ID` | `buli-hub` |
| Variable | `GCP_REGION` | `europe-west1` |
| Variable | `GCP_ARTIFACT_REPO` | `buli-hub` |
| Variable | `GCP_SERVICE` | `buli-hub` |
| Variable | `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/github/providers/github` |
| Variable | `GCP_DEPLOYER_SA` | `github-deployer@buli-hub.iam.gserviceaccount.com` |
| Variable | `CLOUD_SQL_INSTANCE` | `buli-hub:europe-west1:buli-hub-db` |
| Secret | `PROD_DATABASE_URL` | `postgresql://buli_hub:<password>@127.0.0.1:5432/buli_hub` |

`PROD_DATABASE_URL` is an **Auth Proxy string**: the deploy's migration step and
the nightly backup start the proxy on `127.0.0.1:5432`
(`.github/actions/cloud-sql-proxy`, pinned v2.26.2 with its checksum) and
connect through it. It uses the app's own role, so migrations create objects
the app owns. Staging's values are in §7.

## 4. Observability & backups (minimal)

- **Uptime check** (Cloud Monitoring) on `https://<DOMAIN>/` + alert to the
  maintainer's email.
- **Log-based alert**: Cloud Run revision logs, filter `severity>=ERROR`,
  notify on new entries (catches failed Discord syncs — they log via
  `console.error`).
- **Backups** come in two layers that cover different failures.

  **Cloud SQL's own** (§1): a daily automated backup of the instance, 7 kept,
  and point-in-time recovery over the same 7 days. They are the fast way back
  from a bad migration or a mistaken write, but they live in the instance and
  cover **both databases at once**: restoring a backup onto `buli-hub-db`
  rewinds staging too. To bring back production alone, clone the instance to
  the moment before the damage, take `buli_hub` out of the clone, and delete it:

  ```bash
  gcloud sql instances clone buli-hub-db buli-hub-db-restore \
    --point-in-time='2026-11-02T18:00:00Z'
  cloud-sql-proxy --port 5434 buli-hub:europe-west1:buli-hub-db-restore &
  pg_dump --schema=public --schema=drizzle --no-owner --no-privileges \
    --file=restore.sql "postgresql://buli_hub:<password>@127.0.0.1:5434/buli_hub"
  # load restore.sql as in "Restoring" below, against production in maintenance (§10)
  gcloud sql instances delete buli-hub-db-restore
  ```

  **The nightly copy outside the instance**: `.github/workflows/backup.yml`
  dumps production to `gs://buli-hub-backups/nightly/` every night at 03:17
  UTC, and on demand via *Run workflow*. It is the plain-format copy that
  outlives the instance itself, next to a repository that contains a script
  whose job is to drop and recreate schemas. It runs `pg_dump --schema=public
  --schema=drizzle --no-owner --no-privileges` through the Auth Proxy (accounts
  live in `public.users`, so that is the whole hub), then mirrors the photos
  with `gcloud storage rsync` from `gs://buli-hub-stream-photos` to
  `gs://buli-hub-backups/stream-photos`. The mirror only adds: a photo a player
  removed stays in the backup.

  The workflow refuses to upload a dump that looks empty (no `public.users`
  rows, or fewer than ten tables), so a silent auth failure cannot quietly
  replace a good backup with a useless one.

  The deploy service account holds `objectCreator` and `objectViewer` on the
  backups bucket and nothing more. It can write new archives and read them back,
  but it cannot delete or overwrite one, so a compromised workflow cannot
  destroy history. (`objectCreator` alone is not enough: `gcloud storage cp`
  reads the destination before writing.) It reads the photos through its own
  `objectViewer` on the private photo bucket:

  ```bash
  gcloud storage buckets add-iam-policy-binding gs://buli-hub-stream-photos \
    --member="serviceAccount:github-deployer@buli-hub.iam.gserviceaccount.com" \
    --role=roles/storage.objectViewer
  # `gcloud storage rsync` also reads both buckets themselves (storage.buckets.get),
  # which objectViewer does not cover; legacyBucketReader adds that, read-only:
  for b in buli-hub-stream-photos buli-hub-backups; do
    gcloud storage buckets add-iam-policy-binding gs://$b \
      --member="serviceAccount:github-deployer@buli-hub.iam.gserviceaccount.com" \
      --role=roles/storage.legacyBucketReader
  done
  ```

  Take a manual backup before anything risky — a migration that rewrites data,
  or any `db:clone-prod` run — either with the button or by hand, through the
  Auth Proxy on 5433 (§6):

  ```bash
  STAMP=$(date -u +%Y-%m-%dT%H-%M-%SZ); D=$(mktemp -d)
  pg_dump --schema=public --schema=drizzle --no-owner --no-privileges \
    --file="$D/app.sql" "$PROD_DATABASE_URL"
  tar -czf "$D/buli-hub-$STAMP.tar.gz" -C "$D" app.sql
  gcloud storage cp "$D/buli-hub-$STAMP.tar.gz" gs://buli-hub-backups/manual/
  ```

  `gs://buli-hub-backups` (europe-west1) is private, uniform-access,
  public-access-prevented and versioned.

  **Restoring** an archive into the local stack, which is also how a backup is
  checked:

  ```bash
  npm run db:start
  gcloud storage ls gs://buli-hub-backups/nightly/ | tail -1
  gcloud storage cp gs://buli-hub-backups/nightly/buli-hub-<stamp>.tar.gz . \
    && tar -xzf buli-hub-<stamp>.tar.gz                        # → app.sql
  LOCAL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
  psql "$LOCAL" -c 'drop schema if exists drizzle cascade; drop schema if exists public cascade;'
  psql --variable=ON_ERROR_STOP=1 --file=app.sql "$LOCAL"
  npm run db:migrate          # applies whatever is newer than the archive
  ```

  The dump recreates both schemas; `--no-owner --no-privileges` makes every
  object belong to whoever loads it. Restoring production is the same two
  `psql` lines against the Auth Proxy as `buli_hub`, with the hub in maintenance
  (§10), followed by `gcloud storage rsync --recursive
  gs://buli-hub-backups/stream-photos gs://buli-hub-stream-photos` when photos
  are missing.

  Archives expire after 180 days (non-current versions after 30). Cost is not a
  consideration: the whole database is ~3.6 MB and compresses to ~75 KB, so
  daily backups run around **$0.001/month** — even fifty times the current data
  stays under three cents.

- **Usage statistics** (`/staff/nutzung`, admin+; `docs/plans/usage-stats.md`)
  count page loads into the app database themselves, so nothing here needs
  setting up. One thing is run once, by hand: **the log backfill.** Cloud Run
  keeps request logs for **30 days** (the `_Default` log bucket's retention,
  unless raised in Logging → Logs Storage), so the month before the feature
  deployed can be replayed into the counters. Do it soon after the deploy,
  before that window moves on. It writes to production through the Auth Proxy
  (§6), with `PROD_DATABASE_URL` on `127.0.0.1:5433`:

  ```bash
  gcloud auth login                       # needs read access to the project's logs
  cloud-sql-proxy --port 5433 buli-hub:europe-west1:buli-hub-db &
  npm run usage:backfill                  # dry run: prints what would be written
  npm run usage:backfill -- --apply       # writes to PROD_DATABASE_URL, once
  ```

  The script reduces every log row to an opaque visitor token on your machine
  (no address is sent anywhere), stops at the instant live counting began so
  the boundary day is not counted twice, and refuses to run a second time. A
  local rehearsal is `--target=$DATABASE_URL`. Staging is not backfilled.

## 5. Dress rehearsal (before announcing)

On the deployed service: sign in with a real Discord account → role sync
picks up the real guild roles → open a throwaway registration → register →
close → seed → create schedule → report a match → the post appears in the
results channel → drop/un-drop a player → wipe the throwaway season
(open a fresh registration window when the real one starts). Verify the
uptime check is green and a forced error shows up in Cloud Logging.

## 6. Cloning production

`npm run db:clone-prod` copies production into another database and turns it
into a test fixture. It solves two problems the local stack cannot:

- **Migrations are otherwise only ever tested against an empty database.** CI
  builds the schema from scratch with no rows in it, so the migrations that
  actually break — a `NOT NULL` on a column that has nulls, a unique index
  existing rows violate, a backfill that is instant on 10 rows — can only fail
  in production, during a deploy.
- **Features are otherwise only ever tested against invented data.** Seed
  fixtures cover the edge cases you thought of. The half-finished season, the
  division with an odd player count, the player who dropped mid-matchday and
  the name with an emoji in it are the ones you didn't.

### Prerequisites

- `pg_dump` and `psql` on PATH, at least as new as the server's major version
  (`pg_dump` refuses to dump from a newer server). Cloud SQL runs 17; the
  script checks this and names the version you need. Ubuntu ships 16; newer
  needs the PGDG repository.
- The **Cloud SQL Auth Proxy**, pinned to v2.26.2 like CI
  (`.github/actions/cloud-sql-proxy/action.yml` holds the checksum):

  ```bash
  curl -fsSL -o ~/.local/bin/cloud-sql-proxy \
    https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.26.2/cloud-sql-proxy.linux.amd64
  chmod +x ~/.local/bin/cloud-sql-proxy
  gcloud auth application-default login     # once; the proxy signs in with these credentials
  cloud-sql-proxy --port 5433 buli-hub:europe-west1:buli-hub-db
  ```

  The instance has no authorized networks (§1), so the proxy is the only way in
  from a laptop. Your Google account needs `roles/cloudsql.client` (project
  owners have it).
- `PROD_DATABASE_URL` in `.env`, through the proxy:

  ```
  postgresql://buli_hub:<password>@127.0.0.1:5433/buli_hub
  ```

**The port is the safety line.** The test suite and `npm run db:reset` accept
only `127.0.0.1`/`localhost` on port **54322**, the compose stack
(`src/test/local-database.ts`), and `db:clone-prod` treats every other port as a
hosted database. The proxy also listens on 127.0.0.1, so the host alone proves
nothing. Run it on 5433 (or any port but 54322), **never on 54322**: there it
would make production look local to every guard in the repository.

> `DATABASE_URL` stays pointed at the local stack — it is the *write target*,
> and it is also what `npm run dev`, `drizzle-kit` and the integration tests
> use. Putting a production string there points the whole toolchain at
> production; the test suite truncates tables on startup.

> **`npm test` destroys a clone.** The integration tests clear shared tables in
> `beforeAll`, against whatever `DATABASE_URL` points at. That is harmless — it
> is only ever the local stack — but it means a clone and a test run cannot
> coexist. Re-run `db:clone-prod` afterwards; it takes well under a minute.

### Usage

```bash
npm run db:clone-prod -- --dry-run                 # show the plan, touch nothing
npm run db:clone-prod                              # clone as-is into the local stack
npm run db:clone-prod -- --shift="30 days"         # …and move every date 30 days later
npm run db:clone-prod -- --shift="-2 weeks 6 hours"
```

`--shift` is the highest-value flag: a dump is frozen at one moment in the
season, and offsetting every timestamp by one interval moves "today" to
wherever the test needs it — the day before a deadline, mid-matchday,
post-season. The same interval applies to every timestamp column in `public`
(enumerated from `information_schema`, so new tables are covered automatically),
which is what keeps the data internally consistent.

Full flag list: `npm run db:clone-prod -- --help`.

### What it does

1. **Dump** `public` and the `drizzle` journal from production, with
   `--no-owner --no-privileges`: the owning roles differ between Cloud SQL and
   the target, and the schema relies on no grant. Accounts live in
   `public.users`, so that is the whole hub. Read-only; production is never
   written to.
2. **Restore** into the target, replacing its `public` and `drizzle` schemas
   outright.
3. **Scrub** (only with `--scrub`, see below).
4. **Clear `discord_posts`** — the copied rows point at message ids in the
   production channels, which the local/staging bot cannot reach.
5. **Shift dates** (only with `--shift`).
6. **Migrate.** Because the drizzle journal came across with the dump, the
   target inherits production's migration position, so `drizzle-kit migrate`
   applies exactly the migrations production has not seen yet — against
   production-shaped data. **This step is the migration rehearsal.** If it
   fails here, it would have failed in production.

### The privacy rule

Cloning copies real personal data: Discord ids, usernames, nicknames, avatars,
social handles, the free text players wrote about themselves, and their
competitive history.

**Scrub when the clone lands somewhere that widens access.**

- *Local clone → no scrub.* You already have production database access; a
  clone on your own machine does not expand who can see the data, and
  scrubbing would only reduce the realism you are cloning for.
- *Staging clone → scrub.* Staging is reachable by more people. The script
  enforces this: a non-local target without `--scrub` is refused.

Everyone at **staff or above** (`profiles.role` of `staff`, `admin` or `dev`)
is exempt from everything below, so those people sign in as themselves and land
on their own copied data. They are the people who have staging access anyway,
which is why exempting them widens nothing — and it needs no list to maintain:
a role change in Discord is carried by the next refresh. Users below staff, and
users with no profile row at all, are scrubbed.

**What `--scrub` rewrites**

| Kind | Fields | Treatment |
|---|---|---|
| Identity | `profiles.display_name`, `username`, `avatar_url`; `users.discord_id` | replaced with synthetic values (Discord ids far above the real range) |
| Social | `profiles.twitter_handle`, `bluesky_handle` | replaced, null stays null |
| Free text | `registrations.prev_name`, `greatest_achievements`; `disputes.reason`, `note` | replaced, null and rough length preserved |
| Quasi-identifier | `registrations.prev_season` / `prev_division` / `prev_placement` | **permuted between users** |

Three of those choices are deliberate and worth keeping:

- **Replaced, never deleted.** Nulling the social handles would mean no cloned
  profile ever renders a social link, so that part of the UI would go untested
  against realistic data — the opposite of why the clone exists. Same reason
  null-ness and rough length are preserved in the free-text fields.
- **Synthetic names keep what breaks layouts** — umlauts, emoji, very long
  names, mention-like strings, right-to-left text. Anonymising into
  "User 1..N" would remove exactly the realism being cloned for. A unit test
  asserts the fixture list still has each property.
- **Veteran history is permuted, not cleared.** A past season/division/
  placement triple is a published result, and nearly all of them are unique, so
  it names a real person however the display name reads. Permuting keeps the
  multiset of values — the seeding tool still sees a realistic spread — while
  no row keeps the history of the person it belongs to.

`profiles.origin` is left alone on purpose: roughly a dozen distinct values
across the whole user base makes it a category rather than free text.

### What the scrub cannot do

**A clone is pseudonymised, not anonymised.** Once a season is running, the
placements, matches and results come across identically to production. Anyone
holding both the staging data and the published standings can re-link every
player — "whoever is 7–0 at the top of Division 1a" is one person, whatever
name is displayed. That is inherent to cloning for realism: the shape of the
data cannot be preserved and its linkage removed at the same time.

So the scrub is not the primary control. The staging URL is unlisted and
`noindex`, and `/dev` needs `DEV_TOOLS_TOKEN` — those are what limit who holds
the data in the first place. `users.created_at` and the user UUIDs also
survive, being needed for foreign keys and weakly identifying at most.

### Safety

The script drops and recreates the target's `public` and `drizzle` schemas, so
it refuses to run when:

- source and target are the same database — asked of the servers themselves
  (cluster `system_identifier` and database oid), because production and
  staging share one instance and, behind one Auth Proxy, one host and port,
- the target is `PROD_DATABASE_URL`,
- the target is not local (127.0.0.1/localhost on 54322) and
  `CLONE_ALLOW_REMOTE_TARGET=true` is not set,
- the target is not local and `--scrub` was not passed.

### Working with cloned data

`/dev` gains a picker listing every copied user with their role and division.
Choosing one signs you in as that person via `/dev/login-as`, so you see
exactly their season, matches and results — the fastest way to reproduce
what a player reports. Role sync stays off outside production
(`DISCORD_GUILD_ID` and the three role ids unset), so the roles that came
across in the clone freeze exactly as they were.

## 7. Staging environment

A second deployment fed by cloned production data, so features and migrations
meet realistic data before production does. Local development covers most of
that (§6); staging exists for what local cannot do — rehearse migrations at
production data volume against Cloud SQL, exercise the real Discord OAuth
round-trip over HTTPS, verify Cloud Run behaviour (container, secrets, cold
starts, the Cloud SQL socket), and provide a URL you can hand to a staff
member.

| | Local | Staging | Production |
|---|---|---|---|
| **Runs** | `npm run dev` | Cloud Run `buli-hub-staging` | Cloud Run `buli-hub` |
| **Database** | Postgres 17 in Docker (`npm run db:start`) | Cloud SQL `buli_hub_staging` | Cloud SQL `buli_hub` |
| **Stream photos** | emulator on 4443 | `buli-hub-stream-photos-staging` | `buli-hub-stream-photos` |
| **Deployed from** | — | push to `dev` | push to `main` |
| **Data** | prod clone, on demand | prod clone, on demand | real |
| **Discord sign-in** | personas, or non-prod app | non-prod app | prod app |
| **Discord role reads** | off | off | real guild |
| **Discord posting** | test server | test server | real guild |
| **`/dev` tooling** | on | on (token) | **off** |
| **Public** | no | unlisted | yes |

### How the Discord configuration splits

Three independent concerns, three independent settings — which is what makes
this safe without any code changes:

1. **Sign-in** — `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`. Local and
   staging both use the **non-production** Discord application, never the
   production one. Local development can also leave these as placeholders and
   sign in through `/dev` personas instead, which never touch Discord.
2. **Role reads** — `DISCORD_GUILD_ID` + the three role ids. **Left unset on
   local and staging.** `roleConfig()` returns null without all four, and
   `syncMember()` then returns the *stored* role unchanged, so the roles that
   came across in the clone freeze as they were. Nothing needs a test-server
   membership, and the staging role distribution mirrors the real one — more
   realistic than live reads would be.
3. **Posting** — `DISCORD_BOT_TOKEN` + channel ids. Staging posts to the
   **test** server. An unset channel id skips posting entirely, so a
   half-configured test server degrades to silence rather than to errors or
   misdirected messages.

Because they are independent, needing a test server for *posting* does not
force *role reads* through it. (Pointing role reads at the real guild from
staging would need the bot in both guilds, and "invite it with no permissions"
is not safe — a bot inherits `@everyone` permissions and can end up able to
post in public production channels. Keeping reads off avoids this entirely.)

Discord user ids are global, so `users.discord_id` stays valid in a clone:
signing into staging with a real Discord account resolves to the copied user
row — for staff and above, whom the scrub leaves untouched.

### Database, user and bucket

Staging shares production's instance (§1) and nothing else: its own database
`buli_hub_staging`, owned by its own role `buli_hub_staging`, which the
production database refuses (the check in §1), and its own bucket
`buli-hub-stream-photos-staging`. No schema needs applying by hand — the first
deploy or refresh supplies it.

Its runtime secrets:

```bash
printf '%s' 'postgresql://buli_hub_staging:<password>@localhost/buli_hub_staging' \
  | gcloud secrets create DATABASE_URL_STAGING --data-file=-
printf '%s' '<non-production client secret>' | gcloud secrets create DISCORD_CLIENT_SECRET_STAGING --data-file=-
```

(plus the runtime account's `secretAccessor` on each, as in §2).

If no non-production Discord application exists yet, create one now (Developer
Portal → *New Application*). It supplies two separate things staging needs: the
OAuth client ID/secret above, and — under *Bot* — the token that becomes
`DISCORD_BOT_TOKEN_TEST`. Never reuse the production application for either;
resetting its secret to recover it would break sign-in for the whole league.
Register `http://localhost:3000/auth/callback` as a redirect on it while you
are there, so the OAuth round-trip can also be exercised locally.

**The staging redirect must wait for the Cloud Run URL**, which is only
generated when the service is created. Come back and add
`https://<staging-url>/auth/callback` after the next step.

### Cloud Run service

Same project, region and Artifact Registry repository as production; image tags
differentiate.

```bash
gcloud run deploy buli-hub-staging --image <first image> --region europe-west1 \
  --no-invoker-iam-check \
  --service-account=buli-hub-staging-run@buli-hub.iam.gserviceaccount.com \
  --min-instances=0 --max-instances=1 --memory=512Mi \
  --add-cloudsql-instances=buli-hub:europe-west1:buli-hub-db \
  --set-secrets=DATABASE_URL=DATABASE_URL_STAGING:latest,DISCORD_CLIENT_SECRET=DISCORD_CLIENT_SECRET_STAGING:latest,DISCORD_BOT_TOKEN=DISCORD_BOT_TOKEN_TEST:latest,JOBS_SECRET=JOBS_SECRET_STAGING:latest,STREAM_API_SECRET=STREAM_API_SECRET_STAGING:latest \
  --set-env-vars=APP_ENV=staging,APP_BASE_URL=https://<staging-url>,DATABASE_SOCKET=/cloudsql/buli-hub:europe-west1:buli-hub-db,DATABASE_POOL_MAX=4,DISCORD_CLIENT_ID=1532014969787252898,STREAM_PHOTOS_BUCKET=buli-hub-stream-photos-staging,ENABLE_DEV_TOOLS=true,DEV_TOOLS_TOKEN=<long random string>,DISCORD_RESULTS_TOP_CHANNEL_ID=<test server channel>,DISCORD_RESULTS_CHANNEL_ID=<test server channel>,DISCORD_MOTW_CHANNEL_ID=<test server channel>,DISCORD_LEAGUE_CATEGORY_ID=<test server category>,DISCORD_ROLE_ID_BULI_PLAYER=<test server role>
```

Differences from production, each for a reason:

- `--max-instances=1` — one instance is plenty for testing, and it keeps
  staging's share of the shared connection budget at 4 (§1).
- **No custom domain.** Staging is reachable only at its generated
  `*.run.app` URL: public, but unguessable and unlisted. `APP_ENV=staging`
  makes the app serve a disallow-all `robots.txt` and an
  `X-Robots-Tag: noindex, nofollow` header, so a pasted link cannot get it
  indexed.
- `APP_BASE_URL` must be the staging URL, or the "Zum Match" links in Discord
  posts point at production, and Discord would send sign-ins back there.
- **Its own database role, secret and bucket**; the same instance, socket and
  `DATABASE_POOL_MAX=4` as production, since both draw on one connection
  budget (§1).
- **No `AUTH_COOKIE_DOMAIN`**: staging keeps its per-host session (see
  "Shared sign-in across the Gemeinde sites" above).
- **No role variables** — see above.
- `DISCORD_LEAGUE_CATEGORY_ID` / `DISCORD_ROLE_ID_BULI_PLAYER` point at the
  **test server**: the season setup resolves its guild from the category, so
  staging creates its roles and channels there. Its Cloud Scheduler job uses
  its own `JOBS_SECRET_STAGING` (§8).
- `ENABLE_DEV_TOOLS=true` + `DEV_TOOLS_TOKEN` turn on `/dev` (see below).

### Getting into `/dev` on staging

Everything under `/dev` returns **404** until the browser holds the unlock
cookie — the same response a missing route gives, so the staging URL alone does
not reveal that dev tooling is there. The cost is that a legitimate 404 looks
identical to a broken one; if `/` works and `/dev` 404s, you are simply not
unlocked.

The token lives only on the service. Print your unlock link with:

```bash
echo "$(gcloud run services describe buli-hub-staging --project=buli-hub --region=europe-west1 \
  --format='value(status.url)')/dev/unlock?token=$(gcloud run services describe buli-hub-staging \
  --project=buli-hub --region=europe-west1 \
  --format='value(spec.template.spec.containers[0].env)' | tr ';' '\n' \
  | grep DEV_TOOLS_TOKEN | sed "s/.*'value': '\([^']*\)'.*/\1/")"
```

Open it once per browser; the cookie lasts a week. Then use the picker on
`/dev` to impersonate a cloned user — `/dev/login-as` needs `?userId=<uuid>`
and returns 400 on its own.

> **`ENABLE_DEV_TOOLS` and `DEV_TOOLS_TOKEN` must never be set on the
> production service.** Together they allow signing in as any user. This is a
> deployment property, not a code guarantee: nothing in CI can catch it,
> because CI never inspects the production service's environment. If you ever
> touch production's env vars, check these two are absent.

### GitHub environment `STAGING`

Settings → Environments → **STAGING**, same variables as PROD (§3) with
staging values — `GCP_SERVICE` is `buli-hub-staging`,
`CLOUD_SQL_INSTANCE` is the same `buli-hub:europe-west1:buli-hub-db` — plus:

| Kind | Name | Value |
|---|---|---|
| Secret | `STAGING_DATABASE_URL` | `postgresql://buli_hub_staging:<password>@127.0.0.1:5432/buli_hub_staging` |
| Secret | `PROD_DATABASE_URL` | production's Auth Proxy string (§3) — the refresh workflow reads from it |

Both go through one Auth Proxy on `127.0.0.1:5432`, so they differ only in user
and database; the clone script tells them apart by asking the servers (§6). The
deploy job migrates with `STAGING_DATABASE_URL`, as the staging role.

`GCP_WORKLOAD_IDENTITY_PROVIDER` and `GCP_DEPLOYER_SA` are the same values as
PROD; the deployer service account already has `run.admin` and
`cloudsql.client` on the project.

### Two triggers, deliberately separate

| Action | Trigger | Effect |
|---|---|---|
| Build, migrate, deploy | push to `dev` | Fast. **Keeps existing data.** |
| Clone production | *Refresh staging from production* → Run workflow | Fresh prod-shaped baseline, scrubbed, then migrate. |

The instinct is "every staging deploy refreshes the database". That backfires:
you deploy, build up test state, find a bug, push a fix — and the refresh wipes
the state you were testing with. Every push would destroy the setup you just
made. Both paths end with `drizzle-kit migrate`, so staging is always at the
current schema either way.

### Working on `dev`

`dev` is the working branch; `main` is the release branch. Work lands on `dev`
and reaches production only by promotion.

**Direct pushes to `main` are rejected server-side.** The `main-protection`
ruleset (Settings → Rules) requires a pull request, requires the `checks` job to
pass, allows only squash merges, and blocks force-pushes and deletion. It has no
bypass actors, so it applies to organisation admins as well. Verified by
attempting a direct push: GitHub rejects it with `GH013`.

`.githooks/pre-push` refuses the same push locally, with a message pointing at
the promotion commands. Enable it once per clone:

```bash
git config core.hooksPath .githooks
```

The hook is convenience rather than the control: it fails in a second instead of
after a round trip. Since the ruleset is authoritative, `git push --no-verify`
will not get past it. A genuine emergency means disabling the ruleset, pushing,
and re-enabling it.

This is free because the repository is public; GitHub charges for branch
protection on private repositories. Secret scanning and push protection are
enabled for the same reason.

```bash
git checkout dev && …                       # commit freely; each push → staging
gh pr create --base main --head dev --title "<feature>"
gh pr merge --squash --delete-branch=false   # one commit on main → production
git checkout dev && git fetch origin && git reset --hard origin/main && git push --force-with-lease
```

That last line is required, not tidying. A squash-merge creates one new commit
on `main` while `dev` keeps the originals: same tree, divergent history. Without
the reset the next promotion computes the old merge base, replays commits that
are already on `main`, and conflicts. Resetting `dev` onto `main` after every
promotion keeps the two a single line.

Merge commits would avoid the reset, at the cost of putting every intermediate
`dev` commit on `main` — which is why the squash is kept (see CLAUDE.md's
one-commit-per-feature rule).

A production hotfix that cannot wait for whatever is on `dev` goes on a branch
off `main` and straight into a PR to `main`; afterwards reset `dev` onto `main`
as above.

### Cost

The Cloud SQL instance is about **$10/month** (db-f1-micro with 10 GB SSD and
backups, §1) and carries both environments, so staging adds only its share of
connections, not a second bill. Cloud Run is effectively free at
`min-instances=0`, the staging bucket holds a handful of photos, and staging
images share the existing Artifact Registry repository.

Staging never sleeps: the database is a database on a running instance, not a
project that pauses when unused. If the instance ever has to grow, it grows for
both (`db-g1-small`, about $28/month, §1).

## 8. Scheduled jobs (Cloud Scheduler)

Route handlers under `/api/jobs/*` are Cloud Scheduler targets, authorized
by a shared secret the scheduler sends as `Authorization: Bearer
<JOBS_SECRET>` (`src/lib/bearer.ts`). The routes are idempotent converges, so
a repeated or overlapping run is harmless. Each environment has its own
secret and its own jobs; a job never crosses environments because the URL
and the secret both belong to one service. While the service is in
maintenance (§10) the routes answer 503 and the scheduler retries later;
pause the job around a maintenance window anyway, so the log stays quiet.

### Discord season sync

Keeps the Discord server converged onto the running season: group roles and
private group channels per sub-division, the Buli-Spieler role on exactly
the active placed players (docs/plans/discord-season-setup.md). It also
runs inline when the Spielplan is published and on the staff dashboard's
"Jetzt abgleichen"; the scheduled run is what catches drops, late joiners
and hand-edits. Before the schedule is published the route is a no-op.

**Server preparation** (production server and test server alike; role and
channel ids are not secrets):

1. The bot's role needs **Manage Roles** and **Manage Channels**, and must
   sit **above** the Buli-Spieler role in the role list (it can only assign
   roles below its own). Keep it below the staff roles. Not Administrator.
2. A permanent **league category**. It may contain public channels: the
   hub denies `@everyone` on each group channel itself. The category's
   overwrites decide who sees *every* group channel (Liga-Staff,
   Server-Staff, Admins) and should also allow the bot's role, because
   channels inherit them at creation.
3. A permanent, mentionable **Buli-Spieler** role.
4. The **Server Members Intent** (Developer Portal) stays enabled.

**Environment** (both ids into the service's env, the secret into Secret
Manager — see the deploy commands in §2 / §7):

```bash
printf '%s' "$(openssl rand -hex 32)" | gcloud secrets create JOBS_SECRET_STAGING --data-file=-
gcloud run services update buli-hub-staging --region europe-west1 \
  --update-secrets=JOBS_SECRET=JOBS_SECRET_STAGING:latest \
  --update-env-vars=DISCORD_LEAGUE_CATEGORY_ID=<test server category>,DISCORD_ROLE_ID_BULI_PLAYER=<test server role>
```

**Job** (every 15 minutes; the attempt deadline covers a first full run on
a fresh season, which is a few minutes of rate-limited role calls):

```bash
gcloud scheduler jobs create http discord-season-sync-staging \
  --location europe-west1 --schedule "*/15 * * * *" \
  --uri "https://<staging-url>/api/jobs/discord-season-sync" \
  --http-method POST --attempt-deadline 600s \
  --headers "Authorization=Bearer $(gcloud secrets versions access latest --secret JOBS_SECRET_STAGING)"
```

Production: the same with `buli-hub`, `JOBS_SECRET`, the production ids and
the production URL, named `discord-season-sync`. The header is stored in
the job, so rotating the secret means updating the job
(`gcloud scheduler jobs update http … --update-headers …`).

**First run on a season that is already published.** The inline sync only
fires on "Pairings veröffentlichen"; when the feature meets a running
season, the first run is the one that creates every role and channel,
assigns 100+ players and strips the Buli-Spieler role from everyone else.
Keep the production job paused (`gcloud scheduler jobs pause
discord-season-sync --location europe-west1`) until staff have triggered
that first run deliberately via "Jetzt abgleichen" on `/staff` and checked
the server; then `gcloud scheduler jobs resume …`.

**Verification:** `curl -X POST -H "Authorization: Bearer …"
https://…/api/jobs/discord-season-sync` answers the sync report as JSON
(`{"skipped": …}` before a published schedule or without the ids). A wrong
secret answers 401, a service without `JOBS_SECRET` 503. On the staff
dashboard the Discord card appears only while the last report says the
server does not match the league, or when no run happened for over an hour
(the scheduler is not calling).

## 9. Stream API (gemeinde-streams)

Route handlers under `/api/stream/*` are read-only endpoints for the stream
backend (`../gemeinde-streams`): the played matches of the current season
with team sheets and avatars, so the Regie can pick the match an overlay
shows (`docs/plans/stream-api.md`). Authorized like the job routes, by a
shared secret sent as `Authorization: Bearer <STREAM_API_SECRET>`
(`src/lib/bearer.ts`), its own secret so the two callers rotate apart. The
payload carries results the public views withhold (MotW embargo, spoiler
protection): the caller is the stream that shows the match. Stream photo URLs
in it are signed hub addresses (`<APP_BASE_URL>/stream-photos/<path>?sig=…`)
that load without a session; the bucket itself is private. During
maintenance the routes answer 503 JSON, and the photo addresses stay
reachable (the photo route reads only the bucket).

Each environment has its own secret; the stream backend's `BULI_HUB_URL`
and `BULI_HUB_API_KEY` point at exactly one of them. Development of the
stream backend runs against staging.

```bash
printf '%s' "$(openssl rand -hex 32)" | gcloud secrets create STREAM_API_SECRET_STAGING --data-file=-
gcloud run services update buli-hub-staging --region europe-west1 \
  --update-secrets=STREAM_API_SECRET=STREAM_API_SECRET_STAGING:latest
```

Production: the same with `buli-hub` and `STREAM_API_SECRET`. Check:

```bash
curl -sS -H "Authorization: Bearer $(gcloud secrets versions access latest --secret STREAM_API_SECRET_STAGING)" \
  https://<staging-url>/api/stream/matches | head -c 300
```

## 10. Umzug von Supabase

The one-time switch from Supabase to Google Cloud
(`specs/004-google-cloud-migration`, `contracts/switch-procedure.md`,
`contracts/maintenance.md`). Staging goes first, as the rehearsal, then
production at a quiet time. Kept as history once it has run.

**The order is the point.** The new code cannot run against Supabase and the
old code cannot run against Cloud SQL, so the data moves while the hub is in
maintenance, and only then do configuration and code follow. Until the hub
reopens, Supabase has not been written to and the way back is open; reopening
is the point of no return, and problems after it are fixed forward.

### Before the move day

The revisions running on Supabase must already know maintenance mode, or the
move would run with the hub open. So it ships ahead of the move, on its own
(decided 2026-10-21): a small commit with maintenance mode and the scrub that
drops stream photo paths from clones, both working on the Supabase code, goes
`dev` → `main` like any release. Try it once on staging and once on production
(switch on, see the page with 503 on `/` and 200 on `/impressum`, switch off)
before scheduling the move.

### The tools

- **Maintenance**: an env var on the service, a new revision of the same
  image, no release. While it is on, every route answers the maintenance page
  with 503, `/api/**` answers 503 JSON, and only `/impressum` and `/datenschutz`
  stay reachable; nobody gets past it, staff included.

  ```bash
  gcloud run services update <service> --region europe-west1 --update-env-vars MAINTENANCE=on
  gcloud run services update <service> --region europe-west1 --remove-env-vars MAINTENANCE
  ```

  **It only works on a revision built from code that has maintenance mode**
  (`src/features/maintenance/`, shipped ahead of the move, see above). A
  revision built before it ignores the variable, and the move would run with
  the hub open, losing whatever is submitted in the meantime. Before each run,
  switch it on and load `/`: the page "Gleich wieder da" with status 503 must
  answer. If it does not, stop.
- **The move**: `npm run db:move-from-supabase` (`scripts/move-from-supabase.ts`).
  It reads the Supabase database (never writes it), builds the target from the
  committed baseline with `drizzle-kit migrate`, copies the accounts from
  `auth.users` into `users` (same id, Discord id, `created_at`; no email) and
  every row of `public` in one transaction, copies every stream photo to the
  bucket under the same path, and prints a verification table: row counts per
  table, every account with the same id and Discord id and no other, every
  photo a profile points at present with the source's size. It exits 1 on any
  ✗.

  | Flag | Meaning |
  |---|---|
  | `--source=<url>` | Supabase's **session pooler** string (default `SUPABASE_DATABASE_URL`) |
  | `--target=<url>` | the empty Cloud SQL database through the Auth Proxy, as the environment's own role (default `MOVE_TARGET_DATABASE_URL`) |
  | `--photos-from=<url>` | the Supabase project URL, `https://<ref>.supabase.co` |
  | `--photos-to=<bucket>` | `buli-hub-stream-photos` or `buli-hub-stream-photos-staging` |
  | `--reset-target` | drops the target's `public` and `drizzle` schemas first, after you type the database name |
  | `--dry-run` | prints the plan, touches nothing |

  It **refuses a target that already holds accounts**: a half-loaded target is
  never merged into, it is rebuilt with `--reset-target` and the move runs
  again. Every account must have a Discord id, or nothing moves and the script
  lists the ones without.

  The source is Supabase's *Session pooler* string (dashboard → *Connect* →
  *Session pooler*), not the direct `db.<ref>.supabase.co` one: Supabase serves
  direct connections over IPv6 only, which WSL2 and most networks cannot reach.

  ```
  postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
  ```

  The target is the environment's own role, never `postgres`, so every table
  belongs to the role the app connects as (§1). Put both strings into `.env`
  as `SUPABASE_DATABASE_URL` / `MOVE_TARGET_DATABASE_URL` rather than on the
  command line, where other processes can read them.

**Prepared on the laptop** before either run: §1 done (instance, databases and
roles with the isolation check, buckets serving publicly, IAM, the Discord
redirects for the hub's callback), `pg_dump`/`psql` 17, the Auth Proxy running
on 5433 (§6), `gcloud auth login` with write access to the buckets (the photos
are copied with your account), and the production application's Discord client
id and secret, taken from Supabase (*Authentication* → *Providers* → *Discord*).
Do not reset the secret in the Discord portal to read it: that ends sign-in on
the running hub.

### Staging

1. **Infrastructure for staging**: the secrets `DATABASE_URL_STAGING` and
   `DISCORD_CLIENT_SECRET_STAGING` (§7) with the runtime account's access.
   Creating them changes nothing on the running service.
2. **Fill staging's Supabase with production-shaped data**, with the **old**
   refresh workflow from `main` (staging's GitHub values are still Supabase's
   at this point, and that is what it needs):

   ```bash
   gh workflow run staging-refresh.yml --ref main
   gh run watch
   ```

   A refresh copies rows, not files, so the scrub drops every
   `stream_photo_path` (photos show real faces, and their files stay in
   production's bucket; shipped ahead of the move, see "Before the move day").
   Check that `select count(*) from profiles where stream_photo_path is not
   null` is 0 on staging's Supabase now; the photo row of the verification
   then checks nothing on staging, and the photo copy itself is exercised by
   whatever test pictures staging's own bucket holds.
3. **Maintenance on** and note the time:

   ```bash
   gcloud run services update buli-hub-staging --region europe-west1 --update-env-vars MAINTENANCE=on
   ```

4. **Scheduler paused**:

   ```bash
   gcloud scheduler jobs pause discord-season-sync-staging --location europe-west1
   ```

5. **Move**:

   ```bash
   npm run db:move-from-supabase -- --dry-run \
     --photos-from=https://<staging-ref>.supabase.co --photos-to=buli-hub-stream-photos-staging
   npm run db:move-from-supabase -- \
     --source="$SUPABASE_DATABASE_URL" \
     --target="postgresql://buli_hub_staging:<password>@127.0.0.1:5433/buli_hub_staging" \
     --photos-from=https://<staging-ref>.supabase.co --photos-to=buli-hub-stream-photos-staging
   ```

6. **Verification**: every row of the table is ✓ and the script ends with
   "Verified". Anything else: stop, maintenance off, scheduler resumed, find
   the cause, run again with `--reset-target`.
7. **Switch staging's configuration**, service and GitHub:

   ```bash
   gcloud run services update buli-hub-staging --region europe-west1 \
     --add-cloudsql-instances=buli-hub:europe-west1:buli-hub-db \
     --update-secrets=DATABASE_URL=DATABASE_URL_STAGING:latest,DISCORD_CLIENT_SECRET=DISCORD_CLIENT_SECRET_STAGING:latest \
     --update-env-vars=DATABASE_SOCKET=/cloudsql/buli-hub:europe-west1:buli-hub-db,DATABASE_POOL_MAX=4,DISCORD_CLIENT_ID=1532014969787252898,STREAM_PHOTOS_BUCKET=buli-hub-stream-photos-staging
   gh variable set CLOUD_SQL_INSTANCE --env STAGING --body buli-hub:europe-west1:buli-hub-db
   gh secret set STAGING_DATABASE_URL --env STAGING   # postgresql://buli_hub_staging:<pw>@127.0.0.1:5432/buli_hub_staging
   ```

   STAGING's `PROD_DATABASE_URL` stays Supabase's until production has moved
   (production step 6); until then, do not run the staging refresh.
8. **Push `dev`** (the feature's commit, after Gate 3). The deploy builds with
   the new photo URL, migrates through the proxy (the baseline is already
   there, so nothing happens) and rolls out a revision that is still in
   maintenance. Wait for it: `gh run watch`.
9. **Smoke check**: the new revision serves 100% of traffic
   (`gcloud run services describe buli-hub-staging --region europe-west1
   --format='value(status.latestReadyRevisionName)'`), `/` answers the
   maintenance page with 503, `/impressum` 200, and the revision's log shows no
   startup error.
10. **Maintenance off**, scheduler resumed, time noted:

    ```bash
    gcloud run services update buli-hub-staging --region europe-west1 --remove-env-vars MAINTENANCE
    gcloud scheduler jobs resume discord-season-sync-staging --location europe-west1
    ```

**Rehearsal checks**, all before production is scheduled
(quickstart.md §7 in the spec):

- the verification table was all ✓ (every account, every table, every photo);
- sign in with a real staff account and as a player; their pages match what
  the same accounts see in production;
- "Jetzt abgleichen" once: the report shows no created, changed or deleted
  object on the test server;
- every photo URL the stream API returns loads without a session;
- the role isolation holds: `psql` as `buli_hub_staging` on database
  `buli_hub` is refused (§1);
- the nightly backup's two steps, by hand against staging (the workflow itself
  backs up production and runs only once production has moved): `pg_dump` of
  `buli_hub_staging` as in §4, restored into the local stack, and the hub runs
  on it;
- maintenance on to maintenance off took **under one hour**. That is the
  window announced for production.

### Production

At a quiet time, with the maintainer. Staff announce the maintenance in
Discord beforehand by hand; everyone has to sign in once afterwards, because no
Supabase session survives the move.

1. **Maintenance on**, on the revision production runs now, and the time
   noted:

   ```bash
   gcloud run services update buli-hub --region europe-west1 --update-env-vars MAINTENANCE=on
   ```

   Check that `/` answers the maintenance page (see "The tools").
2. **Scheduler paused**:

   ```bash
   gcloud scheduler jobs pause discord-season-sync --location europe-west1
   ```

3. **Move**:

   ```bash
   npm run db:move-from-supabase -- \
     --source="$SUPABASE_DATABASE_URL" \
     --target="postgresql://buli_hub:<password>@127.0.0.1:5433/buli_hub" \
     --photos-from=https://<prod-ref>.supabase.co --photos-to=buli-hub-stream-photos
   ```

4. **Verification**: all ✓. Anything else is the abort path below.
5. **Abort point.** Up to here nothing outside the new database and bucket has
   changed. To abort: remove `MAINTENANCE`, resume the scheduler; the hub runs
   on Supabase exactly as before, and the next attempt starts with
   `--reset-target`.
6. **Switch production's configuration**, only now and never earlier: until
   this moment `main`'s nightly backup and deploy still read these values for
   Supabase. Note the current version of `DATABASE_URL` first
   (`gcloud secrets versions list DATABASE_URL`), it is the way back.

   ```bash
   printf '%s' 'postgresql://buli_hub:<password>@localhost/buli_hub' \
     | gcloud secrets versions add DATABASE_URL --data-file=-
   gcloud run services update buli-hub --region europe-west1 \
     --add-cloudsql-instances=buli-hub:europe-west1:buli-hub-db \
     --update-secrets=DATABASE_URL=DATABASE_URL:latest,DISCORD_CLIENT_SECRET=DISCORD_CLIENT_SECRET:latest \
     --update-env-vars=DATABASE_SOCKET=/cloudsql/buli-hub:europe-west1:buli-hub-db,DATABASE_POOL_MAX=4,DISCORD_CLIENT_ID=1393596376591499365,STREAM_PHOTOS_BUCKET=buli-hub-stream-photos
   gh variable set CLOUD_SQL_INSTANCE --env PROD --body buli-hub:europe-west1:buli-hub-db
   gh secret set PROD_DATABASE_URL --env PROD      # postgresql://buli_hub:<pw>@127.0.0.1:5432/buli_hub
   gh secret set PROD_DATABASE_URL --env STAGING   # the same; the staging refresh reads production from it
   ```

   `AUTH_COOKIE_DOMAIN` stays unset (it never was set on production, checked
   2026-10-21): the Tippspiel still keeps its Supabase session in a cookie
   named `gemeinde-auth`, so the hub must not write one (§2, "Shared sign-in").
   In the laptop's `.env`, `PROD_DATABASE_URL` becomes the proxy string on 5433 (§6).

   The way back from here, as long as the hub has not reopened: pin
   `DATABASE_URL` to the noted version
   (`--update-secrets=DATABASE_URL=DATABASE_URL:<version>`), set both GitHub
   `PROD_DATABASE_URL` secrets back to Supabase's string, then remove
   `MAINTENANCE` and resume the scheduler.
7. **Promote `dev` → `main`** per CLAUDE.md:

   ```bash
   gh pr create --base main --head dev --title "<features>"
   gh pr merge --squash --delete-branch=false
   gh run watch
   ```

   The deploy builds with the production photo URL, migrates through the
   proxy (nothing to do) and rolls out the new code, still in maintenance.
8. **Smoke check**, as on staging: the new revision serves 100% of traffic,
   `/` answers the maintenance page with 503, `/impressum` 200, no startup
   error in the log.
9. **Maintenance off**: the point of no return. Then at once: sign in with
   Discord, open a player page with a stream photo, `/staff`, and the stream
   API (§9).

   ```bash
   gcloud run services update buli-hub --region europe-west1 --remove-env-vars MAINTENANCE
   ```

10. **Scheduler resumed**, time noted (under one hour since step 1):

    ```bash
    gcloud scheduler jobs resume discord-season-sync --location europe-west1
    ```

11. **Reset `dev` onto `main`**, as after every promotion:

    ```bash
    git checkout dev && git fetch origin && git reset --hard origin/main && git push --force-with-lease
    ```

### Afterwards

- Trigger the nightly backup once (*Backup production* → Run workflow) and
  restore it into the local stack (§4): it must hold every account and every
  stream photo.
- Discord: remove `https://<prod-ref>.supabase.co/auth/v1/callback` from the
  production application, and `https://<staging-ref>.supabase.co/auth/v1/callback`
  and `http://127.0.0.1:54321/auth/v1/callback` from the non-production one.
- GitHub, in PROD and STAGING: delete the variables
  `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and any
  `SUPABASE_AUTH_EXTERNAL_DISCORD_*` secret.
- Cloud Run and Secret Manager: remove the Supabase secret from both services
  (`gcloud run services update <service> --region europe-west1
  --remove-secrets=SUPABASE_SECRET_KEY`), then delete the secrets
  `SUPABASE_SECRET_KEY`, `STAGING_SUPABASE_SECRET_KEY` and
  `STAGING_DATABASE_URL_POOLER`.
- The laptop's `.env`: drop `SUPABASE_DATABASE_URL`, `MOVE_TARGET_DATABASE_URL`
  and every `SUPABASE_*` value.
- Tell the gemeinde-streams maintainers that photo URLs now come from
  `storage.googleapis.com`; the stream backend loads URLs as given and needs no
  change.
- **Supabase itself stays untouched** (both projects) until the maintainer
  deletes it.
