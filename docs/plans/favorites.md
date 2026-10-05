# Favoriten

**Status: done** (2026-10-04): verified by unit and integration tests and in
the browser against a seeded season (desktop, phone, dark mode, anonymous):
reveal coupling, removing and restoring, adding, the profile button and the
stars on the overview and the Spielplan.

## Context

Viewers want to follow particular players through a season: who they play
this week, how it went, where they stand. Without this they open each
profile one by one. Favoriten gives a signed-in user a private list of
players and one page that shows their week and their season at a glance,
plus a small star wherever a favourite appears anyway.

The feature is built final from the start (like the Spieler-Dashboard
rework): polished on `design/DESIGN.md` tokens and existing anatomies,
desktop and mobile, not as a rudimentary first pass.

## Decisions

- **Signed-in only, stored in the database.** A favourite is a row
  (user, player). Anonymous visitors get the page with an explanation and the
  Discord sign-in; they see no stars and no favourite button.
- **Private.** Nobody sees who favourites whom: no counts, no lists, not for
  staff either. The player is not told.
- **Favourites outlive seasons.** You favourite the person, not a season slot.
  A favourite who is not placed in the running season is hidden from the
  page and stays stored; they reappear when they play again.
- **Not yourself.** Your own profile has no favourite button; your own
  matches live on the Spieler-Dashboard.
- **No limit.** Following 40 players gives a long week; a cap solves no real
  problem.
- **No notifications.** No Discord DM, no web push. A separate feature if it
  is ever wanted (opt-in, closed DMs, spoilers in DM previews).
- **Spoiler rules unchanged for the matches.** A favourite's result is covered
  like any other stranger's result (`rowScoreHidden`: the `spoilers_off`
  cookie, tap to reveal, own match open, MotW and recording holds keep their
  pills), and an embargoed result never reaches the browser. Favouriting
  someone is no reason to see their result early: a follower is the person
  most likely to still be watching the VOD.
- **Name in the UI: "Favorit" / "Favoriten"**, a star as the icon. Not
  "Folgen": that word promises notifications the hub does not send.

## Scope

**In:**

- **Page `/favoriten`**, in the Liga section's row: Übersicht · Spielplan ·
  Favoriten, while a season runs. Signed-out visitors see no section rows
  anywhere in the hub (the header's general rule), so they reach the page by
  link and get the sign-in there.
- **Favourite button on the player profile** (`/spieler/[userId]`).
- **Adding on the page itself**: a search over the running season's players.
- **Stars at favourites' names** in the standings tables (overview,
  Spieler-Dashboard), the overview's Spieltag lists and `/spielplan`.

**Out:**

- Notifications of any kind.
- Favourite buttons in table rows or on the match page (the profile and the
  page are the two places to manage the list).
- A favourites strip on the overview; the overview gets stars only.
- A `/spielplan` filter "nur Favoriten".
- Suggestions ("players from your group", "the MotW pairing").
- Past seasons on the page.
- Returning to `/favoriten` after the sign-in: the OAuth callback lands on
  the overview, as for every sign-in.

## The page

Container 1040px (wide), stacked on every width: the week first, the players
below. The week is what changes between visits; the players are context.

### Title row

`h1` "Favoriten" (34px, Tick L) with "· Saison N", the overview's title-row
anatomy · right: the existing `SpoilerSwitch` (same cookie, same site-wide
effect as on the overview and the profile).

### Block "Spielplan" (the week)

- **Section header** "Spielplan", then the overview's **`SpieltagTimeline`**,
  the same component (exported from `public-league.tsx`), not a copy:
  "Spieltag 2 von 7" and the week's dates above one segment per matchday;
  the shown one orange, the current one pale orange, played ones navy (white
  in dark mode). The Liga section pages through Spieltage one way. Every
  matchday is reachable, default the current one. The selection is client
  state, as on the overview: the page loads every round of the favourites'
  matches at once (a few dozen rows).
- **Grouped by group**: a micro label per group ("Division 1a"), its rows
  below, in tier and group order. The groups flow in two columns on desktop
  and one on a phone, like the full Spielplan.
- **One row per match** in which at least one favourite plays. A duel between
  two favourites is one row with both stars. The row is the overview's
  `MatchRow` (`hoverCard`, stretched link to `/match/[id]`, names link to
  profiles, own match tinted orange), with its reveal state held by the page.
