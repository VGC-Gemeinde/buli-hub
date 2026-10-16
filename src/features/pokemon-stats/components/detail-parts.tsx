import Link from "next/link";
import type { ReactNode } from "react";
import { InfoLabel } from "@/components/info-label";
import { Tick } from "@/components/tick";
import { hoverRow } from "@/lib/emphasis";
import { cn } from "@/lib/utils";
import type { Icon } from "../view";
import { MegaPill, StatsIcon } from "./stats-icon";

// Pieces shared by the Pokémon and the entry detail
// (mockups/pokemon-detail.html, mockups/entry-detail.html).

export function Kicker({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 font-semibold text-[12.5px] text-muted-foreground uppercase tracking-[0.12em]">
      <Tick size="s" />
      {children}
    </div>
  );
}

export function Facts({
  use,
  win,
}: {
  use: { value: string; context: string; definition: string };
  win: { value: string; context: string; definition: string };
}) {
  const fact = (label: string, item: typeof use) => (
    <div className="flex min-w-0 flex-col gap-0.5 px-4 py-3.5 sm:px-5 sm:py-4">
      <span className="font-semibold text-[11.5px] text-muted-foreground uppercase tracking-[0.12em]">
        <InfoLabel label={label}>{item.definition}</InfoLabel>
      </span>
      <span className="font-bold font-heading text-[26px] text-brand-blue leading-[1.15] tabular-nums sm:text-[30px] dark:text-white">
        {item.value}
      </span>
      <span className="text-[12.5px] text-muted-foreground leading-snug">
        {item.context}
      </span>
    </div>
  );
  return (
    <div className="grid grid-cols-2 divide-x rounded-xl border sm:max-w-[560px]">
      {fact("Nutzung", use)}
      {fact("Siegquote", win)}
    </div>
  );
}

export function Panel({
  title,
  meta,
  children,
  wide,
}: {
  title: string;
  meta?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <section
      className={cn("flex min-w-0 flex-col gap-1", wide && "md:col-span-2")}
    >
      <div className="flex items-center justify-between gap-2.5 border-b pb-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Tick size="m" />
          <h2 className="text-[20px] text-brand-blue tracking-[0.03em] sm:text-[22px] dark:text-white">
            {title}
          </h2>
        </div>
        {meta ? (
          <span className="whitespace-nowrap text-[12.5px] text-muted-foreground">
            {meta}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export type DistItem = {
  key: string;
  name: string;
  mega?: string | null;
  icon?: Icon | null;
  share: string;
  // 0 to 100 against the largest row.
  bar: number;
  href?: string;
};

export function DistList({ rows }: { rows: DistItem[] }) {
  return (
    <ul className="mt-1.5 flex flex-col">
      {rows.map((row) => {
        const body = (
          <>
            {row.icon !== undefined ? (
              row.icon ? (
                <StatsIcon icon={row.icon} size="small" />
              ) : (
                <span className="w-8" />
              )
            ) : null}
            <span className="flex min-w-0 flex-wrap items-center gap-x-[7px] gap-y-0.5 font-medium text-[14px]">
              {row.name}
              {row.mega ? <MegaPill label={row.mega} /> : null}
            </span>
            <span className="text-right font-semibold text-[14px] tabular-nums">
              {row.share}
            </span>
            <span
              className={cn(
                "h-[5px] overflow-hidden rounded-[3px] bg-muted",
                row.icon !== undefined ? "col-start-2 col-end-4" : "col-span-2",
              )}
            >
              <span
                className="block h-full rounded-[3px] bg-chart-1"
                style={{ width: `${row.bar}%` }}
              />
            </span>
          </>
        );
        const grid = cn(
          "grid items-center gap-x-3 gap-y-[5px] rounded-lg px-1.5 py-2",
          row.icon !== undefined
            ? "grid-cols-[32px_minmax(0,1fr)_58px]"
            : "grid-cols-[minmax(0,1fr)_58px]",
        );
        return (
          <li key={row.key}>
            {row.href ? (
              <Link href={row.href} className={cn(grid, hoverRow)}>
                {body}
              </Link>
            ) : (
              <div className={grid}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
