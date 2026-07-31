import type { ReactNode } from "react";
import { Tick } from "@/components/tick";
import { cn } from "@/lib/utils";

// Callout for hard rules that must not be skimmed past (design §2.8). Used
// sparingly and deliberately — Replay-Pflicht, unveränderliche Nachrichten,
// „greift kein Tiebreaker", and the gate dialog's „Bis dahin".
//
// `emphasis` is for the one rule players kept scrolling past. A muted box
// reads as an aside, and three of them in a row train the eye to skip all
// three; the orange border and tint are the same treatment the emphasised fact
// tile and the acceptance prompt use, so the page already teaches that it
// means „this one is not optional". No left-border accent bars, no gradients —
// DESIGN.md forbids both.
export function Callout({
  title,
  tickColor = "navy",
  emphasis = false,
  children,
}: {
  title: string;
  tickColor?: "orange" | "navy";
  emphasis?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-4",
        // Light and dark need different weights for the same loudness: a 5%
        // orange wash on white is almost nothing, while on the dark navy
        // background it already reads. So light gets a heavier tint and a
        // double border, and dark keeps what it had.
        emphasis
          ? "border-2 border-brand-orange bg-brand-orange/12 p-5 dark:border dark:bg-brand-orange/5"
          : "border-border bg-muted",
      )}
    >
      <div className="flex items-center gap-2.5">
        <Tick size={emphasis ? "m" : "s"} color={tickColor} />
        <span
          className={cn(
            "font-semibold uppercase",
            emphasis
              ? "text-[13px] text-brand-orange tracking-[0.16em]"
              : "text-[11px] text-foreground tracking-[0.12em]",
          )}
        >
          {title}
        </span>
      </div>
      <p
        className={cn(
          emphasis
            ? "text-[16px] text-foreground leading-[1.5]"
            : "text-[13px] text-muted-foreground leading-[1.55]",
        )}
      >
        {children}
      </p>
    </div>
  );
}