- **Score slot states**, all existing: offen, covered pill, score, MotW pill,
  REC pill, spielfrei (no link).
- **Empty week**: one muted line "Keiner deiner Favoriten spielt an diesem
  Spieltag."
- Earlier rounds of a replaced favourite still show here: those matches were
  scheduled for them (`player-replacement.md`), only the table row moved.

### Block "Deine Spieler"

A table in the `StandingsTable` anatomy, count badge in the section header:

| ★ | Spieler | Gruppe | Pl. | Bilanz | Form |
|---|---|---|---|---|---|

- **★** is the remove toggle: a click removes the favourite, the row greys
  out and stays until the next load, a second click restores it. No jumping
  list under the cursor, a misclick costs nothing. When fresh data arrives
  after an add, the removed rows and their matches are carried over
  (`keepRemoved`).
- **Pl. and Bilanz** are the public table's (embargoed results excluded, from
  the table that decides the division: the Gesamttabelle in division mode),
  so they agree with what the overview shows once revealed.
- **Form**: one cell per played round, oldest left: ✓ (win), ✗ (loss, incl.
  walkover and drop loss; a double loss is an outlined ✗), a dash for an
  overdue unreported match. Glyphs rather than letters: they read the same in
  every language. Byes, future rounds and embargoed results have no cell;
  the running Spieltag has one once it has a result. A replacement's form
  carries the rounds before the entry as the predecessor's matches, the same
  way the table counts the slot.
- **Spoilers in the form: only the running Spieltag.** Earlier cells are
  always open; the running week's cell follows the match row's rule and is a
  covered square while that result is covered. One reveal state per match,
  shared with the row in the Spielplan block, so revealing either opens both.
- **Pl. and Bilanz are coupled to it.** Both count the running week, so
  while that result is covered they are covered too (pills in their own
  cells, and in the phone's sub-line "Platz ▢"). The row above, the form
  cell, Pl. or Bilanz each open all of them at once. Without a covered
  running-week result (unreported, embargoed, bye, own match, switch off) the
  numbers are open. This works here because every row hangs on exactly one
  match of the week; the standings tables elsewhere stay uncovered, where it
  would make no sense.
- **Form cells** (DESIGN.md §8.12): 19px squares (16px on a phone), a win
  green with a white ✓, a loss red with a white ✗, a double loss outlined in
  red ("Doppelniederlage" in the tooltip), overdue a dashed neutral outline
  with a dash. Green and red are near the zone hues; that is acceptable here
  because the Favoriten table has no zones, and the glyph carries the meaning
  for anyone with a red-green deficiency.
- **Phone**: the Gruppe and Pl. columns and the avatar fold away; a second
  line under the name reads "Division 1a · Platz 2".
- **Dropped** favourites stay, with the existing Drop tag.
- **Not placed** or **replaced** favourites are hidden (still stored).
- Sorted by division tier, then place, then name.
- Below the table and a one-line footnote: **"Spieler hinzufügen"**
  (`FavoriteSearch`), a field that opens its results below it: the running
  season's players with a table row (dropped included, replaced not, never
  the viewer), by name or @handle, eight at a time. Favourites already on the
  list are shown with their star and cannot be picked. Keyboard: arrows,
  Enter, Escape. The dialogs' `PlayerPicker` is not used here: it is an
  always-open list for a single choice inside a dialog, and on the page the
  search sits in the flow.

### States

- **Signed in, no favourites**: `EmptyStateCard` "Noch keine Favoriten", one
  sentence on what the page does, the search directly in the card. No week
  block, no switch.
- **Favourites stored, none plays this season**: the same card, "Keiner
  deiner Favoriten spielt mit", saying they stay stored.
- **Anonymous**: `EmptyStateCard` "Spieler verfolgen", the explanation and
  "Mit Discord anmelden".
- **No running season**: `EmptyStateCard` "Keine laufende Saison" (neutral
  tick): favourites stay stored and are back with the next season.

## The profile button

In the profile header, next to the identity block (desktop right of it,
mobile under it, left-aligned): an outline button "Favorit" with an outline
star; as a favourite the star is filled orange and the button carries a faint
orange border and wash. Optimistic, rolled back with an inline error if the
action fails. Not on your own profile, not for anonymous viewers.

