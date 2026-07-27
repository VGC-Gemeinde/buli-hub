# Teilnehmerfeld on the player dashboard

**Status: done** (2026-07-27)

The Spieler-Dashboard shows the list of registered players for the whole
pre-season stretch: from the moment registration opens until the season starts.
Until now the roster existed only on the staff dashboard.

## Scope

In:

- A „Teilnehmerfeld" section on `/spieler`, below the primary panel, with the
  player count in the header and one chip per registered player (avatar + name).
- Visible in every pre-season dashboard view: `register_cta`, `registered_open`,
  `registered_closed`, `not_registered_closed` — i.e. whether or not the viewer
  is registered themselves.
- `PlayerGrid` promoted from the staff feature to a shared component, with a
  caller-supplied empty state (the staff copy talks about the Anmeldelink).

Out:

- The landing page and `/anmeldung`. Only the dashboard, as requested.
- Anonymous visitors. `/spieler` already redirects unauthenticated users to `/`,
  so the roster stays inside the signed-in community.
- A division breakdown once the seeding is finalized. The `seeded` phase keeps
  the flat roster; publishing the seeding to players is its own feature.
- Registration answers (platform, status, self-rating, achievements, previous
  placement). Players see identity only.

## Phases

The roster is shown for exactly the three middle season phases:

| `SeasonPhase`         | Roster |
| --------------------- | ------ |
| `not_started`         | no     |
| `registration_open`   | yes    |
| `registration_closed` | yes    |
| `seeded`              | yes    |
| `regular_season`      | no     |

Once the schedule exists the dashboard becomes the in-season view, where group
standings carry the same information in a more useful shape.

## Data

Reuse `listRegistrations(windowId)` (`features/registration/queries.ts`) — no new
query. It already joins `profiles` and returns `displayName` / `username` /
`avatarUrl`; the page maps it through `playerName()` exactly as the staff
dashboard does. The count is the array length; no second query.

`createdAt` is fetched but deliberately never rendered, and the grid sorts
alphabetically (German collation) — the player-facing list must not turn into a
„who signed up first" ranking.

No schema change. No migration. No Discord touchpoint.

## Changes

- `features/season/dashboard.ts` — new pure `showsRoster(phase: SeasonPhase)`.
- `components/player-grid.tsx` — `PlayerGrid` moved here from
  `features/staff/components/registration-status.tsx`, gaining an `empty`
  prop (`ReactNode`) for the empty-state card; `RegisteredPlayer` moves with it.
  Staff dashboard passes its existing Anmeldelink copy.
- `features/season/components/participant-list.tsx` — new `ParticipantList`:
  `SectionHeader` („Teilnehmerfeld", `count`) + `PlayerGrid` with player-facing
  empty copy („Noch hat sich niemand angemeldet — sei der Erste.").
- `app/spieler/page.tsx` — fetch the roster in the existing `Promise.all`-style
  lead-in when `window && showsRoster(phase)`, render `ParticipantList` inside
  `Shell` below the panel. The in-season branch is untouched.
- `features/dev/components/gallery.tsx` — update the `PlayerGrid` import, add a
  `ParticipantList` specimen (filled + empty).

## Design

Rudimentary-but-intentional pass with existing tokens: the dashboard's 640px
`Shell`, `SectionHeader` with the count badge, the existing chip grid
(`minmax(140px, 1fr)` → four columns at 640px, two on a phone). Full roster
rendered, no truncation; if real fields grow past ~80 players a later design
pass can add a disclosure.

## Tests

- `features/season/dashboard.test.ts` — `showsRoster` over all five phases.
- `listRegistrations` is already covered by
  `features/registration/queries.integration.test.ts`; no new integration test.

## Notes

- Names and avatars are already public via `/spieler/[userId]`, so this exposes
  no new class of data. What is new is „who is in for this season" before the
  seeding is published — an intentional decision by the maintainer.
- Local verification: `/dev/seed-registrations` populates a window, and
  `/dev/clear-registrations` empties it for the empty state.
- `countRegistrations()` remains referenced only by its integration test; this
  feature does not need it.
