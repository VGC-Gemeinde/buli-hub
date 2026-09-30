# Banliste

**Status: done** (2026-09-30): Banliste with bans by hub user or Discord-ID,
conflict step, enforcement on registration and replacements, staff cancel in
the open window; unit, integration and enforcement tests, gallery, persona
and seed.

No designer hand-off follows for this feature: its views are built final from
the start, on `design/DESIGN.md` tokens and existing anatomies (desktop and
mobile).

## Context

Staff need to keep a player out of future seasons of the league. A ban is a
statement about the person, not about one season: it blocks every way into a
season (registration, taking over a dropped player's slot) until it is lifted.
Everything public stays reachable for a banned player: overview, Spielplan,
profiles, match pages, Regelwerk, their own profile settings.

## Scope

**In:**

- **Ban** (staff+), two ways to name the person, then a required reason:
  - **Hub player**: pick any user who has signed in to the hub (has a
    profile). Search like the replacement dialog (name or Discord name).
  - **Discord-ID**: for people who never signed in, typically players of the
    seasons before the hub. Staff enter the Discord user id (a snowflake,
    17 to 20 digits). The hub looks the account up via the bot
    (`GET /users/{id}`) and shows name and avatar to confirm the right
    person; the name is stored as a snapshot. The lookup fails open: an
    unknown id or an outage still allows the ban, shown by id only. An id
    that already belongs to a hub user switches to that user, conflicts
    included.
- **Conflicts before the ban** (see below): if the player is in the current
  season in any way, the dialog says so, links to the action that resolves
  it, and the ban only goes through once staff either resolved it or
  explicitly confirm banning anyway.
- **Lift** (staff+): ends the ban. The ban stays in the history with who
  lifted it and when.
- **Enforcement**, server-side, from the moment of the ban:
  - `register()` refuses a banned user.
  - `/anmeldung` shows a banned user a card instead of the form. It says
    that they are barred from registering and to contact staff with
    questions; the reason is never shown to them.
  - The Spieler-Dashboard's "Jetzt anmelden" call to action is replaced by the
    same message.
  - Replacements: banned users are not offered as candidates,
    `offerReplacement` refuses them, and `acceptReplacement` refuses a user
    banned after the offer.
- **Staff page** `/staff/banliste`, linked from the Staff-Bereich header:
  active bans (player, reason, since, by whom, "Aufheben") and the lifted ones
  as a quieter history below.

The ban is visible to staff only: no mark on the public profile, the
tables or anywhere a player or guest looks. Only the banned player learns of
it, and only when they try to register.

**Out:**

- Changing the current season. A ban applies to future registrations; it
  does not drop, un-register or un-place anyone by itself. Doing that is the
  existing actions', which the conflict step links to.
- Discord (no role, no message, no kick).
- Ban evasion through a second Discord account. The ban is on the hub account
  (the Discord id behind it), and nothing more can be promised.
- Time-limited bans (an end date that lifts itself).

## Conflicts

Pure `banConflicts` derives them from the latest window's state for the
player; the dialog loads them when a player is picked, and `banPlayer`
recomputes them on the server.

| Player's state | Conflict | Linked action |
|---|---|---|
| Registered, window open | "Ist für Saison N angemeldet" | Anmeldung stornieren (profile staff panel) |
| Registered, window closed, seeding not finalized | same | Anmeldung stornieren (profile staff panel) |
| Placed, not dropped (seeding finalized, schedule hidden or running) | "Spielt in Saison N" | Spieler droppen (profile staff panel) |
| Open replacement offer to the player | "Hat ein offenes Ersatz-Angebot" | Angebot zurückziehen (Drops on `/staff`) |
| Dropped, not registered, or no window | none | |

The dialog then offers two ways on: resolve (links open in a new tab; the
dialog re-checks on focus and the conflict disappears) or tick "Trotzdem
bannen, {Name} bleibt in der laufenden Saison" (wording per conflict). The
ban button stays disabled until there are no conflicts or the box is ticked.
`banPlayer({ userId, reason, acknowledgedConflicts })` refuses when conflicts
exist and were not acknowledged, so a stale dialog cannot skip the step.

Staff cancel of a registration is widened to the open window as part of
this feature (`cancellationBlocked` allows `registration_open`): the conflict
needs an action to link to, and staff removing a registration is useful
beyond bans. The profile staff panel offers it in both phases;
`docs/plans/discord-membership.md` (where the cancel is documented) is
updated to match.

## Data

New table `bans` (RLS on, no policies; FKs in a custom migration):

```
id              uuid pk
discord_id      text not null   -- what the ban is on
discord_name    text null       -- name snapshot from the ban, for id-only bans
reason          text not null
banned_by_id    uuid null       -- FK auth.users, set null
banned_at       timestamptz not null default now()
lifted_at       timestamptz null  -- null = active
lifted_by_id    uuid null       -- FK auth.users, set null
unique (discord_id) where lifted_at is null   -- one active ban per account
```

A ban is on the Discord account, never on a hub user id: that is the one key
both kinds of ban share, and it is what makes an id-only ban catch the person
the day they first sign in. Who a ban belongs to in the hub is resolved when
it is read (`auth.users` metadata `provider_id`, the same mapping as
`discordIdentityFromUser`), so nothing has to be linked later. `isBanned`
takes the caller's `discordId` from `CurrentUser`; a user without one (only
dev personas) cannot be banned and is never blocked.

