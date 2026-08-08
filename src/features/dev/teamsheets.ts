// Two complete Champions team sheets, in the canonical form `parseTeamsheet`
// produces. Used by the seed and the component gallery so every dev surface
// shows real sheets — megas, a mon without an item, a three-move set — rather
// than placeholder URLs that render as broken cards.

export const SEED_SHEET_A = `Delphox @ Delphoxite
Ability: Blaze
Modest Nature
- Heat Wave
- Psychic
- Substitute
- Protect

Garchomp @ Life Orb
Ability: Rough Skin
Jolly Nature
- Earthquake
- Dragon Claw
- Rock Slide
- Protect

Sneasler @ Focus Sash
Ability: Unburden
Jolly Nature
- Close Combat
- Dire Claw
- Rock Tomb
- Fake Out

Staraptor @ Staraptite
Ability: Intimidate
Jolly Nature
- Close Combat
- Dual Wingbeat
- Roost
- Protect

Kingambit @ Chople Berry
Ability: Defiant
Adamant Nature
- Kowtow Cleave
- Sucker Punch
- Iron Head
- Low Kick

Whimsicott @ Occa Berry
Ability: Prankster
Timid Nature
- Moonblast
- Charm
- Tailwind
- Light Screen
`;

export const SEED_SHEET_B = `Glimmora @ Focus Sash
Ability: Toxic Debris
Timid Nature
- Sludge Bomb
- Power Gem
- Spiky Shield
- Mortal Spin

Incineroar
Ability: Intimidate
Adamant Nature
- Fake Out
- Knock Off
- Flare Blitz
- Parting Shot

Rillaboom @ Assault Vest
Ability: Grassy Surge
Adamant Nature
- Wood Hammer
- Grassy Glide
- U-turn
- Fake Out

Amoonguss @ Sitrus Berry
Ability: Regenerator
Calm Nature
- Spore
- Rage Powder
- Pollen Puff

Urshifu @ Choice Scarf
Ability: Unseen Fist
Jolly Nature
- Surging Strikes
- Close Combat
- Aqua Jet
- U-turn

Tornadus @ Covert Cloak
Ability: Prankster
Timid Nature
- Bleakwind Storm
- Tailwind
- Rain Dance
- Taunt
`;

// Static sprite fixtures for the gallery. The real surfaces resolve these on
// the server (@pkmn has no place in a client bundle) and the gallery is a
// client component, so it gets hand-built rows instead. Bucket URLs are spelled
// out for the same reason.
const BUCKET = "https://storage.googleapis.com/justhit-sprites";

const icon = (id: string, species: string) => ({
  species,
  iconUrl: `${BUCKET}/pokemon-pixel/${id}.png`,
  pixelated: true,
});

export const GALLERY_ICONS_A = [
  icon("delphox-mega", "Delphox"),
  icon("garchomp", "Garchomp"),
  icon("sneasler", "Sneasler"),
  icon("staraptor-mega", "Staraptor"),
  icon("kingambit", "Kingambit"),
  icon("whimsicott", "Whimsicott"),
];

export const GALLERY_ICONS_B = [
  icon("glimmora", "Glimmora"),
  icon("incineroar", "Incineroar"),
  icon("rillaboom", "Rillaboom"),
  icon("amoonguss", "Amoonguss"),
  icon("urshifu", "Urshifu"),
  icon("tornadus", "Tornadus"),
];

const sprite = (id: string) => ({
  animated: `${BUCKET}/pokemon/${id}.webp`,
  still: `${BUCKET}/pokemon/${id}.png`,
  pixelated: false,
});

const itemIcon = (id: string) =>
  ({ kind: "image", url: `${BUCKET}/items/${id}.png` }) as const;

// The three card shapes worth looking at: a mega (base name kept, post-mega
// ability in brackets), a plain mon, and one with no item and three moves.
export const GALLERY_CARDS = [
  {
    name: "Delphox",
    item: "Delphoxite",
    itemIcon: itemIcon("delphoxite"),
    ability: "Blaze",
    megaAbility: "Levitate",
    nature: "Modest",
    natureEffect: { plus: "SpA", minus: "Atk" },
    moves: ["Heat Wave", "Psychic", "Substitute", "Protect"],
    sprite: sprite("delphox-mega"),
  },
  {
    name: "Garchomp",
    item: "Life Orb",
    itemIcon: itemIcon("lifeorb"),
    ability: "Rough Skin",
    megaAbility: null,
    nature: "Jolly",
    natureEffect: { plus: "Spe", minus: "SpA" },
    moves: ["Earthquake", "Dragon Claw", "Rock Slide", "Protect"],
    sprite: sprite("garchomp"),
  },
  {
    name: "Amoonguss",
    item: null,
    itemIcon: null,
    ability: "Regenerator",
    megaAbility: null,
    nature: "Calm",
    natureEffect: { plus: "SpD", minus: "Atk" },
    moves: ["Spore", "Rage Powder", "Pollen Puff"],
    sprite: sprite("amoonguss"),
  },
];
