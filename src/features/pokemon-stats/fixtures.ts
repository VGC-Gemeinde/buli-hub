// Test helpers: Showdown-export text for a team, and counted sheets built
// from it. Only imported by tests.

import type { CountedSheet } from "./filter";
import { toSlots } from "./sheets";

export type MonSpec = {
  species: string;
  item?: string;
  ability?: string;
  nature?: string;
  moves?: string[];
};

const FILLER: MonSpec[] = [
  {
    species: "Amoonguss",
    item: "Rocky Helmet",
    ability: "Regenerator",
    moves: ["Spore", "Rage Powder", "Protect"],
  },
  {
    species: "Whimsicott",
    item: "Focus Sash",
    ability: "Prankster",
    moves: ["Tailwind", "Moonblast", "Protect"],
  },
  {
    species: "Basculegion",
    item: "Choice Scarf",
    ability: "Swift Swim",
    moves: ["Wave Crash", "Last Respects"],
  },
  {
    species: "Dragonite",
    item: "Choice Band",
    ability: "Multiscale",
    moves: ["Extreme Speed", "Protect"],
  },
  {
    species: "Tyranitar",
    item: "Assault Vest",
    ability: "Sand Stream",
    moves: ["Rock Slide", "Knock Off"],
  },
  {
    species: "Rotom-Wash",
    item: "Sitrus Berry",
    ability: "Levitate",
    moves: ["Hydro Pump", "Will-O-Wisp", "Protect"],
  },
];

export function exportMon(mon: MonSpec): string {
  return [
    mon.item ? `${mon.species} @ ${mon.item}` : mon.species,
    `Ability: ${mon.ability ?? "Pressure"}`,
    `${mon.nature ?? "Adamant"} Nature`,
    ...(mon.moves ?? ["Protect"]).map((move) => `- ${move}`),
  ].join("\n");
}

// Six mons: the given ones first, filled up with distinct fillers that do not
// repeat a given species.
export function team(...mons: MonSpec[]): string {
  const used = new Set(mons.map((mon) => mon.species));
  const fill = FILLER.filter((mon) => !used.has(mon.species));
  return [...mons, ...fill].slice(0, 6).map(exportMon).join("\n\n");
}

let counter = 0;

export function counted(
  ots: string,
  over: Partial<Omit<CountedSheet, "mons">> = {},
): CountedSheet {
  const mons = toSlots(ots);
  if (!mons) {
    throw new Error(`fixture sheet does not parse:\n${ots}`);
  }
  counter++;
  return {
    matchId: `m${counter}`,
    playerId: `p${counter}`,
    phase: "regular",
    round: 1,
    tier: 1,
    result: null,
    ...over,
    mons,
  };
}
