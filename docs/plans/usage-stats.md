# Nutzungsstatistik (usage stats)

**Status: done** (2026-08-31). Full suite green, `/staff/nutzung` verified
with the admin persona (staff redirected), backfill script rehearsed against
the local stack with a stubbed `gcloud`. Still to run once, after the
production deploy: `npm run usage:backfill -- --apply` (docs/deployment.md §4).

How busy the hub is, and roughly how many people that was: page loads and
distinct visitors per hour, day, ISO week and month, on an admin-only page at
`/staff/nutzung`. Modelled on the Draft Builder's `/stats.html`, adapted to
this stack (Postgres instead of Firestore, a Server Component instead of a
static page behind Basic auth, German time instead of UTC). History before the
feature ships is replayed once from Cloud Run's request logs.

## Scope

In:

- Counting every page load server-side, with no script in the page and no
  identifier in the browser.
- `/staff/nutzung`: today's numbers, today by hour, the last 30 days, and
  tables for 14 days / 12 weeks / 12 months, each with page loads and people.
- A one-shot backfill from Cloud Run request logs, run from the maintainer's
  machine.
- `/dev/ui` specimens for the cards, the bar chart states and the table.

Out (deliberately, each is a small follow-up if wanted):

- Per-route or signed-in/anonymous breakdowns. The Draft Builder's "formats
  opened" table has no equivalent worth its complexity yet.
- Counting soft navigations. A visit is a full page load (a tab opened, a
  link followed from Discord, a reload); moving between pages via the header
  is not counted, exactly as the Draft Builder counts it.
- Referrers, countries, devices. Nothing beyond "how many".

## Design rule: count, don't record

Same rule as the Draft Builder, carried over verbatim in spirit:

- **Never stored, in any form**: IP addresses, user agents, user ids, paths,
  or any per-request row. Only counters and sketches are written.
