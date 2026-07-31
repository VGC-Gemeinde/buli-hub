import type { ReactNode } from "react";
import { Tick } from "@/components/tick";

// Muted callout for hard rules that must not be skimmed past (design §2.8).
// Used sparingly and deliberately — Replay-Pflicht, unveränderliche
// Nachrichten, „greift kein Tiebreaker", and the gate dialog's „Bis dahin".
// Orange marks a rule that costs the player something; navy marks a structural
// one. No left-border accent bars — DESIGN.md forbids them.
export function Callout({
  title,
  tickColor = "navy",
  children,
}: {
  title: string;
  tickColor?: "orange" | "navy";
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted p-4">
      <div className="flex items-center gap-2">
        <Tick size="s" color={tickColor} />
        <span className="font-semibold text-[11px] text-foreground uppercase tracking-[0.12em]">
          {title}
        </span>
      </div>
      <p className="text-[13px] text-muted-foreground leading-[1.55]">
        {children}
      </p>
    </div>
  );
}
