import { Dex } from "@pkmn/dex";

// Formes that play the same count as one Pokémon entry, under their base
// (specs/002-pokemon-forme-groups, FR-002). Maintained by hand on purpose:
// whether two formes play the same is a judgment call (Gourgeist's sizes
// differ slightly, Tatsugiri's only through Commander), so each forme is a
// reviewed line here, and a forme the list does not name stays an entry of its
// own until it is listed. Names as the dex writes them.
export const FORME_GROUPS: Record<string, readonly string[]> = {
  Vivillon: [
    "Vivillon-Archipelago",
    "Vivillon-Continental",
    "Vivillon-Elegant",
    "Vivillon-Fancy",
    "Vivillon-Garden",
    "Vivillon-High Plains",
    "Vivillon-Icy Snow",
    "Vivillon-Jungle",
    "Vivillon-Marine",
    "Vivillon-Modern",
    "Vivillon-Monsoon",
    "Vivillon-Ocean",
    "Vivillon-Pokeball",
    "Vivillon-Polar",
    "Vivillon-River",
    "Vivillon-Sandstorm",
    "Vivillon-Savanna",
    "Vivillon-Sun",
    "Vivillon-Tundra",
  ],
  Florges: [
    "Florges-Blue",
    "Florges-Orange",
    "Florges-White",
    "Florges-Yellow",
  ],
  Furfrou: [
    "Furfrou-Dandy",
    "Furfrou-Debutante",
    "Furfrou-Diamond",
    "Furfrou-Heart",
    "Furfrou-Kabuki",
    "Furfrou-La Reine",
    "Furfrou-Matron",
    "Furfrou-Pharaoh",
    "Furfrou-Star",
  ],
  Alcremie: [
    "Alcremie-Caramel-Swirl",
    "Alcremie-Lemon-Cream",
    "Alcremie-Matcha-Cream",
    "Alcremie-Mint-Cream",
    "Alcremie-Rainbow-Swirl",
    "Alcremie-Ruby-Cream",
    "Alcremie-Ruby-Swirl",
    "Alcremie-Salted-Cream",
  ],
  Sinistcha: ["Sinistcha-Masterpiece"],
  Maushold: ["Maushold-Four"],
  Polteageist: ["Polteageist-Antique"],
};

const BASE_OF = new Map(
  Object.entries(FORME_GROUPS).flatMap(([base, formes]) =>
    formes.map((forme) => [forme, base] as const),
  ),
);

// The species a slot that is not a Mega counts as. A forme that only exists in
// battle (Palafin-Hero) is the Pokémon it changes from, as the dex says
// (FR-004); `changesFrom` rather than `baseSpecies`, so Darmanitan-Galar-Zen
// keeps its regional forme. Megas never get here (FR-005): the dex marks them
// battle-only too, and not every one of them as `isMega` (Meowstic-F-Mega).
// Unknown species count as written, like everywhere in the stats.
export function countedSpecies(species: string): string {
  const sp = Dex.species.get(species);
  if (!sp.exists) {
    return species;
  }
  const name = sp.battleOnly ? (sp.changesFrom ?? sp.baseSpecies) : sp.name;
  return BASE_OF.get(name) ?? name;
}
