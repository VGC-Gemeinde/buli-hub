import { Dex } from "@pkmn/dex";
import { resolveMega } from "@/features/teamsheets/mega";
import { parseTeamsheet } from "@/features/teamsheets/parse";

// One stored team sheet as the stats count it (specs/001-pokemon-usage-stats,
// research R5): six slots, each resolved the way the team sheet pages resolve
// it, so a sheet and the stats never disagree on what a Pokémon is.
//
// Unlike on the sheet pages, the dex shapes numbers here: the Mega a stone
// makes is an entry of its own (FR-004) and counts with its Mega ability
// (FR-027). The override maps in teamsheets/mega.ts stay the remedy for a dex
// that is behind a Champions patch.

export type MegaLabel = "Mega" | "Mega X" | "Mega Y" | "Mega Z";

export type Slot = {
  // The Pokémon entry: the Mega forme when it is one, the species as written
  // otherwise.
  entryId: string;
  // As the team sheet pages name it: always the base name.
  name: string;
  mega: MegaLabel | null;
  // The species to draw.
  sprite: string;
  item: string | null;
  // The item is this slot's own Mega stone (FR-028).
  ownStone: boolean;
  sheetAbility: string;
  // The ability it fights with: the Mega ability for a Mega (FR-027).
  ability: string;
  nature: string;
  moves: string[];
};

export const toId = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

const MEGA_FORME = /(^|-)Mega(-|$)/i;

// "Mega", or the letter a species with two or more Megas puts after it.
// A Mega that keeps a forme of its own ("F-Mega", "Droopy-Mega") is just
// "Mega": the forme is already in the base name.
export function megaLabel(species: string): MegaLabel | null {
  const sp = Dex.species.get(species);
  const forme = sp.exists ? (sp.forme ?? "") : "";
  if (!MEGA_FORME.test(forme)) {
    return null;
  }
  const letter = /Mega-([XYZ])$/i.exec(forme)?.[1]?.toUpperCase();
  return letter ? (`Mega ${letter}` as MegaLabel) : "Mega";
}

// Spellings of the same thing count as one: the dex's name when it knows the
// thing, the text as written when it does not (a fresh patch still counts).
function itemName(item: string): string {
  const known = Dex.items.get(item);
  return known.exists ? known.name : item;
}

function abilityName(ability: string): string {
  const known = Dex.abilities.get(ability);
  return known.exists ? known.name : ability;
}

function moveName(move: string): string {
  const known = Dex.moves.get(move);
  return known.exists ? known.name : move;
}

// Null for a text that is not a valid sheet. Stored sheets were validated on
// submit, so this is a safety net, not a path.
export function toSlots(ots: string): Slot[] | null {
  const parsed = parseTeamsheet(ots);
  if (!parsed.ok) {
    return null;
  }
  return parsed.mons.map((mon) => {
    const item = mon.item ? itemName(mon.item) : null;
    const resolution = resolveMega(mon.species, item);
    const mega = megaLabel(resolution.spriteSpecies);
    const sheetAbility = abilityName(mon.ability);
    return {
      entryId: toId(resolution.spriteSpecies),
      name: resolution.displayName,
      mega,
      sprite: resolution.spriteSpecies,
      item,
      // The stone did the evolving: the paste names the base (canonical form)
      // and the resolution names a Mega.
      ownStone:
        item !== null &&
        mega !== null &&
        resolution.spriteSpecies !== mon.species,
      sheetAbility,
      ability: mega
        ? abilityName(resolution.megaAbility ?? sheetAbility)
        : sheetAbility,
      nature: mon.nature,
      moves: mon.moves.map(moveName),
    };
  });
}
