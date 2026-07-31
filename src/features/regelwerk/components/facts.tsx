import type { Fact } from "@/features/regelwerk/content/types";
import { cn } from "@/lib/utils";

// „Auf einen Blick" (design §2.4): the six facts players look up without
// wanting to read the document. Exactly one tile is emphasised — the season
// start, which every other date hangs off.
export function FactsGrid({
  facts,
  emphasisIndex,
}: {
  facts: Fact[];
  emphasisIndex: number;
}) {
  // Two across on phones: six full-width tiles would push the first chapter
  // below a screen of scrolling, which defeats an at-a-glance summary.
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {facts.map((fact, index) => (
        <div
          key={fact.label}
          className={cn(
            "flex flex-col gap-1 rounded-lg border px-4 py-3.5",
            index === emphasisIndex
              ? "border-brand-orange bg-brand-orange/5"
              : "border-border bg-card",
          )}
        >
          <span className="font-semibold text-[11px] text-muted-foreground uppercase tracking-[0.12em]">
            {fact.label}
          </span>
          <span
            className={cn(
              // whitespace-pre-line: a value may carry its own line break where
              // wrapping would otherwise orphan a separator.
              "whitespace-pre-line font-bold font-heading text-brand-blue dark:text-white",
              fact.kind === "date"
                ? "text-[20px] tabular-nums"
                : fact.kind === "large"
                  ? "text-[20px]"
                  : "text-[15px] leading-snug",
            )}
          >
            {fact.value}
          </span>
        </div>
      ))}
    </div>
  );
}
