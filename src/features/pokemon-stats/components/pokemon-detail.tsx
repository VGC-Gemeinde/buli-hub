import Link from "next/link";
import type { ReactNode } from "react";
import { BackLink } from "@/components/back-link";
import { cn } from "@/lib/utils";
import type { DistRow, PokemonDetail } from "../details";
import { statsHref } from "../filter";
import { formatCount, formatShare, formatWinRate } from "../format";
import type { StatsLoad } from "../load";
import { NO_ITEM_ID } from "../rankings";
import { toId } from "../sheets";
import { itemIcon, largeSprite, moveIcon, pokemonIcon } from "../view";
import { type DistItem, DistList, Facts, Kicker, Panel } from "./detail-parts";
import { DEFINITIONS } from "./ranking-view";
import { MegaPill, StatsIcon } from "./stats-icon";
import { statsPath } from "./stats-shell";

// One Pokémon (mockups/pokemon-detail.html): how the league plays it.

function items(
  rows: DistRow[],
  href: (path: string) => string,
  icon: (row: DistRow) => DistItem["icon"],
  link: (row: DistRow) => string | undefined,
): DistItem[] {
  const max = Math.max(...rows.map((row) => row.count), 1);
  return rows.map((row) => ({
    key: row.id,
    name: row.name,
    mega: row.mega ?? null,
    icon: icon(row),
    share: formatShare(row.share),
    bar: (row.count / max) * 100,
    href: link(row) ? href(link(row) as string) : undefined,
  }));
}

export function PokemonDetailView({
  detail,
  load,
  filters,
}: {
  detail: PokemonDetail;
  load: StatsLoad;
  filters: ReactNode;
}) {
  const href = (path: string) => statsHref(path, load.filter);
  const sprite = largeSprite(detail.sprite);
  const noIcon = () => undefined;
  const half = Math.ceil(detail.teammates.length / 2);
  const mates = items(
    detail.teammates,
    href,
    (row) => pokemonIcon(row.sprite ?? row.name),
    (row) => statsPath("pokemon", row.id),
  );
  return (
    <>
      <div className="grid grid-cols-[76px_minmax(0,1fr)] items-center gap-3.5 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-[22px]">
        <div className="flex size-[76px] items-center justify-center sm:size-28">
          {/* biome-ignore lint/performance/noImgElement: sprites come from the external sprite bucket */}
          <img
            src={sprite.url}
            alt=""
            className={cn(
              "max-h-full max-w-full object-contain",
              sprite.pixelated && "[image-rendering:pixelated]",
            )}
          />
        </div>
        <div className="min-w-0">
          <Kicker>Pokémon · Saison {load.seasonNumber}</Kicker>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {/* A Pokémon name keeps its own casing (as on the team sheet cards). */}
            <h1 className="font-bold font-heading text-[28px] text-brand-blue normal-case leading-[1.1] tracking-[0.01em] sm:text-[34px] dark:text-white">
              {detail.name}
            </h1>
            {detail.mega ? (
              <MegaPill
                label={detail.mega}
                className="h-[22px] px-2 text-[11px]"
              />
            ) : null}
          </div>
          {detail.family.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1.5 text-[13px] text-muted-foreground">
              <span>Auch gespielt als</span>
              {detail.family.map((member) => (
                <Link
                  key={member.id}
                  href={href(statsPath("pokemon", member.id))}
                  className="font-semibold text-brand-blue hover:underline hover:underline-offset-[3px] dark:text-white"
                >
                  {member.name}
                  {member.mega ? ` ${member.mega}` : ""}{" "}
                  <span className="font-normal text-muted-foreground tabular-nums">
                    ({formatShare(member.share)})
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {filters}
      <Facts
        use={{
          value: formatShare(detail.share),
          context: `${formatCount(detail.count)} von ${formatCount(detail.sheets)} Teams`,
          definition: DEFINITIONS.usePokemon,
        }}
        win={{
          value: formatWinRate(detail.wins, detail.rated),
          context: `${formatCount(detail.rated)} Matches`,
          definition: DEFINITIONS.win,
        }}
      />
      <div className="grid grid-cols-1 gap-7 md:grid-cols-2 md:gap-x-10">
        <Panel title="Attacken" meta={`${formatCount(detail.count)} Pokémon`}>
          <DistList
            rows={items(
              detail.moves,
              href,
              (row) => moveIcon(row.name),
              (row) => statsPath("attacken", row.id),
            )}
          />
        </Panel>
        <div className="flex min-w-0 flex-col gap-7">
          <Panel title="Item">
            {detail.fixedItem ? (
              <div className="flex items-center gap-2.5 px-1.5 pt-2.5 pb-1 text-[14px]">
                <StatsIcon icon={itemIcon(detail.fixedItem)} size="small" />
                <Link
                  href={href(statsPath("items", toId(detail.fixedItem)))}
                  className="font-semibold hover:underline hover:underline-offset-[3px]"
                >
                  {detail.fixedItem}
                </Link>
              </div>
            ) : (
              <DistList
                rows={items(
                  detail.items,
                  href,
                  (row) => itemIcon(row.id === NO_ITEM_ID ? null : row.name),
                  (row) => statsPath("items", row.id),
                )}
              />
            )}
          </Panel>
          <Panel title="Fähigkeit">
            {detail.megaAbility ? (
              <>
                <div className="flex items-center gap-2.5 px-1.5 pt-2.5 pb-1 text-[14px]">
                  <span className="font-semibold text-[11.5px] text-muted-foreground uppercase tracking-[0.12em]">
                    Mega-Fähigkeit
                  </span>
                  <Link
                    href={href(
                      statsPath("faehigkeiten", toId(detail.megaAbility)),
                    )}
                    className="font-semibold text-brand-orange hover:underline hover:underline-offset-[3px]"
                  >
                    {detail.megaAbility}
                  </Link>
                </div>
                <div className="px-1.5 pt-2.5 font-semibold text-[11.5px] text-muted-foreground uppercase tracking-[0.12em]">
                  Im Teamsheet
                </div>
              </>
            ) : null}
            <DistList
              rows={items(detail.abilities, href, noIcon, (row) =>
                detail.megaAbility
                  ? undefined
                  : statsPath("faehigkeiten", row.id),
              )}
            />
          </Panel>
          <Panel title="Wesen">
            <DistList
              rows={items(detail.natures, href, noIcon, () => undefined)}
            />
          </Panel>
        </div>
        <Panel title="Teampartner" meta="im selben Team" wide>
          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-7">
            <DistList rows={mates.slice(0, half)} />
            <DistList rows={mates.slice(half)} />
          </div>
        </Panel>
      </div>
    </>
  );
}

export function DetailBack() {
  return (
    <BackLink fallbackHref="/statistiken/pokemon" className="mb-0 self-start" />
  );
}
