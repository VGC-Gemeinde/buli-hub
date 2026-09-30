# Player replacement

**Status: done** (2026-09-30): offer, acceptance and standings attribution
with unit and integration tests, staff and player views, gallery and seed,
and the season 9 backfill rehearsed on a production clone.

No designer hand-off follows for this feature: its views are built final from
the start, polished on `design/DESIGN.md` tokens and existing anatomies
(desktop and mobile), not as a rudimentary first pass.

## Context

A dropped player's slot can be taken over by someone who was not in the
season. Rare, but it has to be a defined path: a replacement touches
placements, matches, registrations and standings at once, and every later
feature has to know the shape it leaves behind. Without a path, a replacement
becomes hand-written SQL that no feature anticipates.

The replacement takes over the **slot**:

- From the **entry round** on, the slot's matches are the replacement's, a
  normal schedule.
- The rounds before it stay the dropped player's matches: the stored history
  and the match pages keep showing who was scheduled, and the drop counts
  each of them 2:0 for the opponent as always.
- In every table, the slot is one row, the replacement's. The rounds before
  the entry round count for it as what they are under the drop: losses, and
  head-to-head losses against those opponents. At the moment of entry the
  replacement therefore stands exactly where the dropped player stood (0-x),
  and every table still adds up.
- The dropped player leaves every table (group, division, anything built on
  the standings). They are demoted for certain, and since their row is gone
  they no longer push anyone else into a zone. Their profile keeps the
  season: dropped, replaced by whom, demoted.

A dropped player without a replacement is unchanged: they stay in the table
with the Drop marker, exactly as `player-drops.md` describes.

