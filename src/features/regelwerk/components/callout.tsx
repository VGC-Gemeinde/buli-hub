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
        emphasis
          ? "border-brand-orange bg-brand-orange/5 p-5"
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
          "leading-[1.55]",
          emphasis
            ? "text-[14.5px] text-foreground"
            : "text-[13px] text-muted-foreground",
        )}
      >
        {children}
      </p>
    </div>
  );
}
