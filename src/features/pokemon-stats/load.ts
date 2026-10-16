import { currentSeason } from "@/features/season/season-status";
import { germanToday } from "@/lib/german-time";
import {
  type CountedSheet,
  filterSheets,
  parseStatsParams,
  postSeasonBegun,
  type RankingOptions,
  type StatsFilter,
  selectionLabel,
  type WeekOption,
  weekOptions,
} from "./filter";
import { countedSheets, seasonTiers, statsWeeks } from "./queries";

// What every stats page starts from: the current season, the URL's filters
// and the sheets they count. Null without a running season (the stats are
// strictly the current season's, spec Clarifications).
export type StatsLoad = {
  seasonNumber: number;
  // Every counted sheet of the season, before the filters.
  seasonSheets: number;
  sheets: CountedSheet[];
  filter: StatsFilter;
  options: RankingOptions;
  postSeasonBegun: boolean;
  tiers: number[];
  // The weeks the week select offers under the current phase.
  weeks: WeekOption[];
  // "Division 2 · Spieltag 1 bis 6".
  label: string;
};

export async function loadStats(
  params: Record<string, string | string[] | undefined>,
): Promise<StatsLoad | null> {
  const { window, phase } = await currentSeason();
  if (!window || phase !== "regular_season") {
    return null;
  }
  const today = germanToday();
  const [all, { weeks, tiebreakerRounds }, tiers] = await Promise.all([
    countedSheets(window.id),
    statsWeeks(window.id),
    seasonTiers(window.id),
  ]);
  const { filter, options } = parseStatsParams(params, {
    weeks,
    today,
    tiebreakerRounds,
  });
  const offered = weekOptions(weeks, today, filter.phase, tiebreakerRounds);
  return {
    seasonNumber: window.seasonNumber,
    seasonSheets: all.length,
    sheets: filterSheets(all, filter),
    filter,
    options,
    postSeasonBegun: postSeasonBegun(weeks, today),
    tiers,
    weeks: offered,
    label: selectionLabel(filter, offered),
  };
}
