# Deployment runbook

Production = one Cloud Run service (region **europe-west1**, Belgium — Cloud Run domain mapping is not available in Frankfurt) + one
hosted Supabase project. Every push to `main` deploys via
`.github/workflows/ci.yml` (checks → image → migrations → deploy). This
runbook is the one-time setup; keep it current when infrastructure changes.

Placeholders used below: `buli-hub`, `<DOMAIN>` (e.g. `bulihub.de`),
`<GH_REPO>` (e.g. `owner/buli-hub`).

## 1. Supabase project

1. Create a project (org plan: **Pro** — daily backups; the free tier pauses
   on inactivity). Region: Frankfurt (`eu-central-1`).
2. **Auth → Providers → Discord**: enable; client ID/secret from the Discord
   Developer Portal (the production application, not the dev one). In the
   Discord portal, add the redirect
   `https://<project-ref>.supabase.co/auth/v1/callback`.
3. **Auth → URL configuration**: Site URL `https://<DOMAIN>`; additional
   redirect URLs: `https://<DOMAIN>/**`.
4. **Auth → Providers → Email**: disable sign-ups (Discord is the only way
   in).
5. Note the values for later: project URL, publishable key, secret key, and
   both connection strings — **session** (port 5432, for migrations) and
   **transaction pooler** (port 6543, for the app; `prepare: false` is
   already set app-side).
6. The schema arrives via the deploy workflow's `drizzle-kit migrate` on the
   first deploy — nothing to apply by hand.

## 2. Google Cloud project

```bash
gcloud projects create buli-hub   # or reuse; link billing
gcloud config set project buli-hub
gcloud services enable run.googleapis.com artifactregistry.googleapis.com \
  iamcredentials.googleapis.com secretmanager.googleapis.com \
  monitoring.googleapis.com
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
printf '%s' '<value>' | gcloud secrets create DATABASE_URL --data-file=-          # transaction pooler, port 6543
printf '%s' '<value>' | gcloud secrets create SUPABASE_SECRET_KEY --data-file=-
printf '%s' '<value>' | gcloud secrets create DISCORD_BOT_TOKEN --data-file=-
# Grant the *runtime* service account access:
gcloud secrets add-iam-policy-binding DATABASE_URL \
  --member="serviceAccount:<PROJECT_NUMBER>-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"   # repeat per secret
```

### Cloud Run service (first deploy creates it; then pin the config)

```bash
gcloud run deploy buli-hub --image <first image> --region europe-west1 \
  --no-invoker-iam-check \
  --min-instances=1 --max-instances=3 --memory=512Mi \
  --set-secrets=DATABASE_URL=DATABASE_URL:latest,SUPABASE_SECRET_KEY=SUPABASE_SECRET_KEY:latest,DISCORD_BOT_TOKEN=DISCORD_BOT_TOKEN:latest \
  --set-env-vars=APP_BASE_URL=https://<DOMAIN>,DISCORD_GUILD_ID=…,DISCORD_ROLE_ID_DEV=…,DISCORD_ROLE_ID_ADMIN=…,DISCORD_ROLE_ID_STAFF=…,DISCORD_RESULTS_CHANNEL_ID=…
```

`min-instances=1` during the season (no cold starts); drop to 0 off-season.
Later deploys from CI only swap the image — env/secrets stick to the service.
`--no-invoker-iam-check` (instead of `--allow-unauthenticated`): the GCP
project sits under the VGC-Gemeinde organization, whose Domain Restricted
Sharing policy forbids `allUsers` IAM bindings — this flag is Cloud Run's
supported way to serve public traffic under that policy.

### Domain

Cloud Run → custom domain mapping for `<DOMAIN>`, then set the DNS records
it prints at the registrar. `APP_BASE_URL`, the Supabase site URL, and the
Datenschutz page's imprint must all match the final domain.

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
| Variable | `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| Variable | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |
| Secret | `PROD_DATABASE_URL` | **session** connection string (port 5432) — migrations need DDL over a stable session, not the transaction pooler |

Then: install the **Renovate** GitHub app on the repo (config is
`renovate.json`; weekly, grouped minor/patch — CI gates every update PR).

## 4. Observability & backups (minimal)

- **Uptime check** (Cloud Monitoring) on `https://<DOMAIN>/` + alert to the
  maintainer's email.
- **Log-based alert**: Cloud Run revision logs, filter `severity>=ERROR`,
  notify on new entries (catches failed Discord syncs — they log via
  `console.error`).
- **Backups**: Supabase Pro does daily backups; verify the first one exists
  after go-live and note the restore path (Dashboard → Database → Backups).

## 5. Dress rehearsal (before announcing)

On the deployed service: sign in with a real Discord account → role sync
picks up the real guild roles → open a throwaway registration → register →
close → seed → create schedule → report a match → the post appears in the
results channel → drop/un-drop a player → wipe the throwaway season
(open a fresh registration window when the real one starts). Verify the
uptime check is green and a forced error shows up in Cloud Logging.
