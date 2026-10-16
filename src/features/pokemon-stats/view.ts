import { Dex } from "@pkmn/dex";
import {
  type ItemSpriteRef,
  iconFor,
  itemSpriteFor,
  spriteFor,
} from "@/features/teamsheets/sprites";
import { moveType } from "./move-card";

// Everything the views draw that needs the dex or the sprite tables, resolved
// on the server so neither ever reaches a client bundle. Plain labels live in
// labels.ts.

export type Icon =
  | { kind: "pokemon"; url: string; pixelated: boolean }
  | { kind: "item"; sprite: ItemSpriteRef }
  | { kind: "none" }
  | { kind: "type"; type: string }
  | { kind: "unknown" };

// A species the dex does not know (a fresh patch) has no sprite to show; the
// placeholder beats Showdown's question-mark sprite.
export function pokemonIcon(species: string): Icon {
  if (!Dex.species.get(species).exists) {
    return { kind: "unknown" };
  }
  const icon = iconFor(species);
  return { kind: "pokemon", url: icon.url, pixelated: icon.pixelated };
}

export function itemIcon(item: string | null): Icon {
  if (item === null) {
    return { kind: "none" };
  }
  const sprite = itemSpriteFor(item);
  return sprite ? { kind: "item", sprite } : { kind: "unknown" };
}

export function moveIcon(move: string): Icon {
  const type = moveType(move);
  return type ? { kind: "type", type } : { kind: "unknown" };
}

export function largeSprite(species: string): {
  url: string;
  pixelated: boolean;
} {
  const sprite = spriteFor(species);
  return { url: sprite.still, pixelated: sprite.pixelated };
}
