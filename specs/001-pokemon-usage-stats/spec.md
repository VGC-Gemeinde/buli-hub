# Feature Specification: Pokémon usage stats of the running season

**Feature Directory**: `specs/001-pokemon-usage-stats/`

**Created**: 2026-10-16

**Status**: Shipped 2026-10-16

**Input**: User description: "Usage-Stats der aktuellen Saison anzeigen: Statistiken darüber, welche Pokémon (und ggf. Items, Fähigkeiten, Attacken, Tera/Mega) in den eingereichten Teamsheets der laufenden Saison wie oft verwendet werden. Grundlage sind die gemeldeten Teamsheets (src/features/teamsheets/)." Extended by the maintainer: Megas as separate entries, usage stats of their own for items, abilities and moves, and win rates.

## User Scenarios & Testing *(mandatory)*

Four rankings answer "what does the Buli play?": **Pokémon**, **Items**, **Fähigkeiten** and
**Attacken**. Each entry opens a detail view, and the filters narrow all of them alike. Usage
counts what was brought in the reported team sheets; next to it, the win rate says how the teams
that brought it fared.

### User Story 1 - Pokémon ranking (Priority: P1)

A player (or anyone following the league) opens the stats and sees every Pokémon in the season's
counted team sheets, ranked by usage, with its share of teams and its absolute count. A Mega is
its own entry: Charizard holding Charizardite Y counts as Mega Charizard Y, Charizard without its stone as
Charizard.

