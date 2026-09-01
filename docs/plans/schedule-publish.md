# Schedule publish (Pairings-Veröffentlichung)

**Status: done** (2026-09-01)

Today, generating the schedule *is* the season start: the presence of
`matchdays` rows flips the derived phase to `regular_season`, and every
player-facing surface (landing → public overview, Spieler-Dashboard, profile
schedule, match pages, "Liga" nav) turns on at once. Staff cannot prepare the
Spielplan internally ahead of an announcement date.

This feature splits generation from publication. **"Spielplan erstellen" stays
exactly as it is** — same dialog, same generation, same one-shot gate — but the
result is initially visible to staff only. A separate, manual **"Pairings
veröffentlichen"** button in the staff area flips the season live for players.
No scheduling, no automation: staff press the button when the announcement
happens (e.g. Sunday).

## Phase model

`seasonPhase` gains one input and one value:

```
not_started → registration_open → registration_closed → seeded
  → schedule_hidden   (schedule exists, not yet published — staff-only)
  → regular_season    (schedule exists and is published)
```

- `seasonPhase({ registration, seedingFinalized, hasSchedule, schedulePublished })`:
  `hasSchedule && schedulePublished` → `regular_season`;
  `hasSchedule && !schedulePublished` → `schedule_hidden`; rest unchanged.
- Publication is monotonic: no unpublish. Like finalizing and generating, the
  button is terminal.
- Everything keyed on `regular_season` behaves correctly in `schedule_hidden`
  without changes, because the checks are explicit equality:
  - `/` landing keeps the pre-season hero (no public overview).
  - `seasonIsRunning()` stays false → no "Liga" nav entry.
  - `dashboardState` falls through to `registered_closed` /
    `not_registered_closed` — players keep seeing "Warte auf deine Paarungen".
  - Regelwerk `regelwerkPrompt` stays a reminder, `actionsLocked` stays
    unlocked (matches only start once published).
- Two functions need the new phase added deliberately:
  - `showsRoster` — includes `schedule_hidden` (the Teilnehmerfeld stays up
    until the season is visible-running, same as `seeded`).
  - The `SeasonPhase` union type itself (compiler surfaces every consumer).

## Schema

One nullable column on `registration_windows` (the window is the season object;
a `schedules` table still does not exist and is not needed):

- `schedule_published_at timestamptz` — null = not published.

Migrations:

1. `drizzle-kit generate` — the column.
2. `drizzle-kit generate --custom --name schedule_publish_backfill` — past
   seasons already ran with instant publication, so every window that has
   matchdays is backfilled as published:
   `update registration_windows w set schedule_published_at =
   (select min(created_at) from matchdays m where m.window_id = w.id)
   where schedule_published_at is null and exists (…)`.

`RegistrationWindow` (hand-written type in `staff/registration-window.ts`) and
`latestWindow` gain `schedulePublishedAt: Date | null`.

**Deploy-order constraint:** this must be live in production *before* staff
click "Spielplan erstellen" for the running seeding. If the schedule is created
on the old code, it publishes instantly (old behavior); created after the
migration, the new window's column is null and the schedule starts hidden. The
backfill only touches windows that already have matchdays at migration time.

## Actions & queries

`src/features/schedule/actions.ts`:

