"use client";

import { Tick } from "@/components/tick";
import type { DropCandidate } from "../queries";
import { DropPlayerDialog, UndropButton } from "./drops-section";

// The staff panel on the public player profile — same anatomy as the match
// page's staff panel (navy card, "Nur für Staff sichtbar"). One action: drop
// the player (reason + type-to-confirm), or lift an existing drop.
export function ProfileStaffPanel({
  player,
  dropped,
  dropReason,
}: {
  player: DropCandidate;
  dropped: boolean;
  dropReason: string | null;
}) {
  return (
    <section className="mt-12 rounded-xl border border-brand-blue/25 bg-brand-blue/[0.03] px-6 pt-5 pb-2 dark:bg-muted/20">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Tick size="m" color="navy" />
          <h2 className="font-bold font-heading text-brand-blue text-xl uppercase tracking-[0.03em] dark:text-white">
            Staff
          </h2>
        </div>
        <span className="font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.12em]">
          Nur für Staff sichtbar
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 border-brand-blue/10 border-t py-3.5">
        {dropped ? (
          <>
            <div className="min-w-0">
              <p className="font-semibold text-sm">Gedroppt</p>
              <p className="truncate text-[13px] text-muted-foreground">
                {dropReason
                  ? `"${dropReason}" · Aufheben stellt alle Ergebnisse wieder her.`
                  : "Aufheben stellt alle Ergebnisse wieder her."}
              </p>
            </div>
            <UndropButton userId={player.userId} />
          </>
        ) : (
          <>
            <div className="min-w-0">
              <p className="font-semibold text-sm">Spieler droppen</p>
              <p className="text-[13px] text-muted-foreground">
                Alle Matches zählen als Freewin (2:0) für die Gegner.
              </p>
            </div>
            <DropPlayerDialog fixed={player} triggerSize="sm" />
          </>
        )}
      </div>
    </section>
  );
}
