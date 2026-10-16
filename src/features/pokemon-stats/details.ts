import type { CountedSheet } from "./filter";
import { itemOf, NO_ITEM_ID, type RankingCategory } from "./rankings";
import type { MegaLabel, Slot } from "./sheets";
import { toId } from "./sheets";

// The details behind a ranking entry (specs/001-pokemon-usage-stats, Stories
// 4 and 5): distributions over the entry's own appearances.

export type DistRow = {
  id: string;
  name: string;
  count: number;
  // Of the entry's appearances (or carriers).
  share: number;
  // Set for rows that are themselves Pokémon entries (teammates, carriers).
  mega?: MegaLabel | null;
  sprite?: string | null;
  item?: string | null;
};

type Usage = { count: number; share: number; wins: number; rated: number };

export type PokemonDetail = Usage & {
  id: string;
  name: string;
  mega: MegaLabel | null;
  sprite: string;
  sheets: number;
  // A Mega whose every appearance holds its own stone: the stone, shown
  // fixed instead of an item distribution.
  fixedItem: string | null;
  items: DistRow[];
  megaAbility: string | null;
  // The abilities written in the sheets.
  abilities: DistRow[];
  natures: DistRow[];
  moves: DistRow[];
  teammates: DistRow[];
  // Base and Mega entries of the same species ("Auch gespielt als").
  family: { id: string; name: string; mega: MegaLabel | null; share: number }[];
};

export type EntryDetail = Usage & {
  id: string;
  name: string;
  item: string | null;
  sheets: number;
  slots: number;
  // Sheets with at least one carrier, of all sheets.
  teamShare: number;
  carriers: DistRow[];
};

function tally(
  rows: { id: string; name: string; extra?: Partial<DistRow> }[],
  total: number,
): DistRow[] {
  const map = new Map<string, DistRow>();
  for (const row of rows) {
    const entry = map.get(row.id) ?? {
      id: row.id,
      name: row.name,
      count: 0,
      share: 0,
      ...row.extra,
    };
    entry.count++;
    map.set(row.id, entry);
  }
  return [...map.values()]
    .map((row) => ({ ...row, share: total === 0 ? 0 : row.count / total }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "en"));
}

function usage(appearances: { sheet: CountedSheet }[], basis: number): Usage {
  let wins = 0;
  let rated = 0;
  for (const { sheet } of appearances) {
    if (sheet.result !== null) {
      rated++;
      if (sheet.result === "won") {
        wins++;
      }
    }
  }
  return {
    count: appearances.length,
    share: basis === 0 ? 0 : appearances.length / basis,
    wins,
    rated,
  };
}

const asEntry = (slot: Slot) => ({
  id: slot.entryId,
  name: slot.name,
  extra: { mega: slot.mega, sprite: slot.sprite },
});

export function pokemonDetail(
  sheets: readonly CountedSheet[],
  entryId: string,
): PokemonDetail | null {
  const found: { sheet: CountedSheet; slot: Slot }[] = [];
  for (const sheet of sheets) {
    const slot = sheet.mons.find((mon) => mon.entryId === entryId);
    if (slot) {
      found.push({ sheet, slot });
    }
  }
  if (found.length === 0) {
    return null;
  }
  const n = found.length;
  const first = found[0].slot;
  const stones = new Set(
    found.map(({ slot }) => (slot.ownStone ? slot.item : null)),
  );
  const fixedItem =
    stones.size === 1 && !stones.has(null) ? [...stones][0] : null;

  const familyIds = new Map<
    string,
    { id: string; name: string; mega: MegaLabel | null; count: number }
  >();
  for (const sheet of sheets) {
    const seen = new Set<string>();
    for (const slot of sheet.mons) {
      if (
        slot.name !== first.name ||
        slot.entryId === entryId ||
        seen.has(slot.entryId)
      ) {
        continue;
      }
      seen.add(slot.entryId);
      const entry = familyIds.get(slot.entryId) ?? {
        id: slot.entryId,
        name: slot.name,
        mega: slot.mega,
        count: 0,
      };
      entry.count++;
      familyIds.set(slot.entryId, entry);
    }
  }

  return {
    ...usage(found, sheets.length),
    id: entryId,
    name: first.name,
    mega: first.mega,
    sprite: first.sprite,
    sheets: sheets.length,
    fixedItem,
    items: fixedItem
      ? []
      : tally(
          found.map(({ slot }) => itemOf(slot)),
          n,
        ),
    megaAbility: first.mega ? first.ability : null,
    abilities: tally(
      found.map(({ slot }) => ({
        id: toId(slot.sheetAbility),
        name: slot.sheetAbility,
      })),
      n,
    ),
    natures: tally(
      found.map(({ slot }) => ({ id: toId(slot.nature), name: slot.nature })),
      n,
    ),
    moves: tally(
      found.flatMap(({ slot }) =>
        [...new Set(slot.moves)].map((move) => ({
          id: toId(move),
          name: move,
        })),
      ),
      n,
    ),
    teammates: tally(
      found.flatMap(({ sheet, slot }) => {
        const seen = new Set<string>([slot.entryId]);
        return sheet.mons
          .filter((mon) => !seen.has(mon.entryId) && seen.add(mon.entryId))
          .map(asEntry);
      }),
      n,
    ),
    family: [...familyIds.values()]
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        mega: entry.mega,
        share: entry.count / sheets.length,
      }))
      .sort(
        (a, b) =>
          b.share - a.share || (a.mega ?? "").localeCompare(b.mega ?? "", "en"),
      ),
  };
}

function carries(
  slot: Slot,
  category: Exclude<RankingCategory, "pokemon">,
  id: string,
): boolean {
  switch (category) {
    case "items":
      return itemOf(slot).id === id;
    case "abilities":
      return toId(slot.ability) === id;
    case "moves":
      return slot.moves.some((move) => toId(move) === id);
  }
}

function nameIn(
  slot: Slot,
  category: Exclude<RankingCategory, "pokemon">,
  id: string,
): string {
  switch (category) {
    case "items":
      return itemOf(slot).name;
    case "abilities":
      return slot.ability;
    case "moves":
      return slot.moves.find((move) => toId(move) === id) ?? id;
  }
}

// An item's detail lists every holder, own stones included: the stones filter
// belongs to the ranking (FR-028).
export function entryDetail(
  sheets: readonly CountedSheet[],
  category: Exclude<RankingCategory, "pokemon">,
  id: string,
): EntryDetail | null {
  const found: { sheet: CountedSheet; slot: Slot }[] = [];
  let teams = 0;
  for (const sheet of sheets) {
    const carriers = sheet.mons.filter((slot) => carries(slot, category, id));
    if (carriers.length > 0) {
      teams++;
    }
    for (const slot of carriers) {
      found.push({ sheet, slot });
    }
  }
  if (found.length === 0) {
    return null;
  }
  const slots = sheets.length * 6;
  return {
    ...usage(found, slots),
    id,
    name: nameIn(found[0].slot, category, id),
    item: category === "items" && id !== NO_ITEM_ID ? found[0].slot.item : null,
    sheets: sheets.length,
    slots,
    teamShare: teams / sheets.length,
    carriers: tally(
      found.map(({ slot }) => asEntry(slot)),
      found.length,
    ),
  };
}
