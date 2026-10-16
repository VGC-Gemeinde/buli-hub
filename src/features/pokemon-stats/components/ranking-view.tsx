import Link from "next/link";
import { HoverHint } from "@/components/hover-hint";
import { cn } from "@/lib/utils";
import type { Category, RankingOptions, SortKey } from "../filter";
import { statsHref } from "../filter";
import { formatCount, formatShare, formatWinRate } from "../format";
import { CATEGORY_KIND, CATEGORY_LABEL } from "../labels";
import type { StatsLoad } from "../load";
import { ranking, TOP } from "../rankings";
import { itemIcon, moveIcon, pokemonIcon } from "../view";
import {
  type RankingRow,
  RankingTable,
  type SortColumn,
} from "./ranking-table";
import {
  NoSheetsYet,
  NothingSelected,
  StatsFilterRow,
  statsPath,
} from "./stats-shell";

// A ranking page body (mockups/rankings.html): the basis line with its
// per-category filter, the table, "Alle N anzeigen".

const DEFINITIONS = {
  usePokemon:
    "Anteil der Teams, die dieses Pokémon mitgebracht haben. Gezählt werden nur gewertete Matches: Freilose, Doppelniederlagen und Drops zählen nicht.",
  useSlot:
    "Anteil aller mitgebrachten Pokémon, die es tragen. Gezählt werden nur gewertete Matches.",
  win: "Anteil der gewonnenen Matches der Teams, die es mitgebracht haben.",
  matches: "Gewertete Matches, auf denen Nutzung und Siegquote beruhen.",
  // Items, abilities and moves count per carrying Pokémon (FR-017): two
  // Protect users in one match are two.
  carriers:
    "Pokémon in gewerteten Matches, auf denen Nutzung und Siegquote beruhen.",
  stones:
    "Rechnet Mega-Steine heraus, die ihr eigenes Mega trägt. Ein Stein auf einem anderen Pokémon bleibt drin.",
};

const chip = (active: boolean) =>
  cn(
    "inline-flex h-8 items-center whitespace-nowrap rounded-full border px-3 text-[12.5px] transition-colors",
    active
      ? "border-brand-orange bg-brand-orange font-semibold text-white"
      : "bg-background font-medium text-muted-foreground hover:text-foreground",
  );

// The one filter of a category, at the right of the basis line. Its slot
// keeps its height on every category, so switching never moves the table.
function SlotFilter({
  category,
  href,
  options,
}: {
  category: Category;
  href: (next: Partial<RankingOptions>) => string;
  options: RankingOptions;
}) {
  const slot = "flex h-8 basis-full items-center sm:ml-auto sm:basis-auto";
  if (category === "pokemon") {
    return (
      <div className={slot}>
        <fieldset className="flex h-8 gap-0.5 rounded-full border bg-muted/40 p-[3px]">
          <legend className="sr-only">Megas</legend>
          {(
            [
              ["all", "Alle"],
              ["mega", "Megas"],
              ["base", "Ohne Mega"],
            ] as const
          ).map(([value, label]) => (
            <Link
              key={value}
              href={href({ mega: value })}
              scroll={false}
              aria-current={options.mega === value ? "true" : undefined}
              className={cn(
                "flex items-center rounded-full px-[11px] text-[12.5px] transition-colors",
                options.mega === value
                  ? "bg-brand-orange font-semibold text-white"
                  : "font-medium text-muted-foreground hover:text-brand-blue dark:hover:text-white",
              )}
            >
              {label}
            </Link>
          ))}
        </fieldset>
      </div>
    );
  }
  if (category === "items") {
    return (
      <div className={slot}>
        <HoverHint hint={DEFINITIONS.stones} align="end">
          <Link
            href={href({ hideOwnStones: !options.hideOwnStones })}
            scroll={false}
            aria-pressed={options.hideOwnStones}
            className={chip(options.hideOwnStones)}
          >
            <span className="cursor-help underline decoration-dotted underline-offset-[3px]">
              Ohne Mega-Steine
            </span>
          </Link>
        </HoverHint>
      </div>
    );
  }
  if (category === "attacken") {
    return (
      <div className={slot}>
        <Link
          href={href({ hideProtect: !options.hideProtect })}
          scroll={false}
          aria-pressed={options.hideProtect}
          className={chip(options.hideProtect)}
        >
          Ohne Protect
        </Link>
      </div>
    );
  }
  return <div className={slot} aria-hidden />;
}

