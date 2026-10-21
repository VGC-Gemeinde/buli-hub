# Feature Specification: Umzug von Supabase auf Google Cloud

**Feature Directory**: `specs/004-google-cloud-migration/`

**Created**: 2026-10-21

**Status**: Implemented 2026-10-21; maintenance mode shipped ahead (#48), the rest ships with the rollout (tasks T082 to T086)

**Input**: User description: "Wir müssen so schnell wie möglich von allen Supabase-Services zu
Google-Cloud-Alternativen migrieren." The Supabase access is expected to end on 2026-10-21; if it
is cut off before the move, the maintainer bridges one month on the paid Supabase plan, so the move
is done properly and without shortcuts. Decided by the maintainer on 2026-10-21:

- The database moves to Google Cloud's managed Postgres: one instance, production and staging as
  two separate databases with separate credentials.
- Sign-in with Discord is built into the hub itself, no new sign-in provider and no new library.
  Every existing account keeps its identity, so all data stays attached to the same person.
- Stream photos move to Google Cloud Storage under the same object paths.
- Row-level security, the grants to Supabase's roles and the roles themselves are dropped: without
  Supabase's public data API only the hub reaches the database. Principle I of the constitution
  ("RLS policies are still defined as defense in depth") is amended with this feature.
- The shared sign-in with gemeinde-tippspiel (specs/003) stays possible: the new session can be
  shared across `vgcgemein.de` the same way; the Tippspiel joins in a later feature of its own and
  its sign-in stops working once Supabase is gone (accepted: it is barely used right now).
- The move takes a fresh export right before the switch, not the nightly backup; the nightly
  backups stay as the safety net and keep running afterwards.
- Lean flow: no mockups beyond what users actually see change; all three gates stay.

## Clarifications

### Session 2026-10-21

- Q: Which Discord data does the new sign-in request? → A: Only the identity (id, names, avatar),
  no email; accounts without a verified email can sign in, the email error case goes away.
- Q: What do visitors see during the switch (at most about an hour)? → A: A plain maintenance page
  on every route (HTTP 503), the stream API included; the switch is scheduled for a quiet time.
- Q: Besides a player signing out, how can a single session be ended? → A: No UI: only the
  maintainer ends an account's sessions, with a documented command in the runbook.
- Q: May the maintainer use the hub on Google Cloud during maintenance before it reopens? → A: No:
  no bypass; the verification script and the staging rehearsal are the check, then the hub opens
  for everyone.
- Q: After how long without a visit does a session end (it renews while used)? → A: 30 days.
- Q: How specific is the maintenance page? → A: Generic: no reason, no time ("Schau in etwa einer
  Stunde wieder vorbei."), reusable for any later maintenance.
- Q: Do the imprint and privacy page stay reachable during maintenance? → A: Yes, both.
- Q: (After Gate 3, while setting up the buckets) Are stream photos public? → A: No: they are
  for the player, staff and the stream only. The bucket stays private; the hub serves the photos
  itself, through the session for the player and staff and through a signed address for the
  stream (maintainer, 2026-10-21).

## User Scenarios & Testing *(mandatory)*

The hub depends on Supabase for three things: the database, the Discord sign-in and the storage of
stream photos. All three move to Google Cloud, where the hub already runs. For players and staff
the move should be a non-event: one sign-in on the first visit afterwards, everything else exactly
as before. For the maintainer it must be a rehearsed, verifiable switch with a way back.

### User Story 1 - Everyone is still who they were (Priority: P1)

After the move a player signs in with Discord and lands in their own account: same profile, same
registrations, team sheets, results, favorites, same role. Staff see the same seasons, holds, bans
and history. Discord automation (role sync, season channels, membership sweep) still finds every
player by their Discord account.

**Why this priority**: the community trusts the hub for correct results; an account that loses its
history, or a player who becomes a stranger to their own data, is the one failure the move must not
have.

**Independent Test**: after a rehearsal on staging, sign in as several real accounts (player,
staff, admin, a banned account, a replacement player) and compare what each sees with production
before the move.

**Acceptance Scenarios**:

1. **Given** a player who had an account before the move, **When** they sign in with the same
   Discord account afterwards, **Then** they land in the same account, with all their data and
   their role.
2. **Given** a person who never signed in before, **When** they sign in for the first time after
   the move, **Then** a new account is created exactly as a first sign-in creates one today.
3. **Given** a ban keyed on a Discord id, **When** the banned person tries to register after the
   move, **Then** they are blocked exactly as before.
4. **Given** the scheduled Discord season sync and membership sweep, **When** they run after the
   move, **Then** they change nothing on the Discord server that they would not have changed before
   it.

---

### User Story 2 - Signing in and out works as today (Priority: P1)

A visitor presses "Mit Discord anmelden", confirms on Discord and comes back signed in. Cancelling
on Discord or a failed sign-in brings them back with the same messages as today. Signing out ends
the session in this browser. A session survives regular use without surprise sign-outs.

**Why this priority**: without sign-in nobody can report a result; it ships together with Story 1.

**Independent Test**: sign in, cancel a sign-in, sign out, and use the hub across several days in
the running app.

**Acceptance Scenarios**:

1. **Given** a signed-out visitor, **When** they sign in with Discord, **Then** they come back to
   the hub signed in, where a sign-in lands today.
2. **Given** a visitor on Discord's consent screen, **When** they cancel, **Then** they come back
   signed out and see today's "cancelled" message.
3. **Given** a sign-in response that was not started by this browser or has expired, **When** it
   reaches the hub, **Then** the hub refuses it, signs nobody in and shows today's generic error.
4. **Given** a signed-in player, **When** they sign out, **Then** this browser is signed out and
   their other devices stay signed in (as decided in specs/003).
5. **Given** a signed-in player who uses the hub regularly, **When** their session would expire,
   **Then** regular use keeps renewing it, so they are not asked to sign in again while active.
6. **Given** the maintainer ends an account's sessions with the documented command (for example
   after a lost device), **When** one of those sessions is used again, **Then** it is no longer
   honored.

---

### User Story 3 - A rehearsed switch without data loss (Priority: P1)

The maintainer runs the switch as one known procedure that was rehearsed on staging: the hub stops
accepting changes, a fresh export of the Supabase database and stream photos is taken and loaded
into Google Cloud, a check confirms nothing is missing, and the hub comes back on Google Cloud. If
the check fails, the hub goes back to Supabase unchanged.

**Why this priority**: a result reported during the switch and then lost, or a half-moved database,
would cost more trust than any outage.

**Independent Test**: run the full procedure against staging with production-shaped data and
compare row counts and content per table before and after.

**Acceptance Scenarios**:

1. **Given** the switch has started, **When** anyone opens any page of the hub, **Then** they see
   a maintenance page saying the hub is briefly unavailable, nothing can be submitted, and nothing
   is lost silently.
2. **Given** the export is loaded, **When** the verification runs, **Then** every table holds the
   same rows as the source, every account exists with the same id and Discord id, and every stream
   photo referenced by a profile exists in the new storage.
3. **Given** the verification fails, **When** the maintainer aborts, **Then** the hub returns to
   Supabase as it was, with no change lost.
4. **Given** the switch is done, **When** the hub runs on Google Cloud, **Then** Supabase is no
   longer contacted by anything in the hub.

---

### User Story 4 - Stream photos and the stream keep working (Priority: P2)

Players' stream photos show on their profile, in the staff workspaces and on the stream, and
nowhere else. The stream backend (gemeinde-streams) gets working photo addresses from the stream
API without any change on its side. Uploading, replacing and removing a photo works as today.

**Why this priority**: visible on stream, but a missing photo does not stop the league.

**Independent Test**: after the rehearsal, open every profile with a photo and fetch every photo
address the stream API returns without being signed in.

**Acceptance Scenarios**:

1. **Given** a player with a stream photo before the move, **When** their profile or the stream API
   is opened afterwards, **Then** the same photo is shown, loaded from Google Cloud.
2. **Given** a player offered a stream photo, **When** they upload, replace or remove it, **Then**
   it behaves as today, with the same size and format limits.
3. **Given** a photo address from the stream API, **When** it is opened without a session, **Then**
   it loads.
4. **Given** a stored photo, **When** anyone other than the player, staff or the holder of a stream
   API address asks for it (signed out, another player, a guessed or altered address), **Then** the
   hub answers as if no photo existed, and the bucket itself refuses every direct request.

---

### User Story 5 - Backups keep running and cover everything (Priority: P2)

The nightly backup keeps running against the new database and now also covers the stream photos.
Google Cloud's own automatic database backups run in addition. A backup can be restored.

**Why this priority**: the move must not weaken the safety net the maintainer relies on; today the
photos are not covered at all.

**Independent Test**: trigger the nightly backup once after the rehearsal, restore it into the local
stack and compare it with the source.

**Acceptance Scenarios**:

1. **Given** the hub on Google Cloud, **When** the nightly backup runs, **Then** it stores the
   complete database, including every account, and every stream photo.
2. **Given** a nightly backup, **When** the maintainer restores it locally, **Then** the hub runs
   on it with every account and its data.
3. **Given** a backup run that captured no accounts or failed, **When** it ends, **Then** it is
   reported as failed, as today.

---

### User Story 6 - Development without Supabase (Priority: P3)

A developer starts the local database and the dev server and works as today: hot reload, the test
suite against a local database, the `/dev` personas, impersonation of a real user, the component
gallery, a production-shaped local copy, and a staging refresh. CI runs the full suite without
Supabase.

**Why this priority**: the daily loop must survive the move; it is invisible to players.

**Independent Test**: from a fresh clone, follow the documented setup, run the suite, sign in as a
persona and as an impersonated user, and clone production into the local stack.

**Acceptance Scenarios**:

1. **Given** a fresh clone, **When** the developer follows the documented setup, **Then** the local
   stack starts and the full test suite passes without any Supabase tool installed.
2. **Given** the dev tools are enabled, **When** a developer signs in as a persona or impersonates
   a user, **Then** they are signed in as that account immediately, as today.
3. **Given** the test suite, **When** it is pointed at a database that is not local, **Then** it
   refuses to run, as today.
4. **Given** production on Google Cloud, **When** the maintainer clones it locally or refreshes
   staging, **Then** the copy works as today, scrubbed where it is today.

---

### Edge Cases

- An account in the old system without a Discord id (none expected in production; personas and
  seed users exist only locally and on staging): the move reports it instead of dropping it
  silently.
- A player changed their Discord name or avatar since the last sign-in: they are still matched by
  their Discord id, never by name.
- A browser still holds a session from before the move: it is ignored and cleaned up without an
  error; the player sees the normal signed-out state.
- A sign-in starts on Supabase right before the switch and returns after it: it fails with today's
  generic error and works on the next try.
- The scheduled jobs (Discord season sync, membership sweep) fire during the switch: they neither
  write to the old database after the export nor to the new one before the verification.
- A stream photo upload or any other change is in flight when the switch starts: it either
  completes before the export or is answered by the maintenance page, never stored in only one of
  the two systems.
- The same Discord account signs in on two devices at once: two independent sessions, both valid.
- A player returns after more than 30 days, for example after the break between seasons: they see
  the normal signed-out state and sign in once.
- The maintainer re-runs the switch after an aborted attempt: it starts again from a clean target,
  never merging into a half-loaded one.
- Staging and production share one database instance: a staging refresh or a staging migration
  can never touch the production database.

## Requirements *(mandatory)*

### Functional Requirements

**Accounts and sign-in**

- **FR-001**: The hub MUST keep its own account record per person, holding a stable account id and
  the Discord id as a first-class, unique value, so every rule that needs a Discord id (bans, role
  sync, season sync, membership sweep, replacements) reads it directly.
- **FR-002**: Every existing account MUST keep its id across the move, so all data that belongs to
  an account (registrations, placements, matches, results, team sheets, favorites, holds, bans,
  replacements, acceptances, feedback, and every "done by" reference) stays attached to it, with the
  same behavior on deletion as today.
- **FR-003**: Signing in MUST use Discord's authorization flow directly, protected against forged
  and replayed sign-in responses, and MUST create the account on a first sign-in and refresh the
  stored Discord identity (name, username, avatar) on every sign-in, as today.
- **FR-004**: The hub MUST request only the Discord identity (id, names, avatar) and no email
  address. A Discord account without a verified email can sign in; roles, bans and guild
  membership decide what it may do, as today.
- **FR-005**: A session MUST be held in a cookie no page script can read, sent only over HTTPS in
  production, and MUST be revocable on the server: signing out ends it immediately, and a removed
  session is never honored again. Ending all sessions of an account is a maintainer operation
  documented in the runbook; there is no UI for it.
- **FR-006**: A session MUST stay valid while it is used and end after 30 days without use. A player
  who comes back after a longer break signs in once.
- **FR-007**: With the production setting for the shared Gemeinde domain switched on, the session
  MUST be readable by every hub under `vgcgemein.de` exactly as specs/003 defines (name, domain,
  protections), so the Tippspiel can join later by adopting it; without it the session stays
  limited to the host, as today in local development and on staging.
- **FR-008**: Sessions from before the move MUST NOT be honored; the hub clears them without an
  error.
- **FR-009**: Sign-in errors MUST map to today's categories and messages (cancelled, generic
  failure); the "no verified email" case and its message are removed (FR-004).
