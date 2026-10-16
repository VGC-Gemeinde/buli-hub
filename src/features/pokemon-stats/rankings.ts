import type { CountedSheet, RankingOptions } from "./filter";
import type { MegaLabel, Slot } from "./sheets";
import { toId } from "./sheets";

// The four rankings (specs/001-pokemon-usage-stats, FR-003, FR-005,
// FR-016 to FR-028). Pokémon are counted per sheet, everything else per slot;
// every share's basis is the filtered sheets, whatever the ranking options
// hide.

export type RankingCategory = "pokemon" | "items" | "abilities" | "moves";

export type RankingEntry = {
  id: string;
  name: string;
  mega: MegaLabel | null;
  // The species to draw (Pokémon) or the item to show (items).
  sprite: string | null;
  item: string | null;
  count: number;
  share: number;
  rank: number;
  wins: number;
  rated: number;
};

export type Ranking = {
  sheets: number;
  slots: number;
  entries: RankingEntry[];
};

export const NO_ITEM_ID = "none";
export const NO_ITEM_NAME = "Kein Item";
export const TOP = 30;

type Appearance = {
  id: string;
  name: string;
  mega: MegaLabel | null;
  sprite: string | null;
  item: string | null;
};

function pokemonOf(slot: Slot): Appearance {
  return {
    id: slot.entryId,
    name: slot.name,
    mega: slot.mega,
    sprite: slot.sprite,
    item: null,
  };
}

export function itemOf(slot: Slot): Appearance {
  return slot.item
    ? {
        id: toId(slot.item),
        name: slot.item,
        mega: null,
        sprite: null,
        item: slot.item,
      }
    : {
        id: NO_ITEM_ID,
        name: NO_ITEM_NAME,
        mega: null,
        sprite: null,
        item: null,
      };
}

const named = (name: string): Appearance => ({
  id: toId(name),
  name,
  mega: null,
  sprite: null,
  item: null,
});

// What one sheet contributes to a category: each Pokémon once per sheet,
// each item and ability once per slot, each move once per slot carrying it.
function appearances(
  sheet: CountedSheet,
  category: RankingCategory,
  hideOwnStones: boolean,
): Appearance[] {
  switch (category) {
    case "pokemon": {
      const seen = new Map<string, Appearance>();
      for (const slot of sheet.mons) {
        seen.set(slot.entryId, pokemonOf(slot));
      }
      return [...seen.values()];
    }
    case "items":
      // A stone on its own Mega repeats the Pokémon ranking and holds no
      // decision; a stone on a foreign Pokémon stays (FR-028).
      return sheet.mons
        .filter((slot) => !(hideOwnStones && slot.ownStone))
        .map(itemOf);
    case "abilities":
      return sheet.mons.map((slot) => named(slot.ability));
    case "moves":
      return sheet.mons.flatMap((slot) => [...new Set(slot.moves)].map(named));
  }
}

const byName = (
  a: { name: string; mega: string | null },
  b: { name: string; mega: string | null },
) =>
  `${a.name} ${a.mega ?? ""}`.localeCompare(`${b.name} ${b.mega ?? ""}`, "en");

// Usage ranks over the counts given: equal counts share a rank (FR-009).
function withRanks(entries: Omit<RankingEntry, "rank">[]): RankingEntry[] {
  const sorted = [...entries].sort((a, b) => b.count - a.count || byName(a, b));
  let rank = 0;
  let last: number | null = null;
  return sorted.map((entry, index) => {
    if (entry.count !== last) {
      rank = index + 1;
      last = entry.count;
    }
    return { ...entry, rank };
  });
}

export function ranking(
  sheets: readonly CountedSheet[],
  category: RankingCategory,
  options: RankingOptions,
): Ranking {
  const slots = sheets.length * 6;
  const basis = category === "pokemon" ? sheets.length : slots;
  const tally = new Map<string, Omit<RankingEntry, "rank" | "share">>();
  for (const sheet of sheets) {
    for (const appearance of appearances(
      sheet,
      category,
      options.hideOwnStones,
    )) {
      const entry = tally.get(appearance.id) ?? {
        ...appearance,
        count: 0,
        wins: 0,
        rated: 0,
      };
      entry.count++;
      if (sheet.result !== null) {
        entry.rated++;
        if (sheet.result === "won") {
          entry.wins++;
        }
      }
      tally.set(appearance.id, entry);
    }
  }
  const ranked = withRanks(
    [...tally.values()].map((entry) => ({
      ...entry,
      share: basis === 0 ? 0 : entry.count / basis,
    })),
  );
  // The options hide entries; the ranks and the basis stay.
  const shown = ranked.filter(
    (entry) =>
      entry.share * 100 >= options.minShare &&
      (category !== "pokemon" ||
        options.mega === "all" ||
        (options.mega === "mega") === (entry.mega !== null)) &&
      (category !== "moves" || !options.hideProtect || entry.id !== "protect"),
  );
  return {
    sheets: sheets.length,
    slots,
    entries: sortEntries(shown, options.sort),
  };
}

const winRate = (entry: RankingEntry) =>
  entry.rated === 0 ? null : entry.wins / entry.rated;

// FR-020. Equal values fall back to the match count, then the name; entries
// without a rated match come last in both directions when sorting by win rate.
export function sortEntries(
  entries: readonly RankingEntry[],
  sort: RankingOptions["sort"],
): RankingEntry[] {
  const dir = sort.dir === "desc" ? -1 : 1;
  return [...entries].sort((a, b) => {
    switch (sort.key) {
      case "name":
        return dir * byName(a, b);
      case "use":
        return dir * (a.count - b.count) || byName(a, b);
      case "matches":
        return dir * (a.rated - b.rated) || byName(a, b);
      case "win": {
        const wa = winRate(a);
        const wb = winRate(b);
        if (wa === null || wb === null) {
          return wa === wb ? byName(a, b) : wa === null ? 1 : -1;
        }
        return dir * (wa - wb) || dir * (a.rated - b.rated) || byName(a, b);
      }
      default:
        return 0;
    }
  });
}
