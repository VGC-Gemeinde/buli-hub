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
  className,
}: {
  children: ReactNode;
  meta?: ReactNode;
  count?: number;
  tickColor?: "orange" | "neutral" | "navy";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b pb-3",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <Tick size="m" color={tickColor} />
        <h2 className="min-w-0 truncate font-bold font-heading text-[24px] text-brand-blue uppercase tracking-[0.03em] dark:text-white">
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
