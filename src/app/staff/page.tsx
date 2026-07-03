import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { listRegistrations } from "@/features/registration/queries";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import { CreateScheduleDialog } from "@/features/schedule/components/create-schedule-dialog";
import { hasSchedule, subDivisionRosters } from "@/features/schedule/queries";
import { defaultDeadlines, spieltagCount } from "@/features/schedule/spieltage";
import { getSeeding } from "@/features/seeding/queries";
import {
  PlayerGrid,
  type RegisteredPlayer,
  SeasonCard,
  StaffSectionHeader,
} from "@/features/staff/components/registration-status";
import { latestWindow } from "@/features/staff/queries";
import { registrationState } from "@/features/staff/registration-window";
import { seasonPhase } from "@/features/staff/season-phase";

export default async function StaffPage() {
  const current = await currentUser();
  if (!current || !roleAtLeast(current.role, "staff")) {
    redirect("/");
  }

  const window = await latestWindow();
  const state = registrationState(window, new Date());
  // Browsers omit the Origin header on same-origin GET navigations, so
  // derive it from Host + forwarded protocol instead.
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const registrationUrl = `${protocol}://${host}/anmeldung`;

  const players: RegisteredPlayer[] = window
    ? (await listRegistrations(window.id)).map((row) => ({
        id: row.id,
        name: row.displayName ?? row.username ?? "Unbekannt",
        avatarUrl: row.avatarUrl ?? undefined,
      }))
    : [];

  // Once the seeding is finalized, the seeding page renders read-only — the
  // entry point says „ansehen" rather than „einteilen". Once a schedule exists
  // the season is running and the schedule entry gives way to the dashboard.
  const seeding =
    window && state === "closed" ? await getSeeding(window.id) : null;
  const seedingFinalized = Boolean(seeding?.finalizedAt);
  const scheduleExists =
    window && seedingFinalized ? await hasSchedule(window.id) : false;
  const phase = seasonPhase({
    registration: state,
    seedingFinalized,
    hasSchedule: scheduleExists,
  });

  // Inputs for the „Spielplan erstellen" dialog, only while seeded: the default
  // weekly deadlines derived from the largest group and today's season start.
  let scheduleSetup: { seasonStart: string; deadlines: string[] } | null = null;
  if (phase === "seeded" && window) {
    const rosters = await subDivisionRosters(window.id);
    const count = spieltagCount(rosters.map((roster) => roster.userIds.length));
    const seasonStart = new Date().toISOString().slice(0, 10);
    if (count > 0) {
      scheduleSetup = {
        seasonStart,
        deadlines: defaultDeadlines(seasonStart, count),
      };
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[960px] flex-1 px-8 py-12">
        <h1 className="mb-9 text-4xl text-brand-blue dark:text-white">
          Staff-Bereich
        </h1>
        <div className="flex flex-col gap-10">
          <section className="flex flex-col gap-5">
            <StaffSectionHeader title="Saison" />
            <SeasonCard
              state={state}
              registrationUrl={registrationUrl}
              closesAt={window?.closesAt ?? null}
              statusLabel={
                phase === "regular_season" ? "Reguläre Saison läuft" : undefined
              }
              accent={phase === "regular_season"}
            />
          </section>

          {state !== "not_started" ? (
            <section className="flex flex-col gap-5">
              <StaffSectionHeader
                title="Anmeldungen"
                meta={`${players.length} gesamt`}
              />
              <PlayerGrid players={players} />
            </section>
          ) : null}

          {state === "closed" ? (
            <section className="flex flex-col gap-5">
              <StaffSectionHeader title="Einteilung & Spielplan" />
              <div className="flex flex-wrap gap-3">
                <Button
                  asChild
                  variant={seedingFinalized ? "outline" : "default"}
                >
                  <Link href="/staff/seeding">
                    {seedingFinalized
                      ? "Divisionen ansehen"
                      : "Divisionen einteilen"}
                  </Link>
                </Button>
                {phase === "seeded" && scheduleSetup ? (
                  <CreateScheduleDialog
                    seasonStart={scheduleSetup.seasonStart}
                    defaultDeadlines={scheduleSetup.deadlines}
                  />
                ) : null}
              </div>
            </section>
          ) : null}

          {phase === "regular_season" ? (
            <section className="flex flex-col gap-5">
              <StaffSectionHeader title="Reguläre Saison" />
              <div className="rounded-lg border px-6 py-5">
                <p className="text-muted-foreground">
                  Die reguläre Saison läuft. Das Dashboard mit Spielplan,
                  Ergebnissen und Tabellen folgt in Kürze.
                </p>
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
