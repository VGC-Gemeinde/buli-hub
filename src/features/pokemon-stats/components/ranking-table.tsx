import Link from "next/link";
import { InfoTooltip } from "@/components/info-label";
import { cn } from "@/lib/utils";
import type { SortKey } from "../filter";
import type { Icon } from "../view";
import { MegaPill, StatsIcon } from "./stats-icon";

// A ranking (mockups/rankings.html): a real table that scrolls sideways in
// its card when it does not fit (a phone), rank and icon pinned at the left
// edge (rank and name where there is no icon). Column heads sort; the
// definition of a column sits behind its label.

export type RankingRow = {
  id: string;
  href: string;
  rank: number;
  name: string;
  mega: string | null;
  icon: Icon | null;
  share: string;
  // 0 to 100, the bar's length against the largest entry shown (FR-026).
  bar: number;
  winRate: string;
  matches: string;
};

export type SortColumn = {
  key: SortKey;
  label: string;
  href: string;
  active: "asc" | "desc" | null;
  definition?: string;
};

function SortHead({
  column,
  align,
}: {
  column: SortColumn;
  align: "left" | "right";
}) {
  return (
    <Link
      href={column.href}
      scroll={false}
      aria-label={`Nach ${column.label} sortieren`}
      className={cn(
        "group/info relative inline-flex items-center gap-1 rounded-[3px] outline-offset-2 transition-colors hover:text-brand-blue dark:hover:text-white",
        column.active && "text-brand-blue dark:text-white",
      )}
    >
      <span
        className={cn(
          column.definition &&
            "cursor-help underline decoration-dotted decoration-muted-foreground/60 underline-offset-[3px]",
        )}
      >
        {column.label}
      </span>
      <span
        aria-hidden
        className="inline-block w-2.5 text-[12px] text-brand-orange"
      >
        {column.active === "desc" ? "↓" : column.active === "asc" ? "↑" : ""}
      </span>
      {column.definition ? (
        <InfoTooltip align={align}>{column.definition}</InfoTooltip>
      ) : null}
    </Link>
  );
}

const CELL = "border-b px-2.5 py-2 align-middle sm:px-3";
// Pinned cells need an opaque ground; the hover tint sits on top of it.
const PINNED =
  "sticky z-[1] bg-background before:pointer-events-none before:absolute before:inset-0 group-hover:before:bg-muted";

