# Research: Pokémon usage stats of the running season

Phase 0 of `/speckit-plan`. Each entry: decision, rationale, alternatives considered.

## R1. Which matches and sheets count

**Decision**: One new window-wide query in `src/features/pokemon-stats/queries.ts` reads every
`team_sheets` row whose match belongs to the current window (all stages: regular, tiebreaker,
relegation, playoff), joined with `matches` (stage, round, players) and `match_results` (outcome,
winner). It then drops every match in `publicEmbargoedIds({ motw: motwForWindow(), holds:
holdsForWindow() })` (`src/features/spoilers/embargo.ts`). Sheets only exist for normal results
(a normal result requires one per participant), so free wins and double losses contribute nothing
by construction.

**Rationale**: No existing exported query covers all stages with embargo applied: `groupResults` /
`publicLeagueOverview` only see regular matches (sub-division set), `publicRelegationPlayoffs`
builds its own withheld set for the post-season, and the stream API's `matchInputs` is private and
deliberately embargo-free. `publicEmbargoedIds` is the one rule that tables use (constitution
Principle VII); evaluating it for the neutral viewer gives FR-002 exactly, for every stage, since
MotW selections and recording holds are keyed by match.

**Alternatives considered**: Exporting the stream API's `matchInputs` and filtering it: it loads
avatars, games and profiles we do not need and is shaped for the stream; coupling the two would
make a stream change a stats change. Going through `groupResults` per sub-division plus
`publicRelegationPlayoffs`: two code paths for one question, and neither carries sheets.

## R2. Rated matches for win rates (drops)

**Decision**: A sheet's match is rated when its stored outcome is `normal` with a winner and, for
regular matches, it is not `decidedByDrop(match, droppedIdsForWindow(...))`
(`src/features/drops/drops.ts`). Post-season matches are rated on their stored result.

**Rationale**: `effectiveResult` turns a dropped player's played regular matches into 2:0 free wins
for the opponent. The sheets of such a match stay (they show what was brought, FR-017), but its
result no longer says anything about the teams, so it is not rated. Post-season matches do not go
through `effectiveResult`; late drops act on seats (`lateDroppedAt`), and a played post-season
match keeps its result.

**Alternatives considered**: Rating by stored result regardless of drops: the win rate would then
disagree with the public table about who won those matches.

## R3. Division of a sheet

**Decision**: One batch read of `placements` joined with `divisions` for the window, mapping
`userId → tier`; a sheet belongs to `tier` of its `playerId`.

**Rationale**: A replacement gets its own placements row with the slot's division
(`acceptOffer`, `src/features/replacements/queries.ts`), and sheets are keyed to whoever played, so
the player's own placement is always the right division, including in relegation matches that pair
two divisions. `playerPlacement` exists but is per user; the batch join is the same select over
the window.

## R4. Weeks, phases and "started"

**Decision**: Weeks come from `allMatchdaysForWindow` with names from `weekNames`
(`src/features/season/week-names.ts`): "Spieltag N" for regular weeks, "Woche N" after the regular
season. A week is offered once `startsOn <= germanToday()`, the hub's one pattern for "started".
The phase of a sheet follows its match's `stage`: regular and tiebreaker are the regular season,
relegation and playoff the Nachsaison. The phase control appears once the first non-regular
matchday has started.

**Rationale**: Tiebreakers have no week of their own; they are inserted with the round of the
first non-regular matchday (`persistPublication`), so they share "Woche 1" with the first
Relegation/Playoff round. Splitting phase by stage and week by round keeps both filters exact: under
"Reguläre Saison", "Woche 1" holds only the tiebreakers; under "Nachsaison" only the post-season
matches. The mockup's week labels ("Relegation", "Playoffs · Viertelfinale") were illustrative;
the hub's existing names are used so the filter reads like the Spielplan.

## R5. Parsing and Mega resolution

**Decision**: Each stored `ots` goes through `parseTeamsheet` (`src/features/teamsheets/parse.ts`),
then each mon through `resolveMega(species, item)` (`src/features/teamsheets/mega.ts`). The Pokémon
entry is keyed by `toId(spriteSpecies)` (the Mega forme when a stone applies, the species as
written otherwise), named by `displayName` plus a Mega label derived from the forme ("Mega",
"Mega X", "Mega Y", "Mega Z"). A slot is a Mega by its own stone when `canonicalSpecies` left the
base and the stone evolves it; its counted ability is `megaAbility ?? ability` (FR-027;
`resolveMega` returns `megaAbility` only when it differs from the listed one, so falling back to
the listed one is also the right answer when they are equal). A sheet that fails to parse (none
should, they were validated on submit) is skipped and logged, never fatal.

**Rationale**: Reuses the exact rules the team sheet pages use (spec Assumptions), including the
`MEGA_ABILITY_OVERRIDES` for Reg M-C. Stored OTS is canonical (base form plus stone), so both ways
of writing a Mega count alike (FR-004) without new code.

**Note**: This makes the dex shape counts (spec Assumptions). The override maps in `mega.ts` remain
the remedy for a dex gap.

## R6. Champions move data for the move card

**Decision**: Add `@pkmn/mods@0.10.11` (same family and version as the pinned `@pkmn/dex`) and read
moves through `Dex.mod("champions", championsData)`, server-side only. A small
`MOVE_OVERRIDES` map in the feature covers values where upstream Showdown has moved on since the
release. **Needs the maintainer's approval at Gate 2 (Principle III: new dependency).**

