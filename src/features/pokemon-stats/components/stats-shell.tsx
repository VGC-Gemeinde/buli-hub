import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyStateCard } from "@/components/empty-state-card";
import { Tick } from "@/components/tick";
import { cn } from "@/lib/utils";
import {
  CATEGORIES,
  type Category,
  DEFAULT_FILTER,
  isFiltered,
  type RankingOptions,
  statsHref,
} from "../filter";
import { CATEGORY_LABEL } from "../labels";
import type { StatsLoad } from "../load";
import { type FilterSelect, StatsFilters } from "./stats-filters";

// The frame of every stats page (mockups/rankings.html): the 1040px
// container, the page title with the category switch on rankings, and the
// filter row.

export const statsPath = (category: Category, id?: string) =>
  id ? `/statistiken/${category}/${id}` : `/statistiken/${category}`;

export function StatsContainer({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-[1040px] flex-1 flex-col gap-[22px] px-4 pt-7 pb-14 sm:gap-[26px] sm:px-6 sm:pt-10 sm:pb-16">
      {children}
    </main>
  );
}

export function StatsTitle({
  category,
  load,
}: {
  category?: Category;
  load: StatsLoad | null;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="flex items-center gap-2.5">
        <Tick size="l" />
        <h1 className="text-[28px] text-brand-blue leading-[1.1] sm:text-[34px] dark:text-white">
          Statistiken
        </h1>
      </div>
      {category ? (
        <nav
          aria-label="Kategorie"
          className="flex w-full gap-0.5 rounded-full border bg-muted/40 p-[3px] sm:w-auto"
        >
          {CATEGORIES.map((key) => (
            <Link
              key={key}
              href={
                load
                  ? statsHref(statsPath(key), load.filter, {
                      sort: load.options.sort,
                      minShare: load.options.minShare,
                      all: load.options.all,
                    })
                  : statsPath(key)
              }
              scroll={false}
              aria-current={key === category ? "page" : undefined}
              className={cn(
                "flex-1 whitespace-nowrap rounded-full px-1.5 py-2 text-center text-[13px] transition-colors sm:flex-none sm:px-[18px] sm:py-[7px] sm:text-[13.5px]",
                key === category
                  ? "bg-brand-orange font-semibold text-white"
                  : "font-medium text-muted-foreground hover:text-brand-blue dark:hover:text-white",
              )}
            >
              {CATEGORY_LABEL[key]}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}

// The filter row for a view. `options` only on rankings: there the minimum
// usage is a filter too, and reset keeps nothing.
export function StatsFilterRow({
  load,
  path,
  options,
}: {
  load: StatsLoad;
  path: string;
  options?: RankingOptions;
}) {
  const { filter } = load;
  const href = (
    next: Partial<typeof filter>,
    nextOptions?: Partial<RankingOptions>,
  ) =>
    statsHref(
      path,
      { ...filter, ...next },
      options ? { ...options, ...nextOptions } : undefined,
    );
  const phase = load.postSeasonBegun
    ? (
        [
          ["all", "Alle"],
          ["regular", "Reguläre Saison"],
          ["post", "Nachsaison"],
        ] as const
      ).map(([value, label]) => ({
        label,
        // A week belongs to one phase; switching phase drops it.
        href: href({ phase: value, round: null }),
        active: filter.phase === value,
      }))
    : null;
  const selects: FilterSelect[] = [
    {
      id: "stats-division",
      label: "Division",
      value: filter.tier === null ? "" : String(filter.tier),
      set: filter.tier !== null,
      options: [
        { value: "", label: "Alle Divisionen", href: href({ tier: null }) },
        ...load.tiers.map((tier) => ({
          value: String(tier),
          label: `Division ${tier}`,
          href: href({ tier }),
        })),
      ],
    },
    {
      id: "stats-week",
      label: "Spieltag",
      value: filter.round === null ? "" : String(filter.round),
      set: filter.round !== null,
      options: [
        {
          value: "",
          label: load.postSeasonBegun ? "Alle Wochen" : "Alle Spieltage",
          href: href({ round: null }),
        },
        ...load.weeks.map((week) => ({
          value: String(week.round),
          label: week.name,
          href: href({ round: week.round }),
        })),
      ],
    },
  ];
  if (options) {
    selects.push({
      id: "stats-min",
      label: "Mindestnutzung",
      value: String(options.minShare),
      set: options.minShare !== 0,
      options: [
        { value: "0", label: "Jede Nutzung", href: href({}, { minShare: 0 }) },
        ...([1, 2, 5, 10] as const).map((min) => ({
          value: String(min),
          label: `Nutzung ab ${min} %`,
          href: href({}, { minShare: min }),
        })),
      ],
    });
  }
  return (
    <StatsFilters
      phase={phase}
      selects={selects}
      reset={{
        href: statsHref(
          path,
          DEFAULT_FILTER,
          options ? { sort: options.sort } : undefined,
        ),
        visible: isFiltered(filter, options),
      }}
    />
  );
}

export function NoSheetsYet() {
  return (
    <EmptyStateCard
      title="Noch keine Teamsheets"
      informational
      className="max-w-[640px]"
    >
      Noch kein Ergebnis der Saison gemeldet.
    </EmptyStateCard>
  );
}

export function NothingSelected({
  title,
  body,
  resetHref,
}: {
  title: string;
  body: string;
  resetHref: string;
}) {
  return (
    <EmptyStateCard
      title={title}
      className="max-w-[640px]"
      action={
        <Link
          href={resetHref}
          scroll={false}
          className="inline-flex h-9 items-center rounded-lg border bg-background px-3.5 font-medium text-sm hover:bg-muted"
        >
          Filter zurücksetzen
        </Link>
      }
    >
      {body}
    </EmptyStateCard>
  );
}
