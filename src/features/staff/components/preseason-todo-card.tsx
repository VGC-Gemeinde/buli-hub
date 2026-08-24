import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CreateScheduleDialog } from "@/features/schedule/components/create-schedule-dialog";
import { emphasisSurface } from "@/lib/emphasis";
import { cn } from "@/lib/utils";

// Everything the schedule dialog needs, plus the summary numbers the card
// shows. Null when the current seeding yields no playable Spieltage.
export type ScheduleSetup = {
  seasonStart: string;
  deadlines: string[];
  groups: number;
  matches: number;
  largest: number;
};

// The pre-season counterpart of the MotW todo card: the one step the closed
// window is waiting for — first the seeding, then the schedule. Same emphasis
// surface and anatomy, so the top of the staff page always reads "this is
// what's next". Never urgent: nothing is overdue before the season exists.
export function PreseasonTodoCard({
  phase,
  scheduleSetup,
}: {
  phase: "registration_closed" | "seeded";
  scheduleSetup: ScheduleSetup | null;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-lg px-5 py-4",
        emphasisSurface("orange"),
      )}
    >
      {phase === "registration_closed" ? (
        <>
          <div className="flex flex-col gap-0.5">
            <p className="font-semibold text-[14.5px]">Divisionen einteilen</p>
            <p className="text-[13px] text-muted-foreground">
              Die Anmeldung ist geschlossen, die Spieler warten auf ihre
              Einteilung.
            </p>
          </div>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-brand-orange/50"
          >
            <Link href="/staff/seeding">Jetzt einteilen</Link>
          </Button>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-0.5">
            <p className="font-semibold text-[14.5px]">Spielplan erstellen</p>
            <p className="text-[13px] text-muted-foreground">
              {scheduleSetup
                ? `${scheduleSetup.groups} Gruppen · ${scheduleSetup.deadlines.length} Spieltage · ${scheduleSetup.matches} Spiele. Die Saison startet mit der Erstellung des Spielplans.`
                : "Für die aktuelle Einteilung lässt sich kein Spielplan berechnen. Prüfe die Divisionen."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-brand-orange/50"
            >
              <Link href="/staff/seeding">Divisionen ansehen</Link>
            </Button>
            {scheduleSetup ? (
              <CreateScheduleDialog
                seasonStart={scheduleSetup.seasonStart}
                defaultDeadlines={scheduleSetup.deadlines}
                largest={scheduleSetup.largest}
                triggerSize="sm"
              />
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