**Rationale**: `@pkmn/dex` 0.10.11 has no Champions data; Showdown's
`data/mods/champions/moves.ts` changes base power, accuracy and PP of many moves. `@pkmn/mods`
0.10.11 ships that mod: checked 2026-10-16, `Dex.mod("champions", …)` gives Apple Acid 90 BP and
Protect 5 PP. Against upstream (`smogon/pokemon-showdown` master) it differs in 4 values (Meteor
Assault and Slash base power, Strength Sap and Wish PP), all newer than the release; the card
shows BP and accuracy, so two of them matter today. Renovate keeps `@pkmn/mods` in step with
`@pkmn/dex`.

**Alternatives considered**: A hand-written map of the ~30 base power and accuracy changes from
upstream, no dependency: smaller today, but a second copy of Showdown data to sync by hand at every
Champions patch. Showing gen 9 values: wrong numbers on a card that exists to show numbers.

## R7. Move descriptions

**Decision**: `shortDesc` from the dex (English). Exempt from the German rule as game data since
constitution 1.1.0.

**Rationale**: Showdown's German `shortDesc`/`desc` fields are all still untranslated (checked
2026-10-16 in `data/text/de/`); the official German flavor text is prose without numbers and
incomplete for Champions. Showdown falls back to English the same way.

## R8. Type icons and palette

**Decision**: The 18 SVGs of `partywhale/pokemon-type-icons` (MIT, commit `fcbe697`) copied to
`public/type-icons/` with their `LICENSE`; their circle colors become `--type-*` tokens in
`src/app/globals.css` (same in both modes) and a type palette entry in `design/DESIGN.md` §8.

**Rationale**: Maintainer's choice among two sets (spec Clarifications). A fixed set of 18 small
files is not a dependency; copying keeps the build offline. Colors as tokens keep "no color outside
the tokens".

## R9. Tooltip behind short labels

**Decision**: A small shared `InfoLabel` in `src/components/info-label.tsx`: the label as a plain
`<button>` with a dotted underline and a box shown on hover and on focus, CSS-only (`group-hover`,
`group-focus`), so a tap focuses it on a phone and a keyboard reaches it. In sortable column heads
the label is part of the sort link (`InfoTooltip` with `group/info` on the link): hover and focus
show the definition, a tap sorts.

**Rationale**: Radix Tooltip (in the installed `radix-ui` 1.6.1) does not open on touch, which the
spec needs in the details. A Popover would need a click and loses hover. CSS covers both, adds no
client JS, and matches the mockup. New shared primitive, so it goes into `DESIGN.md` §8 and the
`/dev/ui` gallery.

## R10. Computing on every load

**Decision**: No cache and no stored aggregates. The page loads the window's sheets and computes
all four rankings in pure functions per request (FR-006).

**Rationale**: A season has about 7 regular weeks × ~60 matches × 2 sheets plus the post-season:
under 1,000 sheets, each a short text. Parsing and counting that is milliseconds; the query is one
indexed join. A materialized aggregate would have to be invalidated on every report, correction and
embargo release, which is exactly the class of drift FR-006 forbids. Verified against production
-shaped data in the quickstart.

## R11. Routes and URL state

**Decision**: `/statistiken/[kategorie]` with `pokemon`, `items`, `faehigkeiten`, `attacken`
(`/statistiken` redirects to `/statistiken/pokemon`), details at `/statistiken/[kategorie]/[id]`
with `id = toId(name)` (`none` for "Kein Item"). Filters, sort and the per-category filters are
query parameters (contract in `contracts/routes.md`). Server Components read them, Zod parses them
with defaults, the filter controls are a small client component that replaces the URL.

**Rationale**: Linkable views (FR-012) need the state in the URL; query parameters keep one page per
category and survive "Zurück". The Liga row entry `/statistiken` is marked on every stats page,
details included, because `activeHref` (`src/features/navigation/sections.ts`) prefix-matches
subpaths; that is right here (the details belong to Statistiken), so the spec's UX decision is
adjusted to it. Details keep their "← Zurück".

## R12. Constitution 1.1.0 (reasoning for the amendment this feature triggered)

Three rules came out of the mockup iteration and hold beyond this feature, so they went into the
constitution on 2026-10-16 instead of staying in a spec that freezes on shipping:

1. **No explaining of game knowledge.** The audience is competitive players; copy like "immer, das
   macht den Mega" read as noise. Definitions behind short labels as tooltips keep the page clean
   and the definition reachable.
2. **No relayout on state change.** "Filter zurücksetzen" appearing moved the layout; the existing
   spoiler rule was the special case of a general one.
3. **Showdown game data exempt from German.** The hub already showed English names on team sheets;
   the move card adds Showdown's descriptions and "BP"/"ACC". Translating game data would be ours
   alone and drift from what players read everywhere else.

## Found on the way (outside this feature)

`getTeamSheet` (`src/features/teamsheets/queries.ts`) inner-joins `sub_divisions`, so `/pastes/<id>`
finds no sheet of a tiebreaker, relegation or playoff match. This is a bug fix for its own commit,
not part of this feature; the stats link to Pokémon, not to pastes.
