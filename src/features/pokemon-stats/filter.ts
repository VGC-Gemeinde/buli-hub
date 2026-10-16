import { z } from "zod";
import { weekNames } from "@/features/season/week-names";
import type { Slot } from "./sheets";

// What the stats count and how the URL says it (specs/001-pokemon-usage-stats,
// contracts/routes.md). Every view counts the same filtered sheets; the
// ranking options only hide entries and never change a basis.

export type Phase = "regular" | "post";

export type CountedSheet = {
  matchId: string;
  playerId: string;
  // Regular and tiebreaker matches are the regular season, Relegation and
  // Playoffs the Nachsaison.
  phase: Phase;
  round: number;
  // The division the player is placed in this season.
  tier: number | null;
  // Null when the match is not rated (research R2).
  result: "won" | "lost" | null;
  mons: Slot[];
};

export type StatsFilter = {
  phase: "all" | Phase;
  tier: number | null;
  round: number | null;
};

export type SortKey = "name" | "use" | "win" | "matches";

export type RankingOptions = {
  sort: { key: SortKey; dir: "asc" | "desc" };
  minShare: 0 | 1 | 2 | 5 | 10;
  mega: "all" | "mega" | "base";
  hideProtect: boolean;
  hideOwnStones: boolean;
  all: boolean;
};

export const DEFAULT_FILTER: StatsFilter = {
  phase: "all",
  tier: null,
  round: null,
};

export const DEFAULT_OPTIONS: RankingOptions = {
  sort: { key: "use", dir: "desc" },
  minShare: 0,
  mega: "all",
  hideProtect: false,
  hideOwnStones: true,
  all: false,
};

export const CATEGORIES = [
  "pokemon",
  "items",
  "faehigkeiten",
  "attacken",
] as const;
export type Category = (typeof CATEGORIES)[number];

export function filterSheets(
  sheets: readonly CountedSheet[],
  filter: StatsFilter,
): CountedSheet[] {
  return sheets.filter(
    (sheet) =>
      (filter.phase === "all" || sheet.phase === filter.phase) &&
      // A sheet without a division (should not occur) counts only without a
      // division filter.
      (filter.tier === null || sheet.tier === filter.tier) &&
      (filter.round === null || sheet.round === filter.round),
  );
}

export type Week = {
  round: number;
  startsOn: string;
  endsOn: string;
  regular: boolean;
};

// The Nachsaison has begun once its first week has.
export function postSeasonBegun(
  weeks: readonly Week[],
  today: string,
): boolean {
  return weeks.some((week) => !week.regular && week.startsOn <= today);
}

export type WeekOption = { round: number; name: string };

// The started weeks the week select offers under a phase. Tiebreakers have no
// week of their own, they share the first Nachsaison week: under the regular
// season that week is offered only when it holds a tiebreaker.
export function weekOptions(
  weeks: readonly Week[],
  today: string,
  phase: StatsFilter["phase"],
  tiebreakerRounds: ReadonlySet<number>,
): WeekOption[] {
  const names = weekNames(weeks);
  return [...weeks]
    .sort((a, b) => a.round - b.round)
    .filter((week) => week.startsOn <= today)
    .filter((week) => {
      if (phase === "post") {
        return !week.regular;
      }
      if (phase === "regular") {
        return week.regular || tiebreakerRounds.has(week.round);
      }
      return true;
    })
    .map((week) => ({
      round: week.round,
      name: names.get(week.round)?.name ?? `Spieltag ${week.round}`,
    }));
}

// "Division 2 · Spieltag 1 bis 6 · Woche 1 bis 2": what a ranking counts.
export function selectionLabel(
  filter: StatsFilter,
  options: readonly WeekOption[],
): string {
  const parts: string[] = [];
  if (filter.phase === "regular") {
    parts.push("Reguläre Saison");
  }
  if (filter.phase === "post") {
    parts.push("Nachsaison");
  }
  if (filter.tier !== null) {
    parts.push(`Division ${filter.tier}`);
  }
  if (filter.round !== null) {
    parts.push(
      options.find((option) => option.round === filter.round)?.name ??
        `Spieltag ${filter.round}`,
    );
    return parts.join(" · ");
  }
  const span = (prefix: string, names: string[]) =>
    names.length === 0
      ? null
      : names.length === 1
        ? names[0]
        : `${names[0]} bis ${names[names.length - 1].replace(`${prefix} `, "")}`;
  const regular = span(
    "Spieltag",
    options.filter((o) => o.name.startsWith("Spieltag")).map((o) => o.name),
  );
  const post = span(
    "Woche",
    options.filter((o) => o.name.startsWith("Woche")).map((o) => o.name),
  );
  for (const part of [regular, post]) {
    if (part) {
      parts.push(part);
    }
  }
  return parts.join(" · ");
}