- **Uniques hold no identities.** A HyperLogLog sketch (4096 one-byte
  registers, ±1.6 %, near-exact at the hub's volume) is folded per period; a
  visitor's hash bumps one register and is discarded. A sketch cannot be
  asked "was this person here?".
- **Nothing links across periods.** Each period (day, week, month) hashes
  with its own random salt, created on first use and deleted 70 days after
  the period. The same visitor's day, week and month hashes are unrelated.
- **Closed route list.** Only known page routes count; anything else (probes,
  `/api`, assets) is dropped, which keeps vulnerability scanners from
  inflating a quiet day.

Rejected alternative: a `(period, salted_hash)` table with `count(distinct)`.
Exact and plain SQL, but while a period is live it is a pseudonymous visitor
list that we could re-identify with the salt in hand. The sketch removes that
possibility by construction, and the ~150 lines it costs are pure, already
written and tested in the Draft Builder (`src/lib/server/hll.ts`), and ported
as-is.

## Decisions that differ from the Draft Builder

1. **Postgres, not Firestore.** The counters live in three tables in the app
   database (below). No new dependency, migrations like any other feature,
   integration-tested against the local stack, cloned into staging by the
   refresh and into the local stack by `db:clone-prod`.
2. **Write per page load, no in-memory buffering.** The Draft Builder buffers
   counters and flushes every two minutes because Firestore writes cost money
   and several instances would contend. Neither applies here: a page load is
   one short transaction (three row upserts and a sketch merge) against a
   database that handles that trivially at the hub's volume, so there is no
   flush timer, no `globalThis` state, no shutdown hook, nothing lost on a
   crash, and the page is always current. The salt is the only thing cached
   in memory (one read per period per instance).
3. **German time.** Periods are Europe/Berlin calendar days, ISO weeks and
   months (`docs/decisions/german-time.md`): a match evening ending 23:30 is
   that day, not the next UTC day. The hours chart is in German hours. Log
   timestamps (UTC) are converted the same way during the backfill.
4. **Signed-in visitors are counted by user id.** The visitor token is
   `sha256(user id)` when signed in, `sha256(ip + user agent)` otherwise;
   both are salted per period into the same sketch. A player on phone and
   desktop is one person, two players sharing a flat are two. The backfill can
   only use ip + agent (logs know nothing about sessions), so within the one
   boundary week and month the same person can appear once from each source.
   Accepted: a one-time, small overcount at the seam.
5. **A Server Component page, no JSON endpoint, no Basic auth.** The page
   reads the store and renders; access is the ordinary role gate
   (`hasRoleAtLeast("admin")` → `redirect("/")`, like the staff pages). No
   `/api/stats/*`, no password in an env var.
6. **The backfill script writes to the database directly** via
   `PROD_DATABASE_URL`, exactly as `scripts/clone-prod.ts` reads from it. No
   backfill route handler, no shared secret. Addresses still never leave the
   machine: the script reduces each log row to a token, salts and folds it
   locally, and writes only counters and sketches.

## Counting

- `src/proxy.ts` puts the pathname on the request as an `x-pathname` header
  (a Server Component has no other reliable way to learn what it renders).
- `<CountPageLoad />` in the root layout, inside a `<Suspense
  fallback={null}>` so it never delays the shell: reads `x-pathname`,
  `x-forwarded-for` (last entry, the one Cloud Run's proxy appended),
  `user-agent`, and `currentUser()` (memoized per request, so the header's
  lookup is reused). Renders nothing. Wrapped in try/catch and a 2-second
  timeout: statistics must never fail or visibly slow a page.
- Because the root layout is not re-rendered on soft navigations, this counts
  full page loads only. Prefetches and RSC navigation requests never reach
  it.
- `isPageLoadPath(path)`: closed list. `/`, `/anmeldung`, `/match/[id]`,
  `/pastes/[id]`, `/profil`, `/regelwerk`, `/spieler`, `/spieler/[id]`,
  `/staff`, `/staff/motw`, `/staff/seeding`. Not counted: `/dev/*`,
  `/auth/*`, `/impressum`, `/datenschutz`, and `/staff/nutzung` itself.
- `isBot(userAgent)`: the Draft Builder's pattern
  (`bot|crawler|spider|crawling|slurp|monitor|uptime|curl|wget|headless|preview`),
  which also drops the Cloud Monitoring uptime check. An empty agent is a
  bot.
- `recordPageLoad(token, now)`: one transaction. For each of day / week /
  month: `insert … on conflict do update` for `visits` (and the hour bucket on
  the day row), then `select sketch for update`, fold the salted token in,
  write it back. The first ever write also stamps `usage_collection.started_at`.

## Schema

All three tables are server-only: RLS enabled with no policies, via a custom
migration alongside the generated one (same pattern as every other feature).

`usage_periods`

| column     | type                             | notes                                            |
|------------|----------------------------------|--------------------------------------------------|
| kind       | `usage_period_kind` enum         | `day` · `week` · `month`                         |
| period_id  | text                             | `2026-08-31` · `2026-W36` · `2026-08`, Berlin     |
| visits     | integer not null default 0       | page loads                                       |
| hours      | jsonb not null default `{}`      | day rows only: `{"00": n, …, "23": n}`, Berlin    |
| sketch     | bytea not null                   | 4096-byte HyperLogLog                            |
| updated_at | timestamptz not null default now |                                                  |

Primary key `(kind, period_id)`.

`usage_salts`

| column     | type                   | notes                                              |
|------------|------------------------|----------------------------------------------------|
| period_id  | text primary key       | ids never collide across kinds (`W`/dash count)   |
| salt       | bytea not null         | 32 random bytes                                    |
| created_at | timestamptz not null   | swept 70 days after creation, opportunistically    |

`usage_collection` (single row, `id boolean primary key default true check (id)`)

| column           | type        | notes                                                   |
|------------------|-------------|---------------------------------------------------------|
| started_at       | timestamptz | first count; only ever moves earlier (backfill)         |
| backfilled_at    | timestamptz | null until the one-shot backfill ran; refuses a second  |
| backfill_through | timestamptz | the instant live counting had begun                     |
| backfill_visits  | integer     | what was replayed, for the record                       |

`started_at` is what separates "nobody came" from "we weren't counting yet":
a period before it is drawn hatched and shown as `—` in the tables, never as
a zero. A period holding visits counts as counted regardless.

## The page: `/staff/nutzung`

Admin and dev only. Staff see no entry point and are redirected to `/` like
any other under-role visitor of a staff page. Entry point: an `ActionLink`
"Nutzung →" on the staff dashboard, rendered for admin+ only. Breadcrumb
"Staff-Bereich / Nutzung".

Layout, built from the design system (`design/DESIGN.md`), first-pass
intentional, not polished:

- Wide container (1040 px). Page title "Nutzung" (40 px). Below it the meta
  line in muted 13 px: "Gezählt seit 01.08.2026 · deutsche Zeit · Stand
  31.08.2026, 14:03".
- Four stat cards (`rounded-xl border`, micro label + 30 px tabular number):
  Heute · Aufrufe, Heute · Personen, Diese Woche · Personen, Dieser Monat ·
  Personen.
- `<SectionHeader>` "Heute nach Stunde": 24 CSS bars (no chart library; 24
  divs with a percentage height beat a client-side charting dependency for
  this). Bars are `bg-chart-1`, a quiet hour is `bg-border`, an hour before
  counting began is a full-height hatched bar in `--border`. Tooltip per bar
  via `title`.
- `<SectionHeader>` "Letzte 30 Tage": the same bar component, one bar per
  day. Legend beneath: swatch "gezählt" · hatched swatch "vor Beginn der
  Zählung".
- Note under the chart: "Jeder Zeitraum zählt seine Personen selbst. Eine
  Woche ist deshalb nicht die Summe ihrer Tage: wer zweimal in einer Woche
  vorbeischaut, ist in der Woche eine Person und an jedem Tag eine."
- Three tables, `tabular-nums`, right-aligned numbers: Tage (14, newest
  first), Wochen (12), Monate (12). Columns: Zeitraum · Aufrufe · Personen.
- Mobile: cards wrap via `auto-fit`, charts scroll horizontally inside their
  own `overflow-x-auto` box, tables fit as-is.
- Copy rules apply: no em-dash in copy (`—` only as the empty-value cell
  placeholder), straight quotes, German.

The page is `force-dynamic` and reads:

`readSummary(now)` → 30 day rows, 12 week rows, 12 month rows (named periods,
zero rows for missing ones, so the series is continuous), `started_at`, and
the `counted` flag per period, shaped by a pure `buildSummary()` so the view
model is unit-tested and the components stay dumb.

## Backfill from Cloud Run logs

Cloud Run logs every request (url, remote ip, user agent, timestamp) into the
`_Default` bucket with **30 days** retention unless the project raised it, so
the replay reaches back a month from when it is run. Everything older is
unknown and the page says so. Run it in the same deploy session the feature
ships, before that window shrinks.

`node scripts/backfill-usage.ts [--days 30] [--service buli-hub] [--apply]`

1. `gcloud logging read` (requires `gcloud auth login` with access to the
   `buli-hub` project) for `resource.type="cloud_run_revision" AND
   resource.labels.service_name="buli-hub" AND httpRequest.requestMethod="GET"`,
   CSV of timestamp, url, ip, agent, oldest first.
2. `aggregateLogRows(rows, throughIso)` (pure, in `src/features/usage/backfill.ts`)
   applies the live rules to every row: drops rows at or after
   `started_at` (already counted live), bots, non-page paths, **and requests
   with an `_rsc` query parameter**, which are soft navigations and
   prefetches that the live counter never sees. Converts timestamps to
   Berlin periods and hours. Produces per-period visits, hours and opaque
   visitor tokens.
3. Prints a dry-run report: visits per day, distinct visitors, and how many
   rows were skipped and why. Nothing is written without `--apply`.
4. With `--apply`: connects to `PROD_DATABASE_URL`, refuses if
   `backfilled_at` is set, then in one transaction creates the historic
   salts, folds tokens into fresh sketches, upserts the periods (additive, so
   the boundary day merges with what was counted live), sets the backfill
   marker and moves `started_at` back to the earliest replayed day.

The script is orchestration only (`gcloud`, the DB connection, argument
parsing); everything with logic is a tested pure function under
`src/features/usage/`. The salt sweep later deletes the historic salts like
any other, so replayed periods become unlinkable too.

Staging is not backfilled; it counts from its own next deploy.

## Files

```
src/features/usage/
  periods.ts              dayId / weekId / monthId / periodIdFor / recentPeriodIds (Berlin)
  hll.ts                  HyperLogLog, ported from the Draft Builder
  visitor.ts              visitorToken, isBot, isPageLoadPath (route list)
  summary.ts              buildSummary(): rows + started_at → view model with counted flags
  backfill.ts             LogRow, aggregateLogRows()
  store.ts                ensureSalt, recordPageLoad, readPeriods, collection, applyBackfill, sweepSalts
  count-page-load.tsx     the root-layout Server Component
  components/
    usage-cards.tsx       stat cards
    usage-bar-chart.tsx   bars with counted / quiet / no-data states + legend
    usage-table.tsx       period table
  *.test.ts / *.integration.test.ts
src/app/staff/nutzung/page.tsx     role gate, readSummary, render
src/app/layout.tsx                 <Suspense><CountPageLoad /></Suspense>
src/proxy.ts                       x-pathname request header
src/app/staff/page.tsx             "Nutzung →" for admin+
src/db/schema.ts                   enum + three tables
supabase/migrations/…usage_stats.sql (generated) + …usage_stats_rls.sql (custom: RLS, no policies)
scripts/backfill-usage.ts
src/features/dev/components/gallery.tsx   specimens: cards, chart (counted / quiet / no-data), table
docs/deployment.md §4              how to run the backfill; note the 30-day log retention
```

Personas: the existing `admin` and `staff` personas already cover the access
matrix; nothing to add.

## Tests

Unit (pure):

- `periods`: Berlin day/week/month ids around midnight UTC vs Berlin (a
  22:30 UTC load in summer is the next Berlin day), across DST changes, ISO
  week at year boundaries (2026-12-31 is `2026-W53`, 2027-01-04 is
  `2027-W01`); `recentPeriodIds` continuity and ordering.
- `hll`: empty estimate is 0; n distinct inputs estimate within tolerance for
  n = 1, 10, 100, 5000; merge is commutative and idempotent; bytes round-trip;
  wrong-size bytes start empty.
- `visitor`: token is stable and hex; bot pattern incl. the uptime check;
  route list accepts each real route with a sample id, rejects `/api/…`,
  `/dev/ui`, `/staff/nutzung`, `/etc/passwd`, `/favicon.ico`.
- `summary`: `counted` is false before `started_at` and true from the period
  containing it, true for any period with visits regardless; hours before a
  same-day start are uncounted; zero rows for missing periods.
- `backfill.aggregateLogRows`: drops bots, `_rsc`, non-page paths, rows at or
  after the cutoff, unparsable rows, and reports each; buckets by Berlin day
  and hour; one token per visitor per period; week and month totals.

Integration (local stack):

- `recordPageLoad` creates day, week and month rows and increments them;
  the same token twice is one person, two tokens are two; the hour bucket
  lands on the day row only.
- Concurrent `recordPageLoad` calls on one period lose nothing.
- `ensureSalt` creates once and returns the same salt afterwards; the sweep
  deletes salts older than 70 days and keeps younger ones.
- `started_at` is set on first write and never moves later; `applyBackfill`
  moves it earlier, is additive on an existing day row, and is refused once
  `backfilled_at` is set.
- `readPeriods` returns the named periods in order with zero rows where
  nothing exists.

## Privacy page

`/datenschutz` §2 already covers technical access data processed by the
hosting infrastructure. Counting adds no new stored personal data (addresses
and ids are hashed transiently, only counts and sketches persist), but the
hub itself now processes them for a new purpose. One sentence in §2 keeps the
page honest: "Zusätzlich zählt die Plattform Seitenaufrufe und die ungefähre
Zahl der Besucher pro Tag, Woche und Monat. Dafür werden IP-Adresse, Browser
und Nutzerkennung sofort in einen nicht umkehrbaren Zählwert umgewandelt;
gespeichert werden nur Summen, keine Einzelzugriffe."

## Running scripts that import feature code

`scripts/backfill-usage.ts` imports `store.ts`, which needs the database
client, so it cannot be an import-free pure module like the clone helpers.
Plain `node` resolves neither the `@/` alias nor extension-less imports;
`scripts/src-alias.register.mjs` registers a small resolve hook
(`node:module` `register`) that maps both. `npm run usage:backfill` passes it
via `--import`. Feature code loaded this way goes through Node's type
stripping, which rejects TypeScript-only runtime syntax (enums, parameter
properties); the usage feature avoids those.

## Follow-ups, not in scope

- Log retention on the `buli-hub` project has not been verified. If it is
  the default 30 days, the backfill reaches one month back and should run the
  day the feature ships. Raising it now helps the future, not the past.
- Check the database size once after the first Spieltag, so the growth
  estimate becomes a measurement.
