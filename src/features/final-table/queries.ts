import { eq, inArray } from "drizzle-orm";
import { placements, subDivisions } from "@/db/schema";
import { droppedIdsForWindow } from "@/features/drops/queries";
import { divisionGroups } from "@/features/reporting/queries";
import {
  computeStandings,
  divisionStandings,
  type StandingsRow,
} from "@/features/reporting/standings";
import type { Identity } from "@/features/season/dashboard";
import type { DivisionForValidation } from "@/features/seeding/post-season";
import { divisionsWithGroupSizes } from "@/features/seeding/queries";
import { db } from "@/lib/db";
import {
  type FinalTable,
  finalTable,
  type TableRow,
  type TieDecision,
} from "./places";

export type FinalTables = {
  // The seeding's zone configuration, one entry per division.
  divisions: DivisionForValidation[];
  // Each division's decisive tables: its groups, or its one division table.
  tablesByTier: Map<number, FinalTable[]>;
  // Everyone who appears in a table, for names and avatars.
  identities: Map<string, Identity>;
};

// The decisive tables of a season as they stand right now, with the true
// tally (staff view: withheld results count). `decided` carries the decided
// order of boundary ties (tiebreakers, staff orders), keyed by tie key.
export async function loadFinalTables(
  windowId: string,
  decided: ReadonlyMap<string, TieDecision> = new Map(),
): Promise<FinalTables> {
  const [configs, droppedIds, lotRows] = await Promise.all([
    divisionsWithGroupSizes(windowId),
    droppedIdsForWindow(windowId),
    db
      .select({ userId: placements.userId, lot: placements.lotNumber })
      .from(placements)
      .where(eq(placements.windowId, windowId)),
  ]);
  const playerLot = new Map(lotRows.map((row) => [row.userId, row.lot]));

  const groupsByDivision = new Map(
    await Promise.all(
      configs.map(
        async (config) => [config.id, await divisionGroups(config.id)] as const,
      ),
    ),
  );
  const groupIds = [...groupsByDivision.values()].flatMap((groups) =>
    groups.map((group) => group.subDivisionId),
  );
  const groupLotRows =
    groupIds.length === 0
      ? []
      : await db
          .select({ id: subDivisions.id, lot: subDivisions.lotNumber })
          .from(subDivisions)
          .where(inArray(subDivisions.id, groupIds));
  const groupLot = new Map(groupLotRows.map((row) => [row.id, row.lot]));

  const identities = new Map<string, Identity>();
  const toRows = (standings: readonly StandingsRow[]): TableRow[] =>
    standings.map((row) => ({
      userId: row.userId,
      rank: row.rank,
      dropped: droppedIds.has(row.userId),
      lot: playerLot.get(row.userId) ?? 0,
    }));

  const tablesByTier = new Map<number, FinalTable[]>();
  for (const config of configs) {
    const groups = groupsByDivision.get(config.id) ?? [];
    for (const group of groups) {
      for (const member of group.members) {
        identities.set(member.userId, member);
      }
    }
    const counts = {
      champion: config.championshipPlayoffSlots,
      promotions: config.guaranteedPromotions,
      promotionPlayoff: config.promotionPlayoffSlots,
      demotionPlayoff: config.demotionPlayoffSlots,
      demotions: config.guaranteedDemotions,
    };
    const merged =
      config.relevantTable === "division" ? divisionStandings(groups) : null;
    const tables = merged
      ? [
          finalTable(
            {
              tier: config.tier,
              subDivisionId: null,
              groupPosition: null,
              groupLot: null,
              rows: toRows(merged),
              counts,
            },
            decided,
          ),
        ]
      : groups.map((group) =>
          finalTable(
            {
              tier: config.tier,
              subDivisionId: group.subDivisionId,
              groupPosition: group.position,
              groupLot: groupLot.get(group.subDivisionId) ?? 0,
              rows: toRows(
                computeStandings({
                  roster: group.roster,
                  results: group.results,
                }),
              ),
              counts,
            },
            decided,
          ),
        );
    tablesByTier.set(config.tier, tables);
  }

  return { divisions: configs, tablesByTier, identities };
}
