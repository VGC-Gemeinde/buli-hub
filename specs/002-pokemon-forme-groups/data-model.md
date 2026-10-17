# Data model: Formen in den Pokémon-Statistiken zusammenfassen

No database change. Everything here is in-memory TypeScript in `src/features/pokemon-stats/`.

## Grouping list (`formes.ts`)

```ts
// Base forme → the formes that count as it (dex names). Maintained by hand (FR-002).
const FORME_GROUPS: Record<string, readonly string[]>;
```

| Base | Formes |
|------|--------|
| Vivillon | every pattern the dex knows besides Meadow (the base): Archipelago, Continental, Elegant, Fancy, Garden, High Plains, Icy Snow, Jungle, Marine, Modern, Monsoon, Ocean, Pokeball, Polar, River, Sandstorm, Savanna, Sun, Tundra |
| Florges | Blue, Orange, White, Yellow |
| Furfrou | Dandy, Debutante, Diamond, Heart, Kabuki, La Reine, Matron, Pharaoh, Star |
| Alcremie | Ruby-Cream, Matcha-Cream, Mint-Cream, Lemon-Cream, Salted-Cream, Ruby-Swirl, Caramel-Swirl, Rainbow-Swirl |
| Sinistcha | Masterpiece |
| Maushold | Four |
| Polteageist | Antique |

(Written in the code as full dex names, e.g. `"Vivillon-High Plains"`.)

## `countedSpecies(species: string): string`

The species a non-Mega slot counts as. Pure, dex-backed.

1. Unknown to the dex → `species` unchanged (001: unknown species count as written).
2. Battle-only (`battleOnly` set) → `changesFrom` (R2), then continue with step 3 on it.
3. On the grouping list → its base.
4. Otherwise → the dex name.

Megas never reach this function (FR-005): `toSlots` calls it only when `megaLabel` of the
resolution is null.

## `groupedEntryId(id: string): string` (`sheets.ts`)

For a URL id of the Pokémon category: the entry id that id counts under. Ids that are not a known
species, and Mega ids, return unchanged. Otherwise `toId(countedSpecies(dexName))`.

## `Slot` (extended, `sheets.ts`)

| Field | Change |
|-------|--------|
| `entryId` | non-Mega: `toId(countedSpecies(species))`; Mega: unchanged |
| `name` | non-Mega: `countedSpecies(species)`; Mega: unchanged (base name) |
| `sprite` | non-Mega: `countedSpecies(species)` (FR-006: the base forme's sprite); Mega: unchanged |
| `writtenSpecies` (new) | the species as written after Mega resolution (`resolution.spriteSpecies`), e.g. "Vivillon-Ocean" |

## `PokemonDetail` (extended, `details.ts`)

| Field | Meaning |
|-------|---------|
| `formes` (new) | `DistRow[]`: per distinct `slot.writtenSpecies` among the entry's appearances, `{ id: toId(writtenSpecies), name: writtenSpecies, count, share, sprite: writtenSpecies }`, sorted by count then name; `[]` for a Mega entry (`mega !== null`, whose written species is its Mega forme) and when every appearance's `writtenSpecies` equals the entry's `name` |

## Invariants (unit-tested)

- A sheet writing a listed forme or a battle-only forme yields the same numbers everywhere as the
  same sheet writing the base: ranking count, share, wins, rated, teammates, carriers.
- Every forme in FR-003 stays its own entry.
- A Mega slot (including Meowstic-F-Mega, Floette-Mega) is never changed by grouping.
- `formes` shares add up to 1 when not empty; `formes` is empty for ungrouped entries, Megas and
  all-base selections, and holds a single row at 1 when every appearance wrote one other forme.
- Every listed forme exists in the dex with the listed base as `baseSpecies`; the four
  all-variant species list every non-Gmax forme the dex knows.
- `groupedEntryId`: `sinistchamasterpiece` → `sinistcha`, `palafinhero` → `palafin`,
  `vivillonocean` → `vivillon`; `charizardmegay`, `rotomwash`, `indeedeef` and an unknown id stay
  as they are.
