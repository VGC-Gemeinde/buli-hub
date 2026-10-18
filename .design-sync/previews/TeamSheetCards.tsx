import { TeamSheetCards } from "buli-hub";
import { SEED_SHEET_A, SEED_SHEET_B } from "@/features/dev/teamsheets";
import type { SheetCard } from "@/features/teamsheets/view";

/* The published paste at /pastes/<uuid>: six cards, the animation toggle and
 * the copy button. The cards are the view model sheetCards() builds on the
 * server, written out literally (it resolves Megas and sprites through the
 * dex, which is not in the bundle). Sprites and item renders come from the
 * public sprite bucket and may not load in a card. */

const BUCKET = "https://storage.googleapis.com/justhit-sprites";

const sprite = (id: string) => ({
  animated: `${BUCKET}/pokemon/${id}.webp`,
  still: `${BUCKET}/pokemon/${id}.png`,
  pixelated: false,
});
const itemIcon = (id: string) =>
  ({ kind: "image", url: `${BUCKET}/items/${id}.png` }) as const;

const card = (
  name: string,
  spriteId: string,
  item: [string, string] | null,
  ability: string,
  megaAbility: string | null,
  nature: string,
  natureEffect: [string, string] | null,
  moves: string[],
): SheetCard => ({
  name,
  item: item ? item[0] : null,
  itemIcon: item ? itemIcon(item[1]) : null,
  ability,
  megaAbility,
  nature,
  natureEffect: natureEffect
    ? { plus: natureEffect[0], minus: natureEffect[1] }
    : null,
  moves,
  sprite: sprite(spriteId),
});

// SEED_SHEET_A as sheetCards() resolves it: two Megas keep their base name and
// show the post-Mega ability in brackets.
const TEAM_A: SheetCard[] = [
  card(
    "Delphox",
    "delphox-mega",
    ["Delphoxite", "delphoxite"],
    "Blaze",
    "Levitate",
    "Modest",
    ["SpA", "Atk"],
    ["Heat Wave", "Psychic", "Substitute", "Protect"],
  ),
  card(
    "Garchomp",
    "garchomp",
    ["Life Orb", "lifeorb"],
    "Rough Skin",
    null,
    "Jolly",
    ["Spe", "SpA"],
    ["Earthquake", "Dragon Claw", "Rock Slide", "Protect"],
  ),
  card(
    "Sneasler",
    "sneasler",
    ["Focus Sash", "focussash"],
    "Unburden",
    null,
    "Jolly",
    ["Spe", "SpA"],
    ["Close Combat", "Dire Claw", "Rock Tomb", "Fake Out"],
  ),
  card(
    "Staraptor",
    "staraptor-mega",
    ["Staraptite", "staraptite"],
    "Intimidate",
    "Contrary",
    "Jolly",
    ["Spe", "SpA"],
    ["Close Combat", "Dual Wingbeat", "Roost", "Protect"],
  ),
  card(
    "Kingambit",
    "kingambit",
    ["Chople Berry", "chopleberry"],
    "Defiant",
    null,
    "Adamant",
    ["Atk", "SpA"],
    ["Kowtow Cleave", "Sucker Punch", "Iron Head", "Low Kick"],
  ),
  card(
    "Whimsicott",
    "whimsicott",
    ["Occa Berry", "occaberry"],
    "Prankster",
    null,
    "Timid",
    ["Spe", "Atk"],
    ["Moonblast", "Charm", "Tailwind", "Light Screen"],
  ),
];

// SEED_SHEET_B: an Incineroar with no item, an Amoonguss with three moves,
// the long move names (Surging Strikes, Bleakwind Storm) that must not truncate.
const TEAM_B: SheetCard[] = [
  card(
    "Glimmora",
    "glimmora",
    ["Focus Sash", "focussash"],
    "Toxic Debris",
    null,
    "Timid",
    ["Spe", "Atk"],
    ["Sludge Bomb", "Power Gem", "Spiky Shield", "Mortal Spin"],
  ),
  card(
    "Incineroar",
    "incineroar",
    null,
    "Intimidate",
    null,
    "Adamant",
    ["Atk", "SpA"],
    ["Fake Out", "Knock Off", "Flare Blitz", "Parting Shot"],
  ),
  card(
    "Rillaboom",
    "rillaboom",
    ["Assault Vest", "assaultvest"],
    "Grassy Surge",
    null,
    "Adamant",
    ["Atk", "SpA"],
    ["Wood Hammer", "Grassy Glide", "U-turn", "Fake Out"],
  ),
  card(
    "Amoonguss",
    "amoonguss",
    ["Sitrus Berry", "sitrusberry"],
    "Regenerator",
    null,
    "Calm",
    ["SpD", "Atk"],
    ["Spore", "Rage Powder", "Pollen Puff"],
  ),
  card(
    "Urshifu",
    "urshifu",
    ["Choice Scarf", "choicescarf"],
    "Unseen Fist",
    null,
    "Jolly",
    ["Spe", "SpA"],
    ["Surging Strikes", "Close Combat", "Aqua Jet", "U-turn"],
  ),
  card(
    "Tornadus",
    "tornadus",
    ["Covert Cloak", "covertcloak"],
    "Prankster",
    null,
    "Timid",
    ["Spe", "Atk"],
    ["Bleakwind Storm", "Tailwind", "Rain Dance", "Taunt"],
  ),
];

export function GanzesTeam() {
  return (
    <div className="max-w-3xl">
      <TeamSheetCards cards={TEAM_A} ots={SEED_SHEET_A} />
    </div>
  );
}

export function OhneItemUndDreiAttacken() {
  return (
    <div className="max-w-3xl">
      <TeamSheetCards cards={TEAM_B} ots={SEED_SHEET_B} />
    </div>
  );
}
