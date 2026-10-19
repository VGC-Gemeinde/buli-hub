import { RankingTable } from "buli-hub";
import type {
  RankingRow,
  SortColumn,
} from "@/features/pokemon-stats/components/ranking-table";
import type { Icon } from "@/features/pokemon-stats/view";

/* The four rankings of /statistiken (specs/001-pokemon-usage-stats). Rows are
 * the view model RankingView builds on the server, written out literally: the
 * dex helpers that resolve icons (pokemonIcon, itemIcon, moveIcon) are not in
 * the bundle. Numbers are consistent: 376 Teams, 2256 mitgebrachte Pokémon.
 * Sprites and item renders come from the public sprite bucket, type icons
 * from the app's /type-icons/; either may not load in a card. */

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
const type = (name: string): Icon => ({ kind: "type", type: name });

const DEF = {
  usePokemon:
    "Anteil der Teams, die dieses Pokémon mitgebracht haben. Gezählt werden nur gewertete Matches: Freilose, Doppelniederlagen und Drops zählen nicht.",
  useSlot:
    "Anteil aller mitgebrachten Pokémon, die es tragen. Gezählt werden nur gewertete Matches.",
  win: "Anteil der gewonnenen Matches der Teams, die es mitgebracht haben.",
  matches: "Gewertete Matches, auf denen Nutzung und Siegquote beruhen.",
  carriers:
    "Pokémon in gewerteten Matches, auf denen Nutzung und Siegquote beruhen.",
};

function columns(
  path: string,
  label: string,
  sort: { key: SortColumn["key"]; dir: "asc" | "desc" } = {
    key: "use",
    dir: "desc",
  },
) {
  const column = (
    key: SortColumn["key"],
    columnLabel: string,
    definition?: string,
  ): SortColumn => ({
    key,
    label: columnLabel,
    href: `${path}?sort=${key}-${key === "name" ? "asc" : "desc"}`,
    active: sort.key === key ? sort.dir : null,
    definition,
  });
  const pokemon = path.endsWith("/pokemon");
  return {
    name: column("name", label),
    use: column("use", "Nutzung", pokemon ? DEF.usePokemon : DEF.useSlot),
    win: column("win", "Siegquote", DEF.win),
    matches: pokemon
      ? column("matches", "Matches", DEF.matches)
      : column("matches", "Pokémon", DEF.carriers),
  };
}

const row = (
  path: string,
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
  href: `${path}/${id}`,
  rank,
  name,
  mega,
  icon,
  share,
  bar,
  winRate,
  matches,
});

const P = "/statistiken/pokemon";
const POKEMON: RankingRow[] = [
  row(
    P,
    "incineroar",
    1,
    "Incineroar",
    box("incineroar"),
    "51,9 %",
    100,
    "52,3 %",
    "195",
  ),
  row(
    P,
    "sinistcha",
    2,
    "Sinistcha",
    box("sinistcha"),
    "37,8 %",
    72.8,
    "49,3 %",
    "142",
  ),
  row(
    P,
    "charizardmegay",
    3,
    "Charizard",
    box("charizard-megay"),
    "31,6 %",
    61,
    "53,8 %",
    "119",
    "Mega Y",
  ),
  row(
    P,
    "kingambit",
    4,
    "Kingambit",
    box("kingambit"),
    "27,7 %",
    53.3,
    "55,8 %",
    "104",
  ),
  row(
    P,
    "whimsicott",
    5,
    "Whimsicott",
    box("whimsicott"),
    "23,4 %",
    45.1,
    "47,7 %",
    "88",
  ),
  row(
    P,
    "garchompmegaz",
    6,
    "Garchomp",
    box("garchomp-megaz"),
    "16,2 %",
    31.3,
    "59,0 %",
    "61",
    "Mega Z",
  ),
  row(
    P,
    "basculegion",
    7,
    "Basculegion",
    box("basculegion"),
    "12,5 %",
    24.1,
    "44,7 %",
    "47",
  ),
  row(
    P,
    "floettemega",
    8,
    "Floette",
    box("floette-mega"),
    "10,1 %",
    19.5,
    "60,5 %",
    "38",
    "Mega",
  ),
];