export function RankingView({
  category,
  load,
}: {
  category: Category;
  load: StatsLoad;
}) {
  const path = statsPath(category);
  const { options, filter } = load;
  const href = (next: Partial<RankingOptions>) =>
    statsHref(path, filter, { ...options, ...next });

  const filters = <StatsFilterRow load={load} path={path} options={options} />;
  if (load.seasonSheets === 0) {
    return (
      <>
        {filters}
        <NoSheetsYet />
      </>
    );
  }
  if (load.sheets.length === 0) {
    return (
      <>
        {filters}
        <NothingSelected
          title="Keine Teams in dieser Auswahl"
          body={`${load.label} · noch kein Match gemeldet.`}
          resetHref={statsHref(
            path,
            { phase: "all", tier: null, round: null },
            { sort: options.sort },
          )}
        />
      </>
    );
  }

  const kind = CATEGORY_KIND[category];
  const result = ranking(load.sheets, kind, options);
  const shown = options.all ? result.entries : result.entries.slice(0, TOP);
  const max = Math.max(...result.entries.map((entry) => entry.share), 0);
  const rows: RankingRow[] = shown.map((entry) => ({
    id: entry.id,
    href: statsHref(statsPath(category, entry.id), filter),
    rank: entry.rank,
    name: entry.name,
    mega: entry.mega,
    icon:
      kind === "pokemon"
        ? pokemonIcon(entry.sprite ?? entry.name)
        : kind === "items"
          ? itemIcon(entry.item)
          : kind === "moves"
            ? moveIcon(entry.name)
            : null,
    share: formatShare(entry.share),
    bar: max === 0 ? 0 : (entry.share / max) * 100,
    winRate: formatWinRate(entry.wins, entry.rated),
    matches: formatCount(entry.rated),
  }));

  const column = (
    key: SortKey,
    label: string,
    definition?: string,
  ): SortColumn => {
    const active = options.sort.key === key ? options.sort.dir : null;
    // A first click sorts the natural way (names A to Z, numbers high to
    // low), a second one reverses.
    const dir = active
      ? active === "desc"
        ? "asc"
        : "desc"
      : key === "name"
        ? "asc"
        : "desc";
    return {
      key,
      label,
      href: href({ sort: { key, dir } }),
      active,
      definition,
    };
  };

  return (
    <>
      {filters}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b pb-3 text-[13px] text-muted-foreground">
          <span>
            <b className="font-semibold text-foreground tabular-nums">
              {formatCount(result.sheets)}
            </b>{" "}
            Teams
          </span>
          <span aria-hidden className="opacity-60">
            ·
          </span>
          <span>
            <b className="font-semibold text-foreground tabular-nums">
              {formatCount(
                new Set(load.sheets.map((sheet) => sheet.matchId)).size,
              )}
            </b>{" "}
            Matches
          </span>
          <span aria-hidden className="opacity-60">
            ·
          </span>
          <span>
            <b className="font-semibold text-foreground tabular-nums">
              {formatCount(result.slots)}
            </b>{" "}
            Pokémon
          </span>
          {load.label ? (
            <>
              <span aria-hidden className="opacity-60">
                ·
              </span>
              <span>{load.label}</span>
            </>
          ) : null}
          <SlotFilter category={category} href={href} options={options} />
        </div>
        <RankingTable
          rows={rows}
          nameLabel={CATEGORY_LABEL[category]}
          withIcon={kind !== "abilities"}
          columns={{
            name: column("name", CATEGORY_LABEL[category]),
            use: column(
              "use",
              "Nutzung",
              kind === "pokemon" ? DEFINITIONS.usePokemon : DEFINITIONS.useSlot,
            ),
            win: column("win", "Siegquote", DEFINITIONS.win),
            matches:
              kind === "pokemon"
                ? column("matches", "Matches", DEFINITIONS.matches)
                : column("matches", "Pokémon", DEFINITIONS.carriers),
          }}
        />
        {!options.all && result.entries.length > TOP ? (
          <Link
            href={href({ all: true })}
            scroll={false}
            className="w-max font-semibold text-[13.5px] text-brand-blue hover:underline hover:underline-offset-[3px] dark:text-white"
          >
            Alle {formatCount(result.entries.length)} {CATEGORY_LABEL[category]}{" "}
            anzeigen
          </Link>
        ) : null}
      </div>
    </>
  );
}

export { DEFINITIONS };
