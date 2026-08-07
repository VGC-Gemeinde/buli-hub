import { natureEffect, resolveMega } from "./mega";
import type { TeamsheetMon } from "./parse";
import {
  type ItemSpriteRef,
  iconFor,
  itemSpriteFor,
  type SpriteRef,
  spriteFor,
} from "./sprites";

// Everything one team card needs, resolved on the server. The paste page is a
// Server Component and the card component is dumb: @pkmn never reaches the
// browser, and the client only owns the animation toggle.

export type SheetCard = {
  // The base name, even for a mega — "Delphox", never "Delphox-Mega".
  name: string;
  item: string | null;
  itemIcon: ItemSpriteRef | null;
  ability: string;
  // Only set when mega-evolving actually changes the ability.
  megaAbility: string | null;
  nature: string;
  natureEffect: { plus: string; minus: string } | null;
  moves: string[];
  sprite: SpriteRef;
};

export function sheetCards(mons: TeamsheetMon[]): SheetCard[] {
  return mons.map((mon) => {
    const { spriteSpecies, displayName, megaAbility } = resolveMega(
      mon.species,
      mon.item,
    );
    return {
      name: displayName,
      item: mon.item,
      itemIcon: itemSpriteFor(mon.item),
      ability: mon.ability,
      // Showing "Blaze (Blaze)" would be noise.
      megaAbility:
        megaAbility && megaAbility !== mon.ability ? megaAbility : null,
      nature: mon.nature,
      natureEffect: natureEffect(mon.nature),
      moves: mon.moves,
      sprite: spriteFor(spriteSpecies),
    };
  });
}

// The compact confirmation strip shown once a sheet is accepted: six box icons.
// Resolved on the server for the same reason the cards are — @pkmn has no
// business in a client bundle.
export type MonIcon = {
  species: string;
  iconUrl: string;
  pixelated: boolean;
};

export function monIcons(mons: TeamsheetMon[]): MonIcon[] {
  return mons.map((mon) => {
    // The icon follows the mega, so a Delphox holding Delphoxite shows the
    // mega exactly as the paste page will.
    const { spriteSpecies, displayName } = resolveMega(mon.species, mon.item);
    const icon = iconFor(spriteSpecies);
    return {
      species: displayName,
      iconUrl: icon.url,
      pixelated: icon.pixelated,
    };
  });
}