export function RankingTable({
  rows,
  columns,
  nameLabel,
  withIcon,
}: {
  rows: RankingRow[];
  columns: {
    name: SortColumn;
    use: SortColumn;
    win: SortColumn;
    matches: SortColumn;
  };
  nameLabel: string;
  withIcon: boolean;
}) {
  const sortOf = (column: SortColumn) =>
    column.active === "desc"
      ? "descending"
      : column.active === "asc"
        ? "ascending"
        : "none";
  return (
    <div className="overflow-x-auto rounded-[10px] border">
      <table
        className={cn(
          "w-full border-separate border-spacing-0 text-left [&_tbody_tr:last-child_td]:border-b-0",
          withIcon ? "min-w-[540px]" : "min-w-[500px]",
        )}
      >
        <thead>
          <tr className="text-[11px] text-muted-foreground uppercase tracking-[0.1em]">
            <th
              scope="col"
              className={cn(
                CELL,
                "sticky left-0 z-[2] w-[34px] bg-background py-2.5 pr-0.5 pl-2 text-right font-semibold before:absolute before:inset-0 before:bg-muted/50 sm:w-11 sm:pl-3",
              )}
            >
              <span className="relative">#</span>
            </th>
            {withIcon ? (
              <th
                scope="col"
                className={cn(
                  CELL,
                  "sticky left-[34px] z-[2] w-14 bg-background py-2.5 before:absolute before:inset-0 before:bg-muted/50 sm:left-11 max-sm:shadow-[inset_-1px_0_0_var(--border)]",
                )}
              >
                <span className="sr-only">Bild</span>
              </th>
            ) : null}
            <th
              scope="col"
              aria-sort={sortOf(columns.name)}
              className={cn(
                CELL,
                "min-w-[150px] bg-muted/50 py-2.5 font-semibold",
                !withIcon &&
                  "sticky left-[34px] z-[2] bg-background before:absolute before:inset-0 before:bg-muted/50 sm:left-11 max-sm:shadow-[inset_-1px_0_0_var(--border)]",
              )}
            >
              <span className="relative">
                <SortHead
                  column={{ ...columns.name, label: nameLabel }}
                  align="left"
                />
              </span>
            </th>
            <th
              scope="col"
              aria-sort={sortOf(columns.use)}
              className={cn(
                CELL,
                "w-[1%] min-w-[150px] bg-muted/50 py-2.5 text-right font-semibold sm:min-w-[280px]",
              )}
            >
              <SortHead column={columns.use} align="right" />
            </th>
            <th
              scope="col"
              aria-sort={sortOf(columns.win)}
              className={cn(
                CELL,
                "w-[1%] whitespace-nowrap bg-muted/50 py-2.5 pl-4 text-right font-semibold",
              )}
            >
              <SortHead column={columns.win} align="right" />
            </th>
            <th
              scope="col"
              aria-sort={sortOf(columns.matches)}
              className={cn(
                CELL,
                "w-[1%] whitespace-nowrap bg-muted/50 py-2.5 pr-3.5 text-right font-semibold",
              )}
            >
              <SortHead column={columns.matches} align="right" />
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            // The whole row opens the detail; only the name is a tab stop.
            const cellLink = (
              children: React.ReactNode,
              className?: string,
              tabbable = false,
            ) => (
              <Link
                href={row.href}
                tabIndex={tabbable ? undefined : -1}
                className={cn("relative block", className)}
              >
                {children}
              </Link>
            );
            return (
              <tr key={row.id} className="group">
                <td
                  className={cn(
                    CELL,
                    PINNED,
                    "left-0 pr-0.5 pl-2 text-right text-[13px] text-muted-foreground tabular-nums sm:pl-3",
                  )}
                >
                  {cellLink(row.rank)}
                </td>
                {withIcon && row.icon ? (
                  <td
                    className={cn(
                      CELL,
                      PINNED,
                      "left-[34px] sm:left-11 max-sm:shadow-[inset_-1px_0_0_var(--border)]",
                    )}
                  >
                    {cellLink(<StatsIcon icon={row.icon} />)}
                  </td>
                ) : null}
                <td
                  className={cn(
                    CELL,
                    "group-hover:bg-muted",
                    !withIcon &&
                      cn(
                        PINNED,
                        "left-[34px] max-w-[170px] sm:left-11 sm:max-w-none max-sm:shadow-[inset_-1px_0_0_var(--border)]",
                      ),
                  )}
                >
                  {cellLink(
                    <span className="flex flex-wrap items-center gap-x-[7px] gap-y-0.5 font-semibold text-[14px] text-brand-blue leading-tight dark:text-white">
                      <span>{row.name}</span>
                      {row.mega ? <MegaPill label={row.mega} /> : null}
                    </span>,
                    undefined,
                    true,
                  )}
                </td>
                <td className={cn(CELL, "group-hover:bg-muted")}>
                  {cellLink(
                    <span className="grid grid-cols-[minmax(70px,1fr)_54px] items-center gap-2.5 sm:grid-cols-[minmax(160px,1fr)_58px] sm:gap-3.5">
                      <span className="h-[5px] overflow-hidden rounded-[3px] bg-muted">
                        <span
                          className="block h-full rounded-[3px] bg-chart-1"
                          style={{ width: `${row.bar}%` }}
                        />
                      </span>
                      <span className="text-right font-semibold text-[14px] tabular-nums">
                        {row.share}
                      </span>
                    </span>,
                  )}
                </td>
                <td
                  className={cn(
                    CELL,
                    "whitespace-nowrap pl-4 text-right font-medium text-[14px] tabular-nums group-hover:bg-muted",
                  )}
                >
                  {cellLink(row.winRate)}
                </td>
                <td
                  className={cn(
                    CELL,
                    "whitespace-nowrap pr-3.5 text-right text-[13px] text-muted-foreground tabular-nums group-hover:bg-muted",
                  )}
                >
                  {cellLink(row.matches)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