const I = "/statistiken/items";
const ITEMS: RankingRow[] = [
  row(
    I,
    "sitrusberry",
    1,
    "Sitrus Berry",
    item("sitrusberry"),
    "12,8 %",
    100,
    "51,2 %",
    "289",
  ),
  row(
    I,
    "focussash",
    2,
    "Focus Sash",
    item("focussash"),
    "10,7 %",
    83.4,
    "50,6 %",
    "241",
  ),
  row(
    I,
    "choicescarf",
    3,
    "Choice Scarf",
    item("choicescarf"),
    "8,8 %",
    68.5,
    "48,0 %",
    "198",
  ),
  row(
    I,
    "safetygoggles",
    4,
    "Safety Goggles",
    item("safetygoggles"),
    "7,8 %",
    60.9,
    "52,8 %",
    "176",
  ),
  row(
    I,
    "assaultvest",
    5,
    "Assault Vest",
    item("assaultvest"),
    "6,6 %",
    51.9,
    "54,0 %",
    "150",
  ),
  row(
    I,
    "charizarditex",
    31,
    "Charizardite X",
    item("charizarditex"),
    "<0,1 %",
    0.3,
    "100,0 %",
    "1",
  ),
  row(
    I,
    "none",
    32,
    "Kein Item",
    { kind: "none" },
    "<0,1 %",
    0.3,
    "0,0 %",
    "1",
  ),
];

const F = "/statistiken/faehigkeiten";
const ABILITIES: RankingRow[] = [
  row(F, "intimidate", 1, "Intimidate", null, "10,7 %", 100, "52,1 %", "241"),
  row(F, "hospitality", 2, "Hospitality", null, "6,3 %", 58.9, "49,3 %", "142"),
  row(
    F,
    "supremeoverlord",
    3,
    "Supreme Overlord",
    null,
    "4,6 %",
    43.2,
    "55,8 %",
    "104",
  ),
  row(F, "prankster", 4, "Prankster", null, "4,1 %", 38.6, "48,3 %", "93"),
  row(F, "drought", 5, "Drought", null, "3,9 %", 36.5, "53,4 %", "88"),
  row(F, "unburden", 6, "Unburden", null, "2,9 %", 27.4, "50,0 %", "66"),
];

const A = "/statistiken/attacken";
const MOVES: RankingRow[] = [
  row(
    A,
    "protect",
    1,
    "Protect",
    type("Normal"),
    "14,9 %",
    100,
    "50,4 %",
    "1.347",
  ),
  row(
    A,
    "fakeout",
    2,
    "Fake Out",
    type("Normal"),
    "12,1 %",
    81.2,
    "51,2 %",
    "273",
  ),
  row(
    A,
    "heatwave",
    3,
    "Heat Wave",
    type("Fire"),
    "8,3 %",
    55.7,
    "51,3 %",
    "187",
  ),
  row(
    A,
    "kowtowcleave",
    4,
    "Kowtow Cleave",
    type("Dark"),
    "4,6 %",
    30.9,
    "55,8 %",
    "104",
  ),
  row(
    A,
    "tailwind",
    5,
    "Tailwind",
    type("Flying"),
    "4,4 %",
    29.5,
    "47,2 %",
    "99",
  ),
  row(A, "spore", 6, "Spore", type("Grass"), "3,1 %", 20.8, "53,6 %", "69"),
  row(
    A,
    "wavecrash",
    7,
    "Wave Crash",
    type("Water"),
    "2,1 %",
    14.1,
    "44,7 %",
    "47",
  ),
];

export function AllePokemon() {
  return (
    <RankingTable
      rows={POKEMON}
      columns={columns(P, "Pokémon")}
      nameLabel="Pokémon"
      withIcon
    />
  );
}

export function Attacken() {
  return (
    <RankingTable
      rows={MOVES}
      columns={columns(A, "Attacken")}
      nameLabel="Attacken"
      withIcon
    />
  );
}

/* Abilities have no icon: rank and name are pinned instead. */
export function Faehigkeiten() {
  return (
    <RankingTable
      rows={ABILITIES}
      columns={columns(F, "Fähigkeiten")}
      nameLabel="Fähigkeiten"
      withIcon={false}
    />
  );
}

/* Includes a foreign Mega stone and "Kein Item", both below one decimal. */
export function Items() {
  return (
    <RankingTable
      rows={ITEMS}
      columns={columns(I, "Items")}
      nameLabel="Items"
      withIcon
    />
  );
}

/* Sorted by Siegquote: the usage ranks stay, the order changes. */
export function NachSiegquote() {
  const sorted = [...POKEMON].sort(
    (a, b) =>
      Number.parseFloat(b.winRate.replace(",", ".")) -
      Number.parseFloat(a.winRate.replace(",", ".")),
  );
  return (
    <RankingTable
      rows={sorted}
      columns={columns(P, "Pokémon", { key: "win", dir: "desc" })}
      nameLabel="Pokémon"
      withIcon
    />
  );
}
