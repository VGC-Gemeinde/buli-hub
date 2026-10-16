# Contract: pure functions of `src/features/pokemon-stats/`

The domain surface the pages call and the unit tests cover exhaustively (constitution
Principles I, II). Database access stays in `queries.ts`; nothing else touches the database.
Types are in `data-model.md`. As built.

```ts
// sheets.ts: one stored sheet into slots (parse + Mega resolution, R5).
toSlots(ots: string): Slot[] | null              // null for a sheet that does not parse
megaLabel(species: string): MegaLabel | null     // "Mega", "Mega X/Y/Z" from the forme
toId(value: string): string

// filter.ts
filterSheets(sheets: CountedSheet[], filter: StatsFilter): CountedSheet[]
postSeasonBegun(weeks: Week[], today: string): boolean
weekOptions(weeks, today, phase, tiebreakerRounds: Set<number>): WeekOption[]
selectionLabel(filter, weeks: WeekOption[]): string      // "Division 2 · Spieltag 1 bis 6"
parseStatsParams(params, { weeks, today, tiebreakerRounds }): { filter, options }
statsHref(path, filter, options?): string                // omits defaults (contracts/routes.md)
isFiltered(filter, options?): boolean                    // when "Filter zurücksetzen" shows

// rankings.ts
ranking(sheets, category: "pokemon" | "items" | "abilities" | "moves", options): Ranking
sortEntries(entries, sort): RankingEntry[]               // FR-020; rank stays the usage rank

// details.ts
pokemonDetail(sheets, entryId: string): PokemonDetail | null
entryDetail(sheets, category: "items" | "abilities" | "moves", id: string): EntryDetail | null

// format.ts
formatShare(share: number): string                       // "41,3 %", "<0,1 %" (FR-029)
formatWinRate(wins: number, rated: number): string       // "—" without a rated match
formatCount(value: number): string                       // "2.472"

// move-card.ts (server only, imports @pkmn/dex + @pkmn/mods)
moveCard(name: string): { name, type, basePower, accuracy, shortDesc } | null
moveType(name: string): string | null
```

`queries.ts` exposes `countedSheets(windowId)`, `statsWeeks(windowId)` and
`seasonTiers(windowId)`, covered by an integration test; `load.ts` combines them with the URL for
the pages.
