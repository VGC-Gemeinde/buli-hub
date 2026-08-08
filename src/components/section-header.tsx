import type { ReactNode } from "react";
import { Tick } from "@/components/tick";
import { cn } from "@/lib/utils";

// The one section-header component (DESIGN.md §2.3) — replaces the former
// StaffSectionHeader / SectionHeading / SectionHead. Tick M + condensed h2,
// with an optional count badge beside the title and optional meta text on the
// right. `tickColor="navy"` marks staff/officiating sections.
export function SectionHeader({
  children,
  meta,
  count,
  tickColor = "orange",
  wrap = false,
  className,
}: {
  children: ReactNode;
  meta?: ReactNode;
  count?: number;
  tickColor?: "orange" | "neutral" | "navy";
  /**
   * Let a long title wrap instead of truncating. Truncation is right for
   * dynamic names (a division, a player) where the column is fixed; a static
   * heading that reads "Ablauf des Ligabet…" on a phone is not.
   */
  wrap?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b pb-3",
        className,
      )}
    >
      {/* A wrapping title is top-aligned so the tick sits on the first line
          rather than floating between two of them. The margin then has to
          re-center it *within* that line: `items-start` alone pins the tick to
          the top of the 36px line box (24px × 1.5), which is above the cap
          height of the letters beside it. 14px ≈ (36 − 9) / 2 puts it where
          `items-center` would, so a wrapping header and a single-line one align
          the same way. */}
      <div
        className={cn(
          "flex min-w-0 gap-2.5",
          wrap ? "items-start" : "items-center",
        )}
      >
        <Tick
          size="m"
          color={tickColor}
          className={wrap ? "mt-3.5" : undefined}
        />
        <h2
          className={cn(
            "min-w-0 font-bold font-heading text-[24px] text-brand-blue uppercase tracking-[0.03em] dark:text-white",
            wrap ? "text-balance" : "truncate",
          )}
        >
          {children}
        </h2>
        {count != null ? (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 font-semibold text-[12.5px] tabular-nums">
            {count}
          </span>
        ) : null}
      </div>
      {meta != null ? (
        <span className="shrink-0 text-[13px] text-muted-foreground">
          {meta}
        </span>
      ) : null}
    </div>
  );
}
