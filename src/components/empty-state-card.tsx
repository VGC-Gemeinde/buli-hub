import type { ReactNode } from "react";
import { Tick } from "@/components/tick";
import { cn } from "@/lib/utils";

// The one empty/edge-state card (DESIGN.md §2.8). Replaces bare sentences and
// the dashed-border special case. Tick M — orange when an action is available,
// neutral (bg-border) when purely informational — condensed title, relaxed
// body, and an optional single action below.
export function EmptyStateCard({
  title,
  children,
  action,
  informational = false,
  className,
}: {
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  informational?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border px-6 py-7 sm:px-8", className)}>
      <div className="flex items-center gap-2.5">
        <Tick size="m" color={informational ? "neutral" : "orange"} />
        <h2 className="font-bold font-heading text-[22px] text-brand-blue uppercase leading-tight tracking-[0.02em] sm:text-[24px] dark:text-white">
          {title}
        </h2>
      </div>
      {children != null ? (
        <div className="mt-3 text-[15px] text-muted-foreground leading-relaxed">
          {children}
        </div>
      ) : null}
      {action != null ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