// --- URL ---------------------------------------------------------------------

type Params = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const positiveInt = z.coerce.number().int().positive();

const rawSchema = z.object({
  phase: z.enum(["regular", "post"]).optional().catch(undefined),
  division: positiveInt.optional().catch(undefined),
  woche: positiveInt.optional().catch(undefined),
  sort: z
    .enum([
      "name-asc",
      "name-desc",
      "use-asc",
      "use-desc",
      "win-asc",
      "win-desc",
      "matches-asc",
      "matches-desc",
    ])
    .optional()
    .catch(undefined),
  min: z.enum(["1", "2", "5", "10"]).optional().catch(undefined),
  mega: z.enum(["mega", "base"]).optional().catch(undefined),
  protect: z.literal("0").optional().catch(undefined),
  steine: z.literal("1").optional().catch(undefined),
  alle: z.literal("1").optional().catch(undefined),
});

export type StatsContext = {
  weeks: readonly Week[];
  today: string;
  tiebreakerRounds: ReadonlySet<number>;
};

// Invalid or unknown values fall back to the default, never to an error. The
// phase means nothing before the Nachsaison has begun, and a week that is not
// offered under the phase is dropped.
export function parseStatsParams(
  params: Params,
  context: StatsContext,
): { filter: StatsFilter; options: RankingOptions } {
  const raw = rawSchema.parse(
    Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, first(value)]),
    ),
  );
  const begun = postSeasonBegun(context.weeks, context.today);
  const phase: StatsFilter["phase"] = begun && raw.phase ? raw.phase : "all";
  const offered = weekOptions(
    context.weeks,
    context.today,
    phase,
    context.tiebreakerRounds,
  );
  const round =
    raw.woche !== undefined &&
    offered.some((option) => option.round === raw.woche)
      ? raw.woche
      : null;
  const [key, dir] = (raw.sort ?? "use-desc").split("-") as [
    SortKey,
    "asc" | "desc",
  ];
  return {
    filter: { phase, tier: raw.division ?? null, round },
    options: {
      sort: { key, dir },
      minShare: raw.min ? (Number(raw.min) as RankingOptions["minShare"]) : 0,
      mega: raw.mega ?? "all",
      hideProtect: raw.protect === "0",
      hideOwnStones: raw.steine !== "1",
      all: raw.alle === "1",
    },
  };
}

// A link to a stats view. Defaults are left out, so the plain path is the
// default view. Filters travel between views; ranking options only within
// rankings.
export function statsHref(
  path: string,
  filter: StatsFilter,
  options?: Partial<RankingOptions>,
): string {
  const query = new URLSearchParams();
  if (filter.phase !== "all") {
    query.set("phase", filter.phase);
  }
  if (filter.tier !== null) {
    query.set("division", String(filter.tier));
  }
  if (filter.round !== null) {
    query.set("woche", String(filter.round));
  }
  if (options) {
    const sort = options.sort ?? DEFAULT_OPTIONS.sort;
    if (sort.key !== "use" || sort.dir !== "desc") {
      query.set("sort", `${sort.key}-${sort.dir}`);
    }
    if (options.minShare) {
      query.set("min", String(options.minShare));
    }
    if (options.mega && options.mega !== "all") {
      query.set("mega", options.mega);
    }
    if (options.hideProtect) {
      query.set("protect", "0");
    }
    if (options.hideOwnStones === false) {
      query.set("steine", "1");
    }
    if (options.all) {
      query.set("alle", "1");
    }
  }
  const search = query.toString();
  return search ? `${path}?${search}` : path;
}

// Any filter or option away from its default: that is when "Filter
// zurücksetzen" shows.
export function isFiltered(
  filter: StatsFilter,
  options?: Pick<
    RankingOptions,
    "minShare" | "mega" | "hideProtect" | "hideOwnStones"
  >,
): boolean {
  return (
    filter.phase !== "all" ||
    filter.tier !== null ||
    filter.round !== null ||
    (options !== undefined &&
      (options.minShare !== 0 ||
        options.mega !== "all" ||
        options.hideProtect ||
        !options.hideOwnStones))
  );
}
