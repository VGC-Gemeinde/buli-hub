import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { PublishBlocker } from "../relegation-playoffs-publish";
import type { StaffOrderTie } from "../relegation-playoffs-setup";
import { PublishRelegationPlayoffsDialog } from "./publish-relegation-playoffs-dialog";
import { TieOrderForm } from "./tie-order-form";

// Before publishing: what still blocks it, with links, and the one button.
// The consequence stands next to the button, not only in the dialog.
export function PublishPanel({
  blockers,
  counts,
}: {
  blockers: PublishBlocker[];
  counts: { relegation: number; playoffs: number; tiebreakers: number };
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border px-5 py-4">
      {blockers.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.12em]">
            Vorher klären
          </span>
          <ul className="flex flex-col gap-1.5">
            {blockers.map((blocker) => (
              <li key={blocker.kind} className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-orange font-bold text-[12px] text-white"
                >
                  !
                </span>
                <Link
                  href={blocker.href}
                  className="text-[14px] underline-offset-[3px] hover:underline"
                >
                  {blocker.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="font-semibold text-[14px]">
          Alles geklärt. Relegation und Playoffs können veröffentlicht werden.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-4">
        {blockers.length === 0 ? (
          <PublishRelegationPlayoffsDialog facts={counts} />
        ) : (
          <Button type="button" disabled>
            Relegation und Playoffs veröffentlichen
          </Button>
        )}
        <span className="text-[13px] text-muted-foreground">
          Danach sind alle Ergebnisse der regulären Saison endgültig.
        </span>
      </div>
    </div>
  );
}

// After publishing: the shared places of three or more, ordered by staff
// after their own tiebreaker tournament.
export function StaffOrders({ ties }: { ties: StaffOrderTie[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {ties.map((tie) => (
        <div
          key={tie.tieKey}
          className="flex flex-col gap-3 rounded-xl border px-5 py-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-[14px] uppercase">
              {tie.tableName}
            </span>
            <span
              className={
                tie.decided
                  ? "rounded-full bg-muted px-2.5 py-0.5 font-semibold text-[11px] uppercase tracking-[0.08em]"
                  : "rounded-full bg-brand-orange px-2.5 py-0.5 font-semibold text-[11px] text-white uppercase tracking-[0.08em]"
              }
            >
              {tie.decided ? "Festgelegt" : "Reihenfolge nötig"}
            </span>
          </div>
          <TieOrderForm
            tieKey={tie.tieKey}
            players={tie.players}
            placeLabels={tie.placeLabels}
            initialReason={tie.reason}
          />
        </div>
      ))}
    </div>
  );
}
