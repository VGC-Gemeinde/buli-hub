import { Dex } from "@pkmn/dex";
import { Icons, Sprites } from "@pkmn/img";
import hostedItemIds from "./data/hosted-items.json";
import hostedSpriteIds from "./data/hosted-sprites.json";

// Sprite resolution, ported from justhit.gg (src/lib/sprites.ts). The animated
// HOME renders, the item renders and the pre-sliced box icons are far too large
// for the repo or the container image, so they live in a public bucket; the two
// id lists here are what we know is on it. Anything else falls back to the
// Showdown CDN, which is why a Champions mon the bucket lacks still renders.
//
// One bucket, three prefixes:
//   /pokemon/<id>.webp        animated HOME render
//   /pokemon/<id>.png         lossless still of the same
//   /pokemon-pixel/<id>.png   40x30 box icon, pre-sliced
//   /items/<id>.png           item render
//
// The box icons are pre-sliced rather than addressed through Showdown's
// spritesheet on purpose: Showdown reorganizes that sheet over time, which
// silently shifts every icon to the wrong Pokémon.

const BUCKET =
  process.env.NEXT_PUBLIC_SPRITE_BASE ||
  "https://storage.googleapis.com/justhit-sprites";

const HOSTED = new Set(hostedSpriteIds as string[]);
const HOSTED_ITEMS = new Set(hostedItemIds as string[]);

// The basename Showdown uses for a species, e.g. "weezing-galar".
export function spriteId(species: string): string {
  const url = Sprites.getPokemon(species).url;
  return decodeURIComponent(url.split("/").pop() ?? "").replace(
    /\.(gif|png|webp)$/i,
    "",
  );
}

export type SpriteRef = {
  // Animated render. Null when the bucket has no sprite for this species, in
  // which case `still` holds the CDN fallback and there is nothing to animate.
  animated: string | null;
  still: string;
  // Only the gen5 CDN fallback is pixel art; our HOME renders are smooth.
  pixelated: boolean;
};

// Both variants of a species' sprite. The bucket carries the animated `.webp`
// and the still `.png` under the same id, so the animation toggle is a plain
// client-side swap with no second lookup.
export function spriteFor(species: string): SpriteRef {
  const id = spriteId(species);
  if (id && HOSTED.has(id)) {
    return {
      animated: `${BUCKET}/pokemon/${id}.webp`,
      still: `${BUCKET}/pokemon/${id}.png`,
      pixelated: false,
    };
  }
  const cdn = Sprites.getPokemon(species);
  return { animated: null, still: cdn.url, pixelated: cdn.pixelated };
}

// The 40x30 box icon for compact rows (the report form's confirmation strip).
// Falls back to the full sprite, scaled down by the caller, when the bucket
// has no icon for this species.
export function iconFor(species: string): { url: string; pixelated: boolean } {
  const id = spriteId(species);
  if (id && HOSTED.has(id)) {
    return { url: `${BUCKET}/pokemon-pixel/${id}.png`, pixelated: true };
  }
  const cdn = Sprites.getPokemon(species);
  return { url: cdn.url, pixelated: cdn.pixelated };
}

export type ItemSpriteRef =
  // A standalone render from the bucket.
  | { kind: "image"; url: string }
  // A 24x24 cell of Showdown's item spritesheet, addressed by offset.
  | { kind: "sheet"; url: string; left: number; top: number };

export function itemSpriteFor(item: string | null): ItemSpriteRef | null {
  if (!item) {
    return null;
  }
  const entry = Dex.items.get(item);
  const id = entry.id || item.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (id && HOSTED_ITEMS.has(id)) {
    return { kind: "image", url: `${BUCKET}/items/${id}.png` };
  }
  // Showdown's sheet answers an unknown item with cell 0,0 — a real icon for
  // the wrong item. Showing nothing beats showing a lie, so an item the dex
  // does not know gets no icon and renders as its name alone.
  if (!entry.exists) {
    return null;
  }
  const icon = Icons.getItem(item);
  return { kind: "sheet", url: icon.url, left: icon.left, top: icon.top };
}
