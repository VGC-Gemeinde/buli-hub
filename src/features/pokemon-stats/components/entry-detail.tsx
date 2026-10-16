import type { ReactNode } from "react";
import type { EntryDetail } from "../details";
import type { Category } from "../filter";
import { statsHref } from "../filter";
import { formatCount, formatShare, formatWinRate } from "../format";
import { DETAIL_KICKER } from "../labels";
import type { StatsLoad } from "../load";
import type { MoveCard } from "../move-card";
import { itemIcon, pokemonIcon } from "../view";
import { DistList, Facts, Kicker, Panel } from "./detail-parts";
import { MoveCardView } from "./move-card-view";
import { DEFINITIONS } from "./ranking-view";
import { StatsIcon } from "./stats-icon";
import { statsPath } from "./stats-shell";

// An item, ability or move (mockups/entry-detail.html): who carries it.

export function EntryDetailView({
  category,
  detail,
  card,
  load,
  filters,
}: {
  category: Exclude<Category, "pokemon">;
  detail: EntryDetail;
  card: MoveCard | null;
  load: StatsLoad;
  filters: ReactNode;
}) {
  const max = Math.max(...detail.carriers.map((row) => row.count), 1);
  const icon = category === "items" ? itemIcon(detail.item) : null;
  return (
    <>
      <div
        className={
          icon
            ? "grid grid-cols-[76px_minmax(0,1fr)] items-center gap-3.5 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-[22px]"
            : ""
        }
      >
        {icon ? (
          <div className="flex size-[76px] items-center justify-center sm:size-28">
            <StatsIcon icon={icon} size="large" />
          </div>
        ) : null}
        <div className="min-w-0">
          <Kicker>
            {DETAIL_KICKER[category]} · Saison {load.seasonNumber}
          </Kicker>
          <h1 className="mt-1.5 text-[28px] text-brand-blue leading-[1.1] sm:text-[34px] dark:text-white">
            {detail.name}
          </h1>
          {card ? <MoveCardView card={card} /> : null}
        </div>
      </div>
      {filters}
      <div className="flex flex-col gap-3">
        <Facts
          use={{
            value: formatShare(detail.share),
            context: `${formatCount(detail.count)} von ${formatCount(detail.slots)} Pokémon`,
            definition: DEFINITIONS.useSlot,
          }}
          win={{
            value: formatWinRate(detail.wins, detail.rated),
            context: `${formatCount(detail.rated)} Pokémon in gewerteten Matches`,
            definition: DEFINITIONS.win,
          }}
        />
        <p className="text-[13px] text-muted-foreground">
          Auf{" "}
          <b className="font-semibold text-foreground tabular-nums">
            {formatShare(detail.teamShare)}
          </b>{" "}
          der Teams
        </p>
      </div>
      <Panel title="Pokémon" meta={`${formatCount(detail.count)} Pokémon`}>
        <DistList
          rows={detail.carriers.map((row) => ({
            key: row.id,
            name: row.name,
            mega: row.mega ?? null,
            icon: pokemonIcon(row.sprite ?? row.name),
            share: formatShare(row.share),
            bar: (row.count / max) * 100,
            href: statsHref(statsPath("pokemon", row.id), load.filter),
          }))}
        />
      </Panel>
    </>
  );
}
