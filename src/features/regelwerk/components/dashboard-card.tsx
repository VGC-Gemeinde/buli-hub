import { ActionLink } from "@/components/links";
import { Tick } from "@/components/tick";
import { seasonName } from "@/features/staff/registration-window";

// In-season lookup entry point (design §3.3). Deliberately quiet — a player
// mid-season needs the rules findable, not advertised, so this is a side card
// and never a CTA.
export function RegelwerkCard({ seasonNumber }: { seasonNumber: number }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex items-center gap-2">
        <Tick size="s" color="neutral" />
        <span className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.12em]">
          {seasonName(seasonNumber)}
        </span>
      </div>
      <span className="font-bold font-heading text-[17px] text-brand-blue uppercase tracking-[0.02em] dark:text-white">
        Regelwerk
      </span>
      <p className="text-[13px] text-muted-foreground leading-[1.55]">
        Deadlines, Punkte, Tiebreaker und was bei Nichtantreten gilt.
      </p>
      <ActionLink href="/regelwerk" className="mt-1 text-[13px]">
        Regelwerk öffnen
      </ActionLink>
    </div>
  );
}