Example (season 9, group of Testio | Anton): Anton is dropped in round 1, Ni2
comes in during round 2. The group shows Ni2 with 1-1: round 1 as a loss
against its opponent (the drop's free win), round 2 his own win. Anton is not
in the table. The round 1 opponent has one win from that match.

## Scope

**In:**

- **Staff actions on a dropped player** (the dropped row on the Teilnehmer
  page and the player's profile): "Drop aufheben" (existing) or "Ersatz einsetzen". A replaced
  player can no longer be un-dropped (`undropPlayer` refuses with a reason).
- **Offer** (staff+): pick a user who has signed in to the hub at least once
  and holds no placement in the window, and the entry round: the running
  matchday (default) or the next one. Staff decide this case by case: found on
  a Tuesday, the replacement usually still plays this week; on a Saturday it
  may be the next one. Between two matchdays only the next one is offered.
  Creates a pending replacement. Staff can withdraw a pending offer. One
  pending or accepted replacement per dropped player.
- **Acceptance** (the replacement): the Spieler-Dashboard shows a card with a
  form: the registration data (same fields and validation as `/anmeldung`,
  shared through `parseRegistration`), submitted with "Platz übernehmen".
  The form's Regelwerk tick is recorded as the acceptance, as on
  registration. Gated like
  registration: a confirmed non-member of the Discord server gets the
  membership block. The Regelwerk gate then applies as for every player. If
  the chosen matchday has already ended when the offer is accepted, the entry
  round becomes the running (or next) matchday instead, never a past one.
- **What acceptance does** (one transaction):
  1. Upsert the replacement's registration from the form.
  2. Create their placement in the dropped player's division and group.
  3. Fix the entry round (see above).
  4. Move every match of the dropped player with `round >= entry round` onto
     the replacement (`player_a_id` / `player_b_id`). Earlier matches stay
     with the dropped player.
  5. Stamp the replacement accepted.
- **Standings**: `groupResults` first applies the drop override as always,
  then `attributeReplacements` hands every match still on a replaced player
  (all before the entry round, all drop losses) to whoever holds the slot
  now. `groupStandingsInput` (and through it `divisionGroups`) splits the
  group into `roster`, the table rows without replaced players, and
  `members`, everyone placed, for resolving names on the earlier matches.
  `computeStandings` itself is unchanged: tallies, head-to-head and the
  division table's equal-size rule all see one normal row per slot. The
  per-match result map for schedules (`subDivisionResults`) is not
  attributed: a match page and a schedule row show the match as stored.
- **Display**: the replacement's table row carries an "Ersatz" tag whose
  tooltip says "Ersatz für {Name} ab Spieltag {n}"; their profile and
  dashboard say the same in a line. The dropped player's profile says
  "Ersetzt durch {Name} ab Spieltag {n}", out of the table and demoted, with
  no rank. On the replacement's schedule (dashboard and profile), the rounds
  before entry show the predecessor's opponent with the drop loss as a
  dashed "Vor Einstieg" row (`PlayerMatch.inherited`), never as the next
  match to play; the match page stays the dropped player's.
- **Membership list**: nothing new. The dropped player is gone from it
  already (`registeredMembership`), and the replacement is a registered,
  active player like any other.
- **Discord**: the periodic season sync picks up the new placement (role and
  group channel) on its next run. Acceptance additionally triggers the sync
  for the replacement, so they can reach their group right away. No channel
  announcement, and no result posts for the earlier rounds (drop rule).
- **Production data** (see below): season 9 is rewritten to the state this
  feature would have produced.

**Out:**

- Replacing a player who is not dropped (drop first, then replace).
- Replacements before the seeding is finalized: then it is a registration.
- Changing the entry round after acceptance.
- Notifying the replacement by DM. Staff arrange it on Discord anyway, the
  offer is the formal step after that.

## Data

New table `player_replacements` (RLS on, no policies, FKs in the custom
migration like the other staff tables):

```
id                   uuid pk
window_id            uuid not null
replaced_user_id     uuid not null    -- the dropped player
replacement_user_id  uuid not null
offered_by_id        uuid null        -- FK auth.users, set null
offered_at           timestamptz not null default now()
entry_round          integer not null -- staff's choice, adjusted on acceptance
accepted_at          timestamptz null -- null = pending
unique (window_id, replaced_user_id)
```

A withdrawn offer is deleted, no history row: nothing happened yet.

## Feature folder: `src/features/replacements/`

- `replacement.ts` (pure, unit-tested): `entryRoundChoices(matchdays, date)`
  (running and next, or only next between matchdays),
  `effectiveEntryRound(chosen, matchdays, date)`, `slotHolder` /
  `predecessorsOf` (chains: a replacement can be dropped and replaced in
  turn), `attributeReplacements` + `standingsRoster` (the standings step),
  `missedMatches`, `offerBlock`, and the row tags (`replacementNotes`,
  `markReplacements`).
- `queries.ts` (integration-tested): offer / withdraw / pending offer for a
  user / accept as one transaction / replacements of a window or group /
  offer candidates.
- `actions.ts`: `offerReplacement`, `withdrawReplacement` (staff+, running
  season only), `acceptReplacement` (the offered user).
- Components: `OfferReplacementDialog` (wide two-column dialog on desktop:
  the searchable player list left, the slot, the entry round with the losses
  each choice starts with (`missedByEntryRound`) and the submit right; on a
  phone the columns stack with title and action bar pinned),
  `ReplacementStatusLine` / `WithdrawOfferButton` (staff lists),
  `ReplacementOfferPanel` (the dashboard offer around the registration form,
  which takes the action as its `submit`), `ReplacementNote` (dashboard
  line).

Touched elsewhere: `groupResults` / `groupStandingsInput` / `divisionGroups`
(reporting), `buildPlayerMatches` / `splitPlayerMatches` (season), the
standings table tag, the profile schedule and season line, `undropPlayer`
(refuses a replaced player and one with an open offer), the Teilnehmer rows
and profile staff panel (`DropActions`: replace, un-drop, withdraw, or
nothing once replaced).

## Production data: season 9

Found state (read-only check on 30.09.): Anton's original placement row now
belongs to Ni2; Anton has a new, dropped placement without a group; Ni2 has a
stub registration (showdown, new, no form data); all seven matches of the
slot, round 1 included, are on Ni2; round 1 is a free win for the opponent.

A custom migration (`20260930093550_season9_replacement_backfill.sql`),
guarded by the concrete ids and the found state so it does nothing on any
other database:

1. Swap the two placement rows back: Anton owns his original row (created
   31.08., group restored, dropped 14.09.), Ni2 gets the new row.
2. Round 1 (`28ddab46…`) back onto Anton. Rounds 2 to 7 stay on Ni2.
3. `player_replacements` row: Anton → Ni2, offered and accepted
   14.09. 22:11, entry round 2. `offered_by_id` stays empty: who arranged it
   by hand is not recorded anywhere.

Ni2's stub registration stays as it is.

Visible effect: none in the tables (Ni2 keeps 1-1, Anton stays out of them).
The round 1 match page shows Anton again, and both profiles gain the
replacement labels. Rehearsed with `npm run db:clone-prod` before it ships.

## Dev tooling

- Seed (`seedReplacements` in `src/features/dev/seed.ts`): on top of the plain
  drop, a slot taken over from the running Spieltag by the fresh seed user
  "Nachrücker Nemo", and a dropped player whose offer to "Angefragt Ari" is
  still open. Impersonating Ari via `/dev/login-as` shows the acceptance card,
  so no extra persona is needed: a persona would have to exist before the
  seed runs to receive an offer.
- Gallery: offer dialog (with and without the running-matchday choice),
  acceptance card, "Ersatz" labels, the replaced player's profile line.

## Tests

- Unit (`replacement.test.ts`): `entryRoundChoices` (during a matchday, between matchdays, before the
  first, during the last), `effectiveEntryRound` (chosen still open, chosen
  already over), `attributeReplacements` then `computeStandings` (replacement
  row carries the earlier losses, opponent credited once, head-to-head lost
  against those opponents, dropped player absent, division table present with
  equal slot counts, unreplaced drop unchanged), guards.
- Integration (`queries.integration.test.ts`): offer → accept moves exactly the matches from the entry round,
  creates registration and placement; withdraw; double offer refused; accept
  by the wrong user refused; un-drop of a replaced player refused; the prod
  migration on a fixture of the found state.