Lifting sets `lifted_at` instead of deleting, so the history answers "was
this person banned before, and why".

## Feature folder: `src/features/bans/`

- `bans.ts` (pure, unit-tested): `banBlock` (the refusal for a banned
  caller), `banConflicts`, the ban/lift guards (reason not blank, not
  already banned, not yourself, conflicts acknowledged), the German copy.
- `queries.ts` (integration-tested): `isBanned(discordId)`, `banAccount`,
  `liftBan`, `activeBans` / `liftedBans` (with the hub user resolved where
  one exists), `banCandidates` (every profile with a Discord id and no
  active ban), `hubUserByDiscordId`.
- `src/lib/discord.ts`: `fetchDiscordUser(id)` for the id lookup.
- `actions.ts`: `banPlayer`, `liftBan`, `banConflictsFor` (staff+; the
  dialog's re-check).
- `conflict-queries.ts`: `banConflictsForUser`, apart from `queries.ts`
  because it reads replacements, which themselves filter by bans.
- Components: `BanDialog` (wide two-column dialog like the replacement offer;
  tabs "Hub-Spieler" / "Discord-ID", the searchable list is the shared
  `PlayerPicker` in `src/components/player-picker.tsx`), `BanList` (id-only
  bans tagged "Nie im Hub" with the id; "Ban aufheben" asks once inline),
  `BannedCard` for players. The page is `src/app/staff/banliste/page.tsx`,
  linked from the Staff-Bereich heading next to "Nutzung".

Touched elsewhere: `register()`, `/anmeldung`, the Spieler-Dashboard's
register panel, `replacementCandidates` / `offerBlock` / `acceptReplacement`,
`cancellationBlocked` (open phase allowed for staff), the Staff-Bereich
header.

## Dev tooling

- Persona "Gesperrt" (`src/features/dev/personas.ts`): signing in writes an
  active ban on its Discord id (`pinPersonaProfile`), so `/anmeldung` and the
  dashboard show the blocked state. Lifting it on `/staff/banliste` lasts
  until the next persona login.
- Seed (`seedBans` in `src/features/dev/seed.ts`): a banned hub user
  ("Gebannter Bernd"), an id-only ban ("Altmeister Alfred") and a lifted one
  ("Ehemals Emil"), all on Discord ids starting with `4990000000`, which
  `clearSeedData` removes again. The seeded players themselves are email
  users without a Discord id and therefore not bannable; to see the conflict
  step, sign in as the staff persona "Kein Avatar" and ban "Testerino" (the
  persona registered in the seeded season).
- Gallery: ban dialog, list (active, id-only, lifted, empty), the player card.

## Tests

- Unit: guards, `banBlock`, `banConflicts` (every row of the table, plus a
  dropped player and nobody), `cancellationBlocked` in the open phase.
- Unit: snowflake validation.
- Integration: ban → `isBanned` → lift → not banned, history kept; a second
  active ban on the same account refused by the partial unique index; an
  id-only ban resolves to the hub user once one with that Discord id exists;
  `banCandidates` and `replacementCandidates` leave out banned accounts;
  staff cancel in the open phase.