- `createSchedule` — **unchanged.** The new column simply stays null.
- `publishSchedule()` (new) — gate: staff role, latest window exists,
  `hasSchedule(window.id)` true, `schedulePublishedAt` still null ("Die
  Pairings wurden bereits veröffentlicht"). Sets the timestamp; revalidates
  the layout (`revalidatePath("/", "layout")` — landing, header nav, dashboard
  and staff page all change at once).

`src/features/schedule/queries.ts`:

- `markSchedulePublished(windowId)` — the one-line update, used by the action.

The three phase recipes pass the new flag through:
`windowSeasonPhase` (staff/queries.ts), `currentSeason`
(season/season-status.ts), and the inline recipe in `src/app/spieler/page.tsx`
— all read `window.schedulePublishedAt !== null`.

## Closing the leak surfaces

Two pages show pairings without any phase check today and would leak the
hidden schedule; one action would accept early reports:

- **`/spieler/[userId]` (profile)** — builds the season block (group, rank,
  schedule rows) from `placement` alone. Gate it: build the block only when
  the phase is `regular_season` *or the viewer is staff*. (This also fixes the
  pre-existing quirk that a finalized-but-unscheduled season already shows the
  group name publicly.) The staff drop/cancel panel below is untouched.
- **`/match/[matchId]`** — public by UUID. While the phase is not
  `regular_season`, non-staff viewers get `notFound()`; staff see the page as
  usual (internal review, and the staff editor keeps working).
- **`reportMatch`** — refuse unless the phase is `regular_season` ("Die Saison
  läuft noch nicht"). Defense in depth: players cannot reach a match id while
  hidden, but a shared staff link must not enable early reporting. Other
  player actions need no gate (a dispute requires an existing result; drops
  are staff actions).

## Staff view (`/staff`)

The running-season branch of the staff hub renders for **both**
`regular_season` and `schedule_hidden` — staff land on the real dashboard
(SeasonStrip, MotW todo, match buckets, drops, membership) as soon as the
schedule exists. In `schedule_hidden` it additionally shows, at the top:

- **`PublishScheduleCard`** (`src/features/schedule/components/`) — the
  publish todo in the same anatomy as the pre-season and MotW todo cards
  (orange emphasis surface, title = the step, numbers in the body). The
  dashboard below it is the review surface — its week buckets already list
  the pairings — so the card stays compact: Spieltag/Spiele summary plus the
  **"Pairings veröffentlichen"** button → dialog with a facts strip
  (Spieltage, Spiele, Saisonende — the create dialog's anatomy) and the
  shared `TypeToConfirm` (phrase: "Pairings veröffentlichen"): the copy says
  this makes the Spielplan sichtbar für alle and cannot be undone. On
  success the card disappears (phase is now `regular_season`). This feature
  gets no separate design pass; the implemented views are the final design,
  built strictly from the existing conventions.

No Discord touchpoint: the announcement itself stays a manual community post,
consistent with seeding and schedule creation.

## Dev tooling

- `src/features/dev/seed.ts` — `schedule: true` now also sets
  `schedule_published_at` (existing personas and flows keep meaning "season
  running"). New option `unpublishedSchedule: true` seeds the hidden state
  (generates, leaves the column null) for testing the staff flow.
- Gallery (`src/features/dev/components/gallery.tsx`) — `PublishScheduleCard`
  and its confirm dialog as states.
- No new persona shapes.

## Tests

- **Unit:** `seasonPhase` matrix with the new flag (hidden vs. published, and
  that published-without-schedule cannot occur but degrades sanely);
  `showsRoster` includes `schedule_hidden`; `dashboardState` in
  `schedule_hidden`.
- **Integration:** generation leaves `schedule_published_at` null (and
  `matchSchedulePublished` false); `markSchedulePublished` stamps once and
  keeps the first timestamp under a double call. The `publishSchedule` action
  itself stays thin gates over these queries, matching how `createSchedule`
  is covered.
- **Manual/browser:** dev-seed the hidden state; verify as player (dashboard
  still "Warte auf deine Paarungen", profile without season block, no Liga
  nav, landing without overview), as staff (dashboard + internal Spielplan),
  then publish and verify everything flips.

## Scope

**In:** the phase split, the column + backfill migration, `publishSchedule`,
the staff publish card with the internal Spielplan list, the three leak gates,
dev tooling, tests.

**Out:** a Discord announcement on publish; unpublishing; scheduling the
publication for a point in time; any change to schedule generation.

## Open questions

None open.