- **FR-010**: The `/dev` personas and impersonation MUST sign the developer in as the chosen account
  directly, under the same gate as today; nothing of this is reachable in production.

**Database**

- **FR-011**: The hub MUST run on Google Cloud's managed Postgres, production and staging as two
  separate databases with separate credentials, so neither environment can read or write the
  other's data.
- **FR-012**: A fresh database (local, CI, a new environment) MUST be creatable from the committed
  migration chain alone, without any Supabase-specific schema or role.
- **FR-013**: Row-level security, grants to Supabase's roles and policies on Supabase's user
  function MUST be removed; authorization stays entirely in server code, as today.
- **FR-014**: Every existing database rule that is not Supabase-specific (constraints, foreign keys
  between the hub's own tables, the locks that keep closed seasons final, indexes) MUST hold
  unchanged after the move.

**Storage**

- **FR-015**: Stream photos MUST be stored in a private Google Cloud Storage bucket under the same
  paths as today, with today's size and format limits and upload, replace and remove behavior.
  Only the hub reads the bucket; it shows a photo to the player it belongs to and to staff through
  the session, and to the stream through a signed address. Everyone else gets "not found".
- **FR-016**: The photo addresses the hub renders point at its own photo route; the ones the stream
  API returns are absolute, signed and loadable without a session. The stream API's response shape
  does not change.

**The switch**

- **FR-017**: The switch MUST be one scripted procedure: put the hub into maintenance, stop the
  scheduled jobs, export the Supabase database (including accounts) and copy the stream photos
  fresh, load both into Google Cloud, verify, then point the hub at Google Cloud and resume.
- **FR-018**: During maintenance every route of the hub, the stream API and the job endpoints
  included, MUST answer with a maintenance page (HTTP 503) instead of its content, so no change can
  be submitted and none is lost silently. Only the imprint (`/impressum`) and the privacy page
  (`/datenschutz`) stay reachable, as the law requires for the imprint, and `/robots.txt`, so
  crawlers read the usual rules rather than the maintenance page. Maintenance is switched
  on and off without a new release. There is no bypass, also not for staff or the maintainer.
  The page is generic: it names no reason and no time, so the same switch serves any later
  maintenance.
- **FR-019**: The verification MUST compare every table's row count and every account's id and
  Discord id between source and target, check that every referenced stream photo exists, and stop
  the switch on any difference.
- **FR-020**: The switch MUST be reversible until the hub reopens on Google Cloud: an abort leaves
  Supabase serving the hub unchanged. Reopening is the point of no return; problems found after it
  are fixed forward on Google Cloud. Supabase is kept untouched (not deleted) until the maintainer
  decides otherwise.
- **FR-021**: The procedure MUST be rehearsed on staging with production-shaped data before it runs
  against production.
- **FR-022**: Account email addresses MUST NOT be carried into the new system; nothing in the hub
  uses them.

**Backups, tooling and documents**

- **FR-023**: The nightly backup MUST run against the new database, include every account and its
  Discord id, additionally copy every stream photo, and fail loudly when it captures no accounts.
  Google Cloud's automatic backups of the database MUST be switched on in addition.
- **FR-024**: Local development and CI MUST run on a plain local Postgres of the same major version
  as production, with no Supabase tool; the suite's refusal of non-local databases stays.
- **FR-025**: Cloning production into the local stack and refreshing staging MUST work against the
  new database, with today's scrubbing.
- **FR-026**: No Supabase library, setting, secret or environment variable MAY remain in the hub
  after the move.
- **FR-027**: The privacy page MUST name Google Cloud for hosting, database and storage and no
  longer name Supabase; its "Stand" line is updated.
- **FR-028**: The constitution (Principle I), `CLAUDE.md` (architecture map, commands, environments)
  and `docs/deployment.md` (runbook) MUST describe the new setup; legacy plans and specs that
  describe Supabase behavior get a backlink, specs/003 included.

### Key Entities

- **Account**: one person in the hub. A stable id (unchanged from today), the Discord id (unique),
  and when it was created. The Discord identity shown in the hub (names, avatar) stays on the
  profile, as today.
- **Session**: proof that one browser is signed in to one account. Created on sign-in, renewed by
  use, ended by sign-out, removal or inactivity. The browser holds only a secret token; the hub
  keeps only what it needs to recognize that token, never the token itself.
- **Sign-in attempt**: the short-lived state that ties a returning Discord response to the browser
  that started it; used once.
- **Stream photo**: an image object addressed by the path stored on the profile; unchanged in shape,
  new home.

## UX & Mockups *(mandatory when users see a change)*

**Status**: Approved 2026-10-21

Almost no visible change. The sign-in button, the Discord consent, the error messages after a
failed or cancelled sign-in and the user menu stay as they are. What users do see:

- The one-time sign-out after the move: today's signed-out state, no special message.
- The privacy page (FR-027): copy only, in section 7 and the "Stand" line.
- The maintenance page during the switch (FR-018): the only new view, generic, reusable for any
  later maintenance.

**Explanation level**: the maintenance page interrupts every flow: one plain sentence that the hub
is briefly unavailable for maintenance and when to try again. The privacy page states facts.

| View | Route | Who sees it | Mockup file |
|------|-------|-------------|-------------|
| Wartung | every route except /impressum, /datenschutz | everyone | mockups/wartung.html |
| Datenschutzerklärung, section 7 | /datenschutz | public visitors, signed-in users | none, copy only |

**UX decisions**:

- The maintenance page follows the landing page anatomy (design/DESIGN.md §3-5): orange accent
  line, header with logo and "Buli Hub" only (no sign-in button, no navigation, no theme toggle
  beyond the system theme), centered column with the logo badge, a "Wartung" kicker between two
  S ticks, and the logo watermark.
- Copy, verbatim: h1 "Gleich wieder da"; "Der Buli Hub wird gerade gewartet und ist für kurze
  Zeit nicht erreichbar."; "Schau in etwa einer Stunde wieder vorbei."; action link "Neuigkeiten
  im Discord der VGC Gemeinde →" to the hub's existing Discord invite.
- Generic: the page names no reason (no "Umzug") and shows no time; nothing is configured per
  maintenance except on and off.
- The footer shows "© <Jahr> VGC Gemeinde · Impressum · Datenschutz"; both links work during
  maintenance. No Regelwerk or feedback link.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After the move, 100% of accounts exist with the same id and Discord id, and every
  table holds the same number of rows as Supabase held at the export.
- **SC-002**: Every signed-in check of the rehearsal (player, staff, admin, banned account,
  replacement player) sees exactly what the same account saw before the move.
- **SC-003**: The switch in production completes within the planned maintenance window of at most
  one hour, and no change submitted during it is lost silently.
- **SC-004**: 100% of stream photos referenced by profiles load from the new storage: through the
  stream API's address without a session, and on the hub's pages for the player and staff; none
  loads for anyone else.
- **SC-005**: A player completes a sign-in with Discord in the same number of steps as today, and
  the first sign-in after the move restores everything with no further action.
- **SC-006**: The first nightly backup after the move contains every account and every stream photo
  and restores into the local stack.
- **SC-007**: A search of the repository finds no Supabase dependency, configuration or secret, and
  the hub makes no request to Supabase.
- **SC-008**: From a fresh clone, the documented local setup and the full test suite work without
  any Supabase tool.

## Assumptions

- The Supabase project remains readable until the switch, either because access lasts or because
  the maintainer bridges with the paid plan; the switch is planned, not rushed.
- During local development, stream photos go to a development bucket or a local stand-in; the
  plan decides which, and no production bucket is ever written from a developer machine.
- The Discord application stays the same; only its allowed return address changes from Supabase's
  to the hub's own, for production, staging and local development.
- The database instance lives in the same region as the hub (europe-west1), and the hub reaches it
  through Google Cloud's built-in connection for Cloud Run.
- Production and staging sharing one instance is accepted: a version upgrade of Postgres cannot be
  rehearsed on staging in isolation (maintainer, 2026-10-21).
- The move ends all sessions once, which the maintainer accepts, as with specs/003.
- Out of scope: the Tippspiel's sign-in (a later feature adopts the shared session), deleting the
  Supabase project (the maintainer decides once the hub runs stably), and any change to what the hub
  does for players.