**Why this priority**: The Pokémon ranking is the question the community asks every week ("what
is the meta in the Buli right now?") and the entry point to everything else.

**Independent Test**: With a season that has reported results with sheets, the ranking lists
exactly the Pokémon and Megas from those sheets, ordered by usage, with shares as FR-003 defines.

**Acceptance Scenarios**:

1. **Given** a running season with reported matches and their sheets, **When** a visitor opens
   the stats, **Then** they see every Pokémon used at least once, ranked by usage, each with its
   sprite, name, share in percent and absolute count, and the number of counted teams the shares
   rest on.
2. **Given** a sheet with Charizard holding Charizardite Y and another with Charizard holding a Choice Scarf,
   **When** the ranking is shown, **Then** the first counts once for Mega Charizard Y and the second
   once for Charizard, and neither counts for the other.
3. **Given** a sheet that writes the Mega form directly ("Charizard-Mega-Y @ Charizardite Y"), **When**
   the ranking is shown, **Then** it counts exactly like the base form holding the stone.
4. **Given** two entries with the same usage, **When** the ranking is shown, **Then** they share a
   rank and are ordered alphabetically, the same on every load.
5. **Given** a running season without a single counted sheet yet, **When** a visitor opens the
   stats, **Then** they see an empty state instead of an empty table.
6. **Given** a match under result embargo (Match of the Week before its VOD, recording hold),
   **When** anyone opens the stats, **Then** the two sheets of that match are not counted, for
   every viewer alike; once the embargo ends they count.

---

### User Story 2 - Narrow the stats (Priority: P1)

A player narrows the stats to their division, to one Spieltag, or to the regular season or the
Nachsaison, to see what their own opponents play or how the meta shifted from week to week. The
filters apply to all four rankings and every detail view.

**Why this priority**: Chosen by the maintainer as part of the core; a league-wide ranking hides
how differently the divisions play.

**Independent Test**: For each filter and each combination, every number equals the same number
computed over exactly the sheets that pass the filters.

**Acceptance Scenarios**:

1. **Given** the stats, **When** a visitor picks a division, **Then** only sheets of players placed
   in that division count, and the number of counted teams updates.
2. **Given** the stats, **When** a visitor picks a Spieltag, **Then** only sheets of matches of that
   week count.
3. **Given** a season whose Nachsaison has not begun, **When** a visitor opens the stats, **Then**
   no phase filter is offered; **Given** the Nachsaison has begun but no match of it is reported,
   **When** a visitor switches to Nachsaison, **Then** they see the empty state.
4. **Given** a filtered view, **When** its link is opened by someone else, **Then** they see the
   same ranking or detail view with the same filters applied.
5. **Given** a filter set on the Pokémon ranking, **When** the visitor switches to Items, **Then**
   the filters stay as they were.

---

### User Story 3 - Item, ability and move rankings (Priority: P2)

A player switches from Pokémon to Items, Fähigkeiten or Attacken and sees each ranked by how many
of the counted Pokémon carry it: "Protect steht auf 48 % aller Pokémon."

**Why this priority**: Chosen by the maintainer; it answers what to prepare for across the field
("how much Fake Out is there?") without opening Pokémon one by one. It builds on the same counted
sheets and filters as Story 1.

**Independent Test**: For each of the three rankings, every share equals the number of counted
Pokémon carrying the entry divided by the number of counted Pokémon (six per counted sheet).

**Acceptance Scenarios**:

1. **Given** counted sheets, **When** a visitor opens Items, **Then** every item held at least once
   is listed with its share of all counted Pokémon and its absolute count, and Pokémon without an
   item appear as one entry "Kein Item". By default a Mega stone counts only its holders that are
   not its own Mega (FR-028); with "Ohne Mega-Steine" off every stone counts fully and the shares
   add up to 100 %.
2. **Given** counted sheets, **When** a visitor opens Fähigkeiten, **Then** every ability is listed
   with its share of all counted Pokémon; the shares add up to 100 %.
3. **Given** counted sheets, **When** a visitor opens Attacken, **Then** every move is listed with
   its share of all counted Pokémon carrying it; since a Pokémon carries up to four moves, the
   shares add up to at most 400 %.
4. **Given** entries with the same share, **When** a ranking is shown, **Then** ties behave as in
   Story 1.

---

### User Story 4 - Look into one Pokémon (Priority: P2)

From the Pokémon ranking, a player opens one entry and sees how the league plays it: items,
abilities, natures and moves, each with its share among that entry's appearances, and the
teammates it is most often brought with.

**Why this priority**: What a player preparing for a match needs ("what set does the Buli run on
Garchomp?"), but only once the ranking exists.

**Independent Test**: For one entry, every distribution equals a hand count over the counted
sheets that contain it.

**Acceptance Scenarios**:

1. **Given** a Pokémon used in several counted sheets, **When** a visitor opens it, **Then** they
   see its items (including "Kein Item"), abilities, natures and moves, each ranked by share among
   its appearances; item, ability and nature shares add up to 100 %, move shares to at most 400 %.
2. **Given** a Mega entry, **When** a visitor opens it, **Then** its item is its stone by
   definition and is not shown as a distribution; its Mega ability is shown as a fixed fact, and
   the abilities written in the sheets are shown as the distribution (they apply until it
   evolves).
3. **Given** a Pokémon, **When** its detail is shown, **Then** its most frequent teammates are
   listed with the share of its appearances in which they are on the same team; a teammate that
   is a Mega appears as the Mega entry.
4. **Given** a base Pokémon that also has Mega entries, **When** either is shown, **Then** it links
   to the other, so a visitor can get from Charizard to Mega Charizard Y and back.

---

### User Story 5 - Who carries an item, ability or move (Priority: P3)

From the item, ability or move ranking, a player opens one entry and sees which Pokémon carry it,
each with its share among the carriers: "Focus Sash: 30 % Kingambit, 22 % Charizard, …". As a
secondary fact, the entry also shows on how many teams at least one Pokémon carries it.

**Why this priority**: The mirror of Story 4; it completes the picture but builds on Story 3.

**Independent Test**: For one item, ability or move, the carrier distribution equals a hand count
over the counted Pokémon carrying it.

**Acceptance Scenarios**:

1. **Given** an item, ability or move, **When** a visitor opens it, **Then** they see every Pokémon
   entry carrying it, ranked by share among all its carriers (adding up to 100 %), each linking to
   that Pokémon's detail.
2. **Given** the same entry, **When** its detail is shown, **Then** the share of counted teams with
   at least one carrier is visible as a secondary line, clearly subordinate to the carrier list and
   never a column in a ranking.

---

### User Story 6 - Win rates (Priority: P2)

Next to its usage, every entry of every ranking shows the match win rate of the teams that brought
it, with the number of matches it rests on: "Teams mit Incineroar gewinnen 54 % ihrer Matches
(112)." A player sees not only what the Buli plays but what works.

**Why this priority**: Chosen by the maintainer; it is the second question after "what is
played", and it rests on the same counted sheets and filters.

**Independent Test**: For every entry and filter, the win rate equals the matches won divided by
the matches rated (FR-017), counted over exactly the appearances that pass the filters.

**Acceptance Scenarios**:

1. **Given** counted sheets of normally played matches, **When** a visitor opens any ranking,
   **Then** each entry shows its win rate in percent and the number of rated matches next to it,
   in the same row as its usage.
2. **Given** a Pokémon on both teams of one match (a mirror), **When** win rates are computed,
   **Then** it counts one win and one loss.
3. **Given** a team with two Pokémon carrying Protect, **When** the move win rate is computed,
   **Then** the result counts for both carriers, the same way usage counts both.
4. **Given** a match decided by a free win, a double loss or a drop, **When** win rates are
   computed, **Then** it is not rated; its sheets still count for usage.
5. **Given** an entry with no rated match under the current filters, **When** the ranking is
   shown, **Then** its win rate shows the empty-value placeholder.
6. **Given** a Pokémon or entry detail, **When** it is shown, **Then** its own win rate and match
   count appear with its usage.

---

### Edge Cases

- A match without sheets (free win, double loss, a drop counted as free win) contributes nothing.
- A sheet corrected later by staff or through a dispute counts in its current form only; there is
  no history of earlier sheets.
- A player replaced mid-season: their sheets from the matches they played still count; the
  replacement's sheets count from their entry on.
- Formes that are not Megas (regional formes, Rotom formes, ...) are separate entries, as the sheet
  writes them.
- A Mega stone held by a Pokémon it does not belong to is a plain item: the Pokémon stays its base
  entry, and the stone counts in the item ranking like any item.
- A team holding more than one Mega stone: every Pokémon holding its own stone counts as its Mega,
  because the sheet lists what was brought, not what evolved in the match.
- A species, item, ability or move the display data does not know yet (a fresh Champions patch) is
  still counted and shown with its name as written in the sheet, without a sprite if none exists;
  a Mega the display data does not know is counted as its base Pokémon until it does.
- Relegation, tiebreaker and playoff matches count (FR-010). Tiebreakers belong to the regular
  season, Relegation and Playoffs to the Nachsaison.
- A relegation match pairs players of two divisions: each sheet counts towards the division its
  player is placed in this season, so a division filter never splits or doubles a sheet.
- A filter combination with no counted sheet (a division whose week is not reported yet) shows the
  empty state, not an error. A detail view of an entry that does not occur under the current
  filters shows the empty state as well.
- A filter combination with very few sheets shows its real numbers; the number of counted teams
  shown with every ranking is what tells the reader how much they mean.
- The sheet lists six Pokémon, but a game is played with four, and the hub does not know which
  four. A win rate is therefore always the win rate of the teams that brought an entry, never of
  the entry having been on the field. Competitive players read usage stats this way, so the page
  does not explain it.
- An entry used once under a narrow filter shows its real win rate (0 % or 100 %) with its match
  count of 1; there is no minimum (FR-018).
- A season between its last Spieltag and its completion, or after it: stats stay visible for that
  season until the next season becomes the current one. From the moment the next season's
  registration opens, the stats show the new season and so its empty state; the finished season's
  stats become reachable again only with the later feature that opens past seasons.
- A Mega whose Mega ability the data does not know counts with the ability written in its sheet.
- A sheet of a match under an open dispute counts as stored, the same way the standings count its
  result; a resolution that changes the sheet shows up on the next load (FR-006).
- Tiebreakers have no week of their own: they are played in the first Nachsaison week ("Woche 1").
  They count under the regular season, so with "Reguläre Saison" that week is offered and holds only
  the tiebreakers; with "Nachsaison" it holds only the Relegation and Playoff matches (research R4).

## Clarifications

### Session 2026-10-16

- Q: Counting basis, per sheet or per player? → A: Per sheet; every played match with a sheet
  counts as one team (FR-003).
- Q: Do tiebreaker, relegation and playoff matches count? → A: All matches of the season count,
  with a switch between all, the regular season and the Nachsaison (FR-010).
- Q: Scope and filters? → A: The whole league, filterable by division and by Spieltag (FR-010).
- Q: How do Megas appear in the Pokémon ranking? → A: Instead of the base: a Pokémon holding its own
  stone counts only as its Mega, one without only as the base; every slot counts once (FR-004).
- Q: Basis of the item, ability and move rankings? → A: Share of counted Pokémon. The share of teams
  is a fun fact, not a statistic of equal rank: it appears only as a secondary line in an entry's
  detail, never next to the Pokémon share in a ranking (FR-008, FR-011).
- Q: Can an item, ability or move be opened to see who carries it? → A: Yes, with a carrier
  breakdown (FR-011).
- Q: Further scope? → A: Natures and teammates in the Pokémon detail. No stream API and no Discord
  post in this feature.
- Q: Win rates? → A: Added (Story 6). The leak was pointed out: under the Spieltag and division
  filters a win rate can be a single covered result (one team, 0 %). The maintainer chose to show
  win rates openly, like the standings, not behind the spoiler switch and not without the running
  week (FR-019).
- Q: What counts as a win? → A: The match (Bo3), not the single game (FR-017).
- Q: Where do win rates appear? → A: As a column in every ranking, next to usage (FR-016).
- Q: Minimum number of matches? → A: None; every win rate is shown with its match count (FR-018).
- Q: Moves and abilities have no sprite; what anchors them? → A: For moves a card with Showdown's
  game data in the detail (FR-023) and type icons in lists (FR-024). Abilities get neither: a
  card for them was tried in the mockups and dropped.
- Q: Which description? → A: Showdown's English short description. Showdown's German
  `shortDesc`/`desc` fields exist but are all still untranslated (checked 2026-10-16 in
  `smogon/pokemon-showdown` `data/text/de/`); the official German flavor text is prose without
  numbers and incomplete for Champions. Descriptions count as game data like the English names
  (Principle VI exemption, constitution 1.1.0).
- Q: How do Mega abilities affect the stats? → A: Two questions, two places. The league-wide
  ability ranking answers "what will I face on the field" and counts a Mega with its Mega ability
  (Mega Charizard Y as Drought). The player's choice of the sheet ability is a per-Pokémon fact and
  lives in the Mega's detail under "Im Teamsheet" (FR-027). This reverses an earlier assumption
  that the ranking counts the sheet ability.
- Q: What do the stats show between two seasons, once the next registration is open? → A: Strictly
  the current season, so the new season's empty state. Past seasons will become viewable in a later
  feature, which then shows their stats too; nothing here prepares a season picker.
- Q: Does the minimum-usage filter work in percent or in a minimum number of teams? → A: Percent.
  Under narrow filters it lets single-team entries through; that was pointed out and accepted.
- Q: Should win rates be colored (green above 50 %, red below)? → A: No; a plain number (FR-018).
- Q: Which term names the share of won matches everywhere: "Siegquote" or "Siegesquote"? → A:
  "Siegquote".
- Q: How are Mega stones handled? → A: In the Pokémon ranking a stone makes its holder the Mega
  (FR-004). In the item ranking a stone on its own Mega only repeats the Pokémon ranking and holds
  no decision, so "Ohne Mega-Steine" takes those holders out by default; a stone on the wrong
  Pokémon stays visible, because exploring such slips is part of the fun (FR-028).
- Q: Which type icons? → A: `partywhale/pokemon-type-icons` (MIT, in-game glyphs on colored
  circles). `duiker101/pokemon-type-svg-icons`, the maintainer's reference style, was rejected for
  its missing license and third-party design origin.
- Q: Does a ranking row need the absolute usage count? → A: No; the count the win rate rests on
  is the relevant one, and FR-008 was worded unluckily. For items, abilities and moves that count
  is labelled "Pokémon", because it counts carriers, not matches (found in converge).
- Q: Sorting? → A: Every ranking is sortable by its columns (reverses the earlier "no sorting by
  win rate"). Win-rate sorting is a plain sort; small samples are handled by a minimum-usage
  filter instead of a hidden threshold (FR-020, FR-021).

## Requirements *(mandatory)*

### Functional Requirements

**Counting**

- **FR-001**: The stats MUST be computed from the stored team sheets of the current season's
  reported matches and nothing else.
- **FR-002**: Sheets of a match whose result is under embargo for the public MUST NOT be counted,
  for any viewer; the rule is the existing result embargo evaluated for a neutral viewer, the same
  one the public standings use.
- **FR-003**: Pokémon usage MUST be counted per counted sheet: every match a player plays with a
  sheet is one team, so a player who brings the same team in seven weeks counts seven times. An
  entry's share is the number of counted sheets containing it divided by the number of counted
  sheets. Six Pokémon per sheet, so the shares of all entries add up to 600 %.
- **FR-004**: A Pokémon holding its own Mega stone MUST count as its Mega entry and only as that;
  which Mega follows from the stone (Mega Charizard X or Y). The two ways a sheet can write a Mega
  (base form with stone, Mega form with stone) MUST count alike.
- **FR-027**: In the ability ranking and in ability details, a Mega entry MUST count with its Mega
  ability (the ability it has on the field once it evolves), not with the ability written in the
  sheet. The sheet ability of a Mega appears only in that Mega's own detail ("Im Teamsheet").
- **FR-005**: Item, ability and move usage MUST be counted per counted Pokémon: the share is the
  number of counted Pokémon carrying the entry divided by the number of counted Pokémon (six per
  counted sheet). "Kein Item" is an entry of the item ranking.
- **FR-006**: Every number MUST reflect the stored sheets on every page load; a newly reported or
  corrected sheet shows up without a manual step.

**Views**

- **FR-007**: The hub MUST offer the stats for the current season, reachable from the Liga row of
  the site navigation, readable without signing in (team sheets are public already), with four
  rankings: Pokémon, Items, Fähigkeiten, Attacken.
- **FR-008**: Each ranking MUST show for each entry its rank, name (Pokémon and items with their
  sprite or icon, moves with their type icon), usage share, win rate (FR-016) and the count the win
  rate rests on: rated matches for Pokémon ("Matches"), rated carrying Pokémon for items, abilities
  and moves ("Pokémon", since two carriers in one match count twice). That count is the one that
  matters for reading the stats; the exact usage count stays in the detail ("N von M Teams"). The
  ranking also states the number of counted teams the stats rest on. A ranking shows exactly one
  usage share per entry; team shares stay in the details.
- **FR-009**: Ties MUST share a rank and be ordered alphabetically, deterministically. The rank is
  always the usage rank, whatever the ranking is sorted by.
- **FR-020**: Each ranking MUST be sortable by name, usage, win rate and match count, each in both
  directions; the default is usage, descending. Sorting by win rate is a plain sort (equal rates
  by match count, then alphabetically); entries without a rated match come last in both
  directions.
- **FR-021**: Each ranking MUST offer a minimum-usage filter in percent of the ranking's basis
  (all, or from 1, 2, 5 or 10 % upwards) that hides entries below it; it applies to the rankings only, combines with FR-010, and is part
  of the link (FR-012).
- **FR-025**: The move ranking MUST offer to hide Protect ("Ohne Protect"): Protect sits on about
  half of all Pokémon and would squeeze every other move's bar. Like FR-021 it hides the entry,
  leaves every share's basis unchanged and is part of the link.
- **FR-028**: The item ranking MUST offer "Ohne Mega-Steine", on by default: it takes out of each
  Mega stone's count the holders that are that stone's own Mega (Charizardite Y on Mega Charizard
  Y). A stone held by a Pokémon it does not belong to (Charizardite X on Incineroar) stays in, with
  its count, share and win rate from those holders alone, and ranks among the items accordingly.
  The basis stays all counted Pokémon; the ranks follow the counts shown. It applies to the
  ranking only (a stone's detail always lists all holders), is part of the link, and "Filter
  zurücksetzen" returns it to on.
- **FR-029**: A share above 0 that rounds to 0,0 % MUST read "<0,1 %", so a single entry never
  looks like none.
- **FR-026**: Usage bars MUST scale to the largest entry currently shown, so hiding an entry
  (FR-021, FR-022, FR-025, FR-028) makes the rest readable.
- **FR-023**: A move detail MUST show, under the move's name, a card tinted in the move's type color
  (FR-024's palette) with the small type icon, "BP" and "ACC" and Showdown's short description. The values MUST be those
  of Pokémon Champions where Champions differs from the main games. Abilities get no card. A move
  the data does not know shows no card; nothing else changes.
- **FR-024**: Moves MUST carry their type icon wherever they are listed: in the move ranking in
  the place a Pokémon's sprite takes, and before each move in a Pokémon's detail.
- **FR-022**: The Pokémon ranking MUST offer a Mega filter: all (default), only Megas, only
  Pokémon that are not Megas. Like FR-021 it hides entries and leaves every share's basis
  unchanged, and it is part of the link.
- **FR-010**: The stats MUST cover every match of the current season by default and offer three
  filters that combine (each narrows the counted sheets) and apply to every ranking and detail:
  - **Phase**: all (default), regular season (regular Spieltage and tiebreakers), Nachsaison
    (Relegation and Playoffs). Offered only once the Nachsaison has begun (its first week has
    started); before that every counted sheet is a regular one and the filter would offer two
    identical choices.
  - **Division**: all (default) or one division; a sheet belongs to the division its player is
    placed in this season.
  - **Spieltag**: all (default) or one week of the season that has started; only weeks of the
    chosen phase are offered.
- **FR-011**: Each Pokémon entry MUST open a detail with its items, abilities, natures, moves and
  most frequent teammates (Story 4); each item, ability and move MUST open a detail with the
  Pokémon carrying it and, as a secondary line, the share of teams with at least one carrier
  (Story 5).
- **FR-012**: Every ranking and detail view, with its filters, MUST be reachable by link, so a
  player can share "Fake Out, Division 2, Spieltag 5" in Discord.
- **FR-013**: Win rates are the only thing on the stats derived from match outcomes; no scores,
  pairings or individual results are shown.
- **FR-014**: Names of Pokémon, items, abilities, moves and natures MUST be shown the same way the
  hub's team sheet pages show them (English, as Showdown writes them), so the stats and the sheets
  they come from read alike.
- **FR-015**: All copy MUST be plain German and follow the league voice rules (game data shown as
  Showdown shows it is exempt, constitution Principle VI); the stats are a
  display page and let the layout speak.

**Win rates**

- **FR-016**: Every entry of every ranking MUST show, in its row next to its usage, its match win
  rate and the number of rated matches it rests on; Pokémon and entry details show the same for
  the entry itself.
- **FR-017**: A match is rated when its effective result is a normally played match with a winner
  (no free win, no double loss, not decided by a drop) and it is not under public embargo. Per
  counted appearance in a rated match, the appearance's team wins or loses the match. An entry's
  win rate is its wins divided by its rated appearances: per sheet for Pokémon entries, per
  carrying Pokémon for items, abilities and moves. A mirror counts on both sides.
- **FR-018**: Every win rate MUST be shown with its match count, whatever the count; an entry
  without a rated match shows the empty-value placeholder. Win rates carry no color or other
  good/bad marking.
- **FR-019**: Win rates are shown openly to every viewer, independent of the spoiler switch, like
  the standings. This is an accepted leak (Clarifications), not an oversight.

### Key Entities

- **Counted sheet**: a stored team sheet of a reported match of the current season that is not
  under public embargo and passes the filters. Six Pokémon, each with species, ability, nature,
  1 to 4 moves and an optional item.
- **Counted Pokémon**: one of the six slots of a counted sheet; the unit of the item, ability and
  move rankings.
- **Pokémon entry**: a species as written, or its Mega when it holds its own stone (FR-004).
- **Ranking**: per category (Pokémon, Items, Fähigkeiten, Attacken), every entry with its count and
  share over its basis (FR-003, FR-005).
- **Detail**: per entry, the distributions over its appearances (Pokémon: items, abilities,
  natures, moves, teammates; item, ability, move: carriers and team share).
- **Filter**: phase, division and Spieltag; each narrows the counted sheets (FR-010).
- **Rated match**: a counted sheet's match that was played normally and has a winner; the basis of
  every win rate (FR-017).

## UX & Mockups *(mandatory when users see a change)*

**Status**: Approved 2026-10-16

**Explanation level**: Display page, layout speaks, for every view: rankings and details are
tables and bars for competitive players, who need no explanation of the game. One line above each
ranking states the basis (teams, Pokémon, weeks); longer definitions sit behind short labels as
tooltips (constitution 1.1.0, Principle V).

| View | Route | Who sees it | Mockup file |
|------|-------|-------------|-------------|
| Rankings (Pokémon, Items, Fähigkeiten, Attacken) with filters | `/statistiken` (category in the path or query, settled in the plan) | public | mockups/rankings.html |
| Pokémon detail (base and Mega) | `/statistiken/pokemon/<id>` | public | mockups/pokemon-detail.html |
| Item, ability or move detail | `/statistiken/<kategorie>/<id>` | public | mockups/entry-detail.html |

The three files are one interactive mockup (every view, linked as on the real page), each opening
on its own view. Each shows desktop and phone width, light and dark, and the states:
rankings: normal, Nachsaison läuft, wenige Teams, leere Auswahl, Saison ohne Sheets, unbekanntes
Sprite; Pokémon detail: Mega Charizard Y, Charizard without Mega, Incineroar, wenige Teams, nicht
in Auswahl; entry detail: move (with card), item, ability, Kein Item, nicht in Auswahl. Sorting,
every filter and the tooltips work in the mockup.

**UX decisions**:

- One Liga row entry "Statistiken" after Favoriten. The four categories are a segmented control
  on the page, not row entries. Proposed routes: `/statistiken` (category as part of the path or
  query), details under `/statistiken/pokemon/<id>` and `/statistiken/<kategorie>/<id>`; the
  filters live in the query string so every view is linkable (FR-012).
- Pokémon and entry details live under `/statistiken/...`, so the row entry "Statistiken" stays
  marked there too (the row's prefix rule); they carry their own "← Zurück" (adjusted in planning,
  research R11).
- A Mega reads as the sheets read it: the base name (as the team sheet pages show it) with the Mega
  sprite and a small "Mega" / "Mega X" / "Mega Y" / "Mega Z" pill.
- Ranking row: rank, icon, name, usage with a bar, win rate, match count. Usage is the sort key and
  carries the weight (semibold, bar); the win rate is a plain number without color. Column headers
  and fact labels are short ("Nutzung", "Siegquote", "Matches"); the longer definition (basis of
  the share, which matches are rated) sits behind the label as a tooltip that opens on hover,
  keyboard focus and tap, marked by a dotted underline.
- A ranking shows the top 30 and "Alle N anzeigen" below.
- Column heads are the sort controls: a click sorts, a second click reverses, an orange arrow marks
  the active one; the tooltip sits on the same label (hover, keyboard focus). On a phone a tap
  sorts, so the definitions are reached there through the labels in the details.
- Ranking tables are real tables that scroll sideways when they do not fit (phone); rank and
  sprite stay pinned at the left edge (rank and name for abilities and moves), with a hairline
  where the pinned part ends. No column is dropped or folded on a phone.
- The basis line carries one per-category filter at its right (its own line on a phone): the Mega
  filter for Pokémon (segmented, Alle · Megas · Ohne Mega), the "Ohne Mega-Steine" chip for items
  (on by default, its exact rule in a tooltip), the "Ohne Protect" chip for moves, nothing for
  abilities. The slot keeps its height on every category, so switching
  categories never moves the table.
- Minimum usage is a fourth select in the filter row ("Jede Nutzung", "Nutzung ab 1 / 2 / 5 /
  10 %"), shown on the rankings only.
- Filters: phase as a segmented control (Alle · Reguläre Saison · Nachsaison), division and
  Spieltag as selects; a set filter is outlined orange. "Filter zurücksetzen" always has its place
  reserved and only becomes visible once a filter is set, so setting one never relayouts.
- The phase control only appears once the Nachsaison has begun; from then on it is always there
  (it comes with the season's state, never with an interaction). The Spieltag select offers only
  started weeks of the chosen phase; once the Nachsaison has begun it reads "Alle Wochen" and also
  lists the started Nachsaison weeks under the hub's names ("Woche 1", "Woche 2"; the mockup's
  labels were illustrative, research R4).
- A line above each ranking states the basis: teams, Pokémon and the covered weeks.
- Details open with two facts, Nutzung (with "N von M Teams" or "Pokémon") and Siegquote (with
  "N Matches"). The team share of an item, ability or move is one muted line under them ("Auf
  X % der Teams"). The carrier list is headed plainly "Pokémon".
- Mega detail: the item is shown as the stone alone, the Mega ability as a fixed fact in orange (as
  on the team sheet cards), the sheet abilities below it as "Im Teamsheet" (confirmed by the
  maintainer, 2026-10-16).
- No copy explains game knowledge competitive players have (what a stone does, that a Mega's
  ability replaces the sheet's, what a win rate of teams means). Empty states name the situation in
  one line instead of describing the page (maintainer, 2026-10-16).
- The move card sits under the move's name in the detail header (placing it in the sprite's slot
  was tried and dropped), at most 280px wide (the width it had in the sprite's slot), and stays
  minimal: type icon, "BP: 40 ACC: 100%" (Showdown's
  abbreviations, which competitive players read), the short description. Its border and fill are
  tinted in the move's type; that is the only color the type brings. Category, PP and priority are
  left out.
- Type icons are the round in-game-style SVGs of `partywhale/pokemon-type-icons` (MIT, commit
  `fcbe697`), copied into the repo with their license; not Showdown's type images. Their circle
  colors are the type palette: 18 tokens in `globals.css` (the card tint uses them) and a new
  entry in `design/DESIGN.md` §8, like the zone palette.
- Base and Mega details link to each other ("Auch gespielt als ...").
- Empty states use the EmptyStateCard: no sheets in the season (informational), nothing in the
  chosen filters, and an entry not played in the chosen filters (both with "Filter zurücksetzen").

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For any season state and filter, every number on the stats equals a hand count over
  the counted sheets, verified by tests over every counting rule (basis, Mega resolution, embargo,
  filters, formes, ties, "Kein Item", rated matches, mirrors, win rate per carrier).
- **SC-002**: A sheet reported or corrected is reflected on the next page load, with no manual step.
- **SC-003**: No embargoed match's sheet ever influences a number on the stats, for any viewer.
- **SC-004**: From the Liga row, a visitor finds a given Pokémon's most common item, and a given
  move's most common carrier, within three interactions, on desktop and on phone width.
- **SC-005**: Every view renders without horizontal scroll at phone width and reads correctly in
  light and dark mode.

## Assumptions

- Naming: the hub already has a feature called "usage statistics" (`src/features/usage/`, page
  loads at `/staff/nutzung`). This feature needs a distinct name in UI and code (e.g.
  "Statistiken" in the Liga row, a feature folder like `pokemon-stats`) so the two are never
  confused; the final names are set in the mockups and plan.
- Pokémon Champions has no Terastallization; the stored sheets carry no Tera type. Tera is out of
  scope; Megas take its place.
- Mega resolution follows the rules the team sheet pages already use, so a sheet and the stats
  never disagree on whether a Pokémon is a Mega.
- Unlike the team sheet feature, where the dex is display-only, this feature lets the dex shape
  counts: Mega resolution (FR-004) and Mega abilities (FR-027) come from `@pkmn/dex` and the
  override maps in `mega.ts`. A dex gap therefore changes numbers (a fresh Mega counts as its base
  until the dex or an override knows it); the override maps are the remedy.
- EVs and other stats are never stored, so no stat spreads are shown.
- Game data of moves (type, base power, accuracy, description) is display-only: it can never
  change a count. The pinned `@pkmn/dex` 0.10.11 has no Champions data, while Showdown's
  `data/mods/champions/moves.ts` changes base power, accuracy and PP of a few hundred moves; the
  plan settles where the Champions values come from (FR-023).
- English game data (Pokémon, item, ability, move and nature names, Showdown's short
  descriptions, "BP"/"ACC") is exempt from Principle VI's German rule since constitution 1.1.0
  (2026-10-16, amended for this feature).
- Only the current season; earlier seasons and a season picker are out of scope. A later feature
  makes past seasons viewable and will show their stats; the counting here takes a season as input,
  so that feature can reuse it.
- Out of scope: stream API, Discord posts, game win rates, win rates inside
  the distributions of a detail (per item of a Pokémon, per teammate), pairs or cores beyond the
  per-Pokémon teammate list.
- Player stats are a separate feature after this one, building on its counting rules (maintainer,
  2026-10-16): per player the Pokémon, items and moves brought this season with win rates
  (scouting, likely on the player profile); player rankings by sheet figures (most team changes,
  most Megas, ...); team constancy (how many distinct teams, how long one is kept); and stats
  independent of sheets, such as overall win rate and playoff chances. Playoff chances are a
  projection, not a count, and may warrant their own spec.
- Combination win rates (a Pokémon with a given item, ability, move or teammate, e.g.
  "Incineroar + Sitrus Berry") are a separate feature after this one (maintainer, 2026-10-16);
  it builds on this feature's counting and must answer how it treats the small samples such
  combinations produce.
- Spoiler protection: embargoed matches never count (FR-002); beyond that, win rates are open like
  the standings (FR-019).
