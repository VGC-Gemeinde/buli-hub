# Data Model: Pokémon usage stats of the running season

**No schema change.** Everything is read from existing tables and computed per request
(research R10). This file describes the in-memory shapes the pure functions work on.

## Sources (existing tables)

| Table | Used for |
|-------|----------|
| `team_sheets` (`match_id`, `player_id`, `ots`) | the sheets |
| `matches` (`window_id`, `stage`, `round`, `player_a_id`, `player_b_id`) | stage, week, opponents |
| `match_results` (`outcome`, `winner_id`) | rated or not, who won |
| `matchdays` (`round`, `starts_on`, `regular`) | week names, "started" |
| `placements` + `divisions` (`tier`) | division of a sheet's player |
| `motw_selections`, `recording_holds` | public embargo (`publicEmbargoedIds`) |
| `placements.dropped_at` | regular matches decided by a drop (`decidedByDrop`) |

## Shapes

### `CountedSheet` (query output, one per sheet that survives the embargo)

| Field | Type | Rule |
|-------|------|------|
| `matchId` | string | |
| `playerId` | string | |
| `phase` | `"regular" \| "post"` | `regular`/`tiebreaker` → regular; `relegation`/`playoff` → post |
| `round` | number | `matches.round` |
| `tier` | number \| null | the player's placement division; null if none (should not occur); such a sheet counts only without a division filter |
| `result` | `"won" \| "lost" \| null` | null when the match is not rated (R2) |
| `mons` | `Slot[6]` | parsed and resolved (R5) |

### `Slot` (one Pokémon of a sheet)

| Field | Type | Rule |
|-------|------|------|
| `entryId` | string | `toId(spriteSpecies)`: the Mega forme when its own stone applies |
| `name` | string | `displayName` (base name, as team sheet pages show it) |
| `mega` | `"Mega" \| "Mega X" \| "Mega Y" \| "Mega Z" \| null` | from the Mega forme |
| `sprite` | species string | for `spriteFor` / `iconFor` |
| `item` | string \| null | as written; null = "Kein Item" |
| `ownStone` | boolean | item is this slot's own Mega stone (FR-028) |
| `sheetAbility` | string | as written |
| `ability` | string | counted ability: `megaAbility ?? sheetAbility` (FR-027) |
| `nature` | string | |
| `moves` | string[] (1–4) | |

### `StatsFilter` (parsed from the URL, `contracts/routes.md`)

`phase: "all" | "regular" | "post"`, `tier: number | null`, `round: number | null`. Narrows the
counted sheets for every view.

### `RankingOptions` (rankings only)

`sort: { key: "name" | "use" | "win" | "matches", dir: "asc" | "desc" }`,
`minShare: 0 | 1 | 2 | 5 | 10`, `mega: "all" | "mega" | "base"` (Pokémon),
`hideProtect: boolean` (moves), `hideOwnStones: boolean` (items, default true).
They hide entries; they never change a basis.

### `RankingEntry`

| Field | Rule |
|-------|------|
| `id`, `name`, `mega?`, `sprite?` / `itemIcon?` / `type?` | display |
| `count` | Pokémon: sheets containing it; others: slots carrying it (FR-003, FR-005); items under `hideOwnStones`: slots minus own-stone holders (FR-028) |
| `share` | `count / basis`; basis = sheets (Pokémon) or slots (others), always of the filtered sheets |
| `rank` | usage rank over the counts shown, ties share a rank (FR-009) |
| `wins`, `rated` | over rated appearances (FR-017); win rate = `wins / rated`, null when `rated = 0` |

### `Ranking`

`{ basis: { sheets, slots }, weeks: label, entries: RankingEntry[] }`.

### `PokemonDetail`

Usage and win rate of the entry, plus distributions over its appearances: `items` (omitted for a
Mega: its stone is fixed), `abilities` (sheet abilities; for a Mega also `megaAbility`), `natures`,
`moves`, `teammates` (other entries on the same sheet), and `family` (base and Mega entries of the
same species with their usage, "Auch gespielt als").

### `EntryDetail` (item, ability, move)

Usage and win rate, `teamShare` (sheets with at least one carrier / sheets), `carriers` (Pokémon
entries carrying it, share among carriers), and for moves `card: { type, basePower, accuracy,
shortDesc } | null` (Champions values, R6).

## Invariants (tested)

- Pokémon counts sum to `6 × sheets`; item and ability counts to `slots` (with `hideOwnStones`
  off); move counts to at most `4 × slots`.
- Every share's basis is the filtered sheets, independent of `RankingOptions`.
- An embargoed match never appears in `CountedSheet[]`.
- A mirror contributes one win and one loss to the same entry.
- Ties: same count, same rank, alphabetical order; deterministic.
