import { Tick } from "@/components/tick";
import {
  type CancelCandidate,
  CancelRegistrationDialog,
} from "./cancel-registration-dialog";

// The staff panel on the public player profile between Anmeldeschluss and
// finalized seeding — same anatomy as the drop panel that takes its place once
// the player is placed in the running season. One action: cancel the
// registration (type-to-confirm).
export function ProfileCancelPanel({
  player,
  seasonName,
}: {
  player: CancelCandidate;
  seasonName: string;
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
        <div className="min-w-0">
          <p className="font-semibold text-sm">Anmeldung stornieren</p>
          <p className="text-[13px] text-muted-foreground">
            Löscht die Anmeldung für {seasonName} endgültig.
          </p>
        </div>
        <CancelRegistrationDialog
          player={player}
          seasonName={seasonName}
          triggerSize="sm"
        />
      </div>
    </section>
  );
}