## The star elsewhere

A filled star (12px, orange, `FavoriteStar`) before a favourite's name in the
`StandingsTable` (overview and Spieler-Dashboard), the overview's Spieltag
rows and `/spielplan` (not the staff Spielplan). It is a marker, not a
control (no hover, not clickable). Orange is "you / yours" in the design
system; a favourite is the viewer's own choice, so orange fits and stays
clear of the zone colours. The components take a `favoriteIds` set (empty for
anonymous viewers), loaded once per page.

## Data

New table `favorites` (RLS on, no policies; FKs in a custom migration):

```
user_id     uuid not null   -- FK auth.users, cascade
player_id   uuid not null   -- FK auth.users, cascade
created_at  timestamptz not null default now()
primary key (user_id, player_id)
check (user_id <> player_id)
```

## Feature folder: `src/features/favorites/`

- `favorites.ts` (pure, unit-tested), all on the public overview's projection
  so drops, replacements and the embargo arrive already applied:
  `favoriteGroups` / `favoritesWeek` (the week's rows, duel once, byes kept),
  `formCells`, `favoritesTable`, `currentWeekCell` / `formCellCovered` (the
  coupling), `favoriteCandidates`, `keepRemoved`, `favoriteRefusal`.
- `queries.ts` (integration-tested): `favoriteIds(userId | null)`,
  `addFavorite` (idempotent), `removeFavorite`, `hubUserExists`,
  `favoritesPage` (everything the page needs, built on
  `publicLeagueOverview`).
- `actions.ts`: `setFavorite({ playerId, on })`, signed-in only,
  `favoriteRefusal` on the server; revalidates `/favoriten`, `/`,
  `/spielplan`, `/spieler` and the profile.
- Components: `FavoritesView`, `FavoritesTable` (with `FormStrip`),
  `FavoriteSearch`, `FavoriteButton`, `FavoriteStar`.
- `src/features/spoilers/spoilers.ts`: `rowScoreHidden`, the match row's full
  cover rule, shared by `MatchRow` and the coupling so the two cannot
  disagree.

## Affected code

- `src/db/schema.ts` + generated migration + custom migration (FKs, RLS).
- `src/app/favoriten/page.tsx` (new, section `liga`).
- `src/features/navigation/sections.ts`: Liga row entry.
- `src/app/spieler/[userId]/page.tsx`: the button.
- `src/app/page.tsx`, `src/app/spielplan/page.tsx`, `src/app/spieler/page.tsx`:
  load the viewer's favourites for the stars.
- `StandingsTable` / `StandingsPanel` / `InSeasonDashboard`,
  `public-league.tsx` (`MatchRow` and `SpieltagTimeline` exported, `MatchRow`
  with an optional held reveal state), `full-schedule.tsx`: `favoriteIds`.
- `SpieltagTimeline`: played segments get a dark-mode colour (`white/35`, as
  the dashboard's progress strip), they were navy on navy.
- `src/features/dev/`: gallery specimens built from a fixture run through the
  real pure functions (`favorites-fixture.ts`: every row state, the table with
  covered and open form, Drop, overdue, empty states, the profile button);
  the persona "Zuschauerin", who gets demo favourites on sign-in
  (`favorites-persona.ts`: a duel of the running week, a dropped player, one
  player per further group).

## Discord

None.

## Tests

- Unit: `favoriteGroups` / `favoritesWeek` (duel once, bye kept, only
  favourites' matches, tier order, empty rounds); `formCells` (win, loss,
  double loss, drop loss, overdue vs. running round, byes, future rounds and
  embargoed skipped, a replacement's predecessor rounds, no running round);
  `favoritesTable` (deciding table, Drop, unplaced and replaced hidden,
  order); the coupling (only the running week, reveal, switch, own match,
  MotW); `favoriteCandidates`; `keepRemoved`; `favoriteRefusal`;
  `rowScoreHidden`; `sectionRow` has the entry; `pickDemoFavorites`.
- Integration: add twice is one row; remove; self rejected by the check;
  cascade on user delete; `favoritesPage` agrees with the public table (a
  held result is in neither record nor form), lists every round, offers the
  season's players with handles.
