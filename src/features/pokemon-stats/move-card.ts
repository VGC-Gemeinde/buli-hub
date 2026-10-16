import { Dex, type ID, type ModData } from "@pkmn/dex";
import * as champions from "@pkmn/mods/champions";

// A move's game data for the move card (specs/001-pokemon-usage-stats,
// FR-023, research R6): Pokémon Champions values, where Champions changed
// base power or accuracy, from Showdown's Champions mod as @pkmn/mods ships
// it. Display only: nothing here changes a count. Server only.

const ChampionsDex = Dex.mod(
  "champions" as ID,
  champions as unknown as ModData,
);

// Where Showdown has moved on since the pinned @pkmn/mods release. Compared
// against smogon/pokemon-showdown data/mods/champions/moves.ts on
// 2026-10-16; drop an entry once a release carries it.
const MOVE_OVERRIDES: Record<
  string,
  { basePower?: number; accuracy?: number | true }
> = {
  meteorassault: { basePower: 170 },
  slash: { basePower: 80 },
};

export type MoveCard = {
  name: string;
  type: string;
  // 0 for a status move.
  basePower: number;
  // `true` for a move that does not check accuracy.
  accuracy: number | true;
  shortDesc: string;
};

const toId = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

export function moveCard(name: string): MoveCard | null {
  const move = ChampionsDex.moves.get(name);
  if (!move.exists) {
    return null;
  }
  const override = MOVE_OVERRIDES[toId(move.name)] ?? {};
  return {
    name: move.name,
    type: move.type,
    basePower: override.basePower ?? move.basePower,
    accuracy: override.accuracy ?? move.accuracy,
    shortDesc: move.shortDesc || move.desc,
  };
}

// The type a move is listed with (the icon before it), or null when the dex
// does not know the move.
export function moveType(name: string): string | null {
  return moveCard(name)?.type ?? null;
}
