// Static states of the Pokémon stats for the /dev/ui gallery
// (specs/001-pokemon-usage-stats). Plain data: the gallery is a client
// component, so nothing here may pull in the dex.

import type { DistItem } from "@/features/pokemon-stats/components/detail-parts";
import type {
  RankingRow,
  SortColumn,
} from "@/features/pokemon-stats/components/ranking-table";
import type { MoveCard } from "@/features/pokemon-stats/move-card";
import type { Icon } from "@/features/pokemon-stats/view";

const BUCKET = "https://storage.googleapis.com/justhit-sprites";
const box = (id: string): Icon => ({
  kind: "pokemon",
  url: `${BUCKET}/pokemon-pixel/${id}.png`,
  pixelated: true,
});
const item = (id: string): Icon => ({
  kind: "item",
  sprite: { kind: "image", url: `${BUCKET}/items/${id}.png` },
});

const column = (
  key: SortColumn["key"],
  label: string,
  active: SortColumn["active"] = null,
  definition?: string,
): SortColumn => ({
  key,
  label,
  href: "#",
  active,
  definition,
});

export const STATS_COLUMNS = {
  name: column("name", "Pokémon"),
  use: column(
    "use",
    "Nutzung",
    "desc",
    "Anteil der Teams, die dieses Pokémon mitgebracht haben. Gezählt werden nur gewertete Matches: Freilose, Doppelniederlagen und Drops zählen nicht.",
  ),
  win: column(
    "win",
    "Siegquote",
    null,
    "Anteil der gewonnenen Matches der Teams, die es mitgebracht haben.",
  ),
  matches: column(
    "matches",
    "Matches",
    null,
    "Gewertete Matches, auf denen Nutzung und Siegquote beruhen.",
  ),
};

const row = (
  id: string,
  rank: number,
  name: string,
  icon: Icon | null,
  share: string,
  bar: number,
  winRate: string,
  matches: string,
  mega: string | null = null,
): RankingRow => ({
  id,
  href: "#",
  rank,
  name,
  mega,
  icon,
  share,
  bar,
  winRate,
  matches,
});

export const STATS_POKEMON_ROWS: RankingRow[] = [
  row(
    "incineroar",
    1,
    "Incineroar",
    box("incineroar"),
    "51,9 %",
    100,
    "52,3 %",
    "195",
  ),
  row(
    "charizardmegay",
    2,
    "Charizard",
    box("charizard-megay"),
    "32,0 %",
    62,
    "53,8 %",
    "119",
    "Mega Y",
  ),
  row(
    "garchompmegaz",
    3,
    "Garchomp",
    box("garchomp-megaz"),
    "10,0 %",
    19,
    "58,3 %",
    "38",
    "Mega Z",
  ),
  row("fakemon", 4, "Fakemon", { kind: "unknown" }, "0,2 %", 1, "—", "0"),
];

export const STATS_ITEM_ROWS: RankingRow[] = [
  row(
    "sitrusberry",
    1,
    "Sitrus Berry",
    item("sitrusberry"),
    "12,8 %",
    100,
    "51,2 %",
    "301",
  ),
  row(
    "charizarditex",
    22,
    "Charizardite X",
    item("charizarditex"),
    "<0,1 %",
    1,
    "100,0 %",
    "1",
  ),
  row("none", 23, "Kein Item", { kind: "none" }, "<0,1 %", 1, "0,0 %", "1"),
];

export const STATS_MOVE_ROWS: RankingRow[] = [
  row(
    "fakeout",
    2,
    "Fake Out",
    { kind: "type", type: "Normal" },
    "12,1 %",
    100,
    "51,2 %",
    "280",
  ),
  row(
    "heatwave",
    4,
    "Heat Wave",
    { kind: "type", type: "Fire" },
    "8,3 %",
    69,
    "51,3 %",
    "190",
  ),
  row(
    "unknownmove",
    40,
    "Unknown Move",
    { kind: "unknown" },
    "<0,1 %",
    1,
    "—",
    "0",
  ),
];

export const STATS_MOVE_CARDS: MoveCard[] = [
  {
    name: "Fake Out",
    type: "Normal",
    basePower: 40,
    accuracy: 100,
    shortDesc: "Hits first. First turn out only. 100% flinch chance.",
  },
  {
    name: "Heat Wave",
    type: "Fire",
    basePower: 95,
    accuracy: 90,
    shortDesc: "10% chance to burn the foe(s).",
  },
  {
    name: "Kowtow Cleave",
    type: "Dark",
    basePower: 85,
    accuracy: true,
    shortDesc: "This move does not check accuracy.",
  },
  {
    name: "Spore",
    type: "Grass",
    basePower: 0,
    accuracy: 100,
    shortDesc: "Causes the target to fall asleep.",
  },
];

export const STATS_TYPES = [
  "Normal",
  "Fire",
  "Water",
  "Grass",
  "Electric",
  "Ice",
  "Fighting",
  "Poison",
  "Ground",
  "Flying",
  "Psychic",
  "Bug",
  "Rock",
  "Ghost",
  "Dragon",
  "Dark",
  "Steel",
  "Fairy",
];

// The "Formen" panel of a grouped entry (specs/002-pokemon-forme-groups):
// formes as written, box icons, no links.
export const STATS_FORME_ROWS: DistItem[] = [
  ["Vivillon", "vivillon", "60,0 %", 100],
  ["Vivillon-Ocean", "vivillon-ocean", "20,0 %", 33.3],
  ["Vivillon-Elegant", "vivillon-elegant", "10,0 %", 16.7],
  ["Vivillon-High Plains", "vivillon-highplains", "10,0 %", 16.7],
].map(([name, id, share, bar]) => ({
  key: id as string,
  name: name as string,
  icon: box(id as string),
  share: share as string,
  bar: bar as number,
}));
