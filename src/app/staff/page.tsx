import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { listRegistrations } from "@/features/registration/queries";
import { SaisonDashboard } from "@/features/reporting/components/saison-dashboard";
import {
  windowMatchOverview,
  windowResolvedDisputes,
} from "@/features/reporting/queries";
import { bucketMatches } from "@/features/reporting/staff-dashboard";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import { CreateScheduleDialog } from "@/features/schedule/components/create-schedule-dialog";
import { hasSchedule, subDivisionRosters } from "@/features/schedule/queries";
import { defaultDeadlines, spieltagCount } from "@/features/schedule/spieltage";
import {
  currentMatchday,
  type MatchdayLite,
} from "@/features/season/dashboard";
import { matchdaysForWindow } from "@/features/season/queries";
import { getSeeding } from "@/features/seeding/queries";
import {
  PlayerGrid,
  type RegisteredPlayer,
  SeasonCard,
  StaffSectionHeader,
} from "@/features/staff/components/registration-status";
import { latestWindow } from "@/features/staff/queries";
import {
  registrationState,
  SEASON_NAME,
} from "@/features/staff/registration-window";
import { seasonPhase } from "@/features/staff/season-phase";

function ddMM(dateStr: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${dateStr}T00:00:00Z`));
}

// The running-season header strip: identity, progress, and the entry points
// that replace the pre-season Saison/Einteilung sections.
function SeasonStrip({
  currentRound,
  totalRounds,
  week,
}: {
  currentRound: number | null;
  totalRounds: number;
  week: MatchdayLite | null;
}) {
  const pct =
    totalRounds > 0 && currentRound ? (currentRound / totalRounds) * 100 : 0;
  return (
    <div className="flex flex-wrap items-center justify-between gap-6 rounded-lg border px-5.5 py-3.5">
      <div className="flex items-center gap-3">
        <span className="font-bold font-heading text-[22px] text-brand-blue uppercase leading-none dark:text-white">
          {SEASON_NAME}
        </span>
        <div className="h-2 w-4 -skew-x-[18deg] bg-brand-orange" />
        <span className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.12em]">
          Reguläre Saison
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="whitespace-nowrap font-semibold text-[13px] tabular-nums">
          Spieltag {currentRound ?? "—"} von {totalRounds}
        </span>
        <div className="h-1.5 w-32 max-w-full rounded-full bg-muted sm:w-40">
          <div
            className="h-1.5 rounded-full bg-brand-orange"
            style={{ width: `${pct}%` }}
          />
        </div>
        {week ? (
          <span className="whitespace-nowrap text-[13px] text-muted-foreground tabular-nums">
            {ddMM(week.startsOn)} – {ddMM(week.endsOn)}
          </span>
        ) : null}
      </div>
      <Link
        href="/staff/seeding"
        className="font-semibold text-[13.5px] text-brand-blue dark:text-white hover:underline"
      >
        Divisionen
      </Link>
    </div>
  );
}

export default async function StaffPage() {
  const current = await currentUser();
  if (!current || !roleAtLeast(current.role, "staff")) {
    redirect("/");
  }

  const window = await latestWindow();
  const state = registrationState(window, new Date());
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

  // Running season: the /staff page *is* the dashboard — staff lands on their
  // work, no separate page.
  if (phase === "regular_season" && window) {
    const today = new Date().toISOString().slice(0, 10);
    const [overview, matchdays, resolvedDisputes] = await Promise.all([
      windowMatchOverview(window.id),
      matchdaysForWindow(window.id),
      windowResolvedDisputes(window.id),
    ]);
    const week = currentMatchday(matchdays, today);
    const { overdue, thisWeek, pendingFreeWins, disputed } = bucketMatches({
      matches: overview,
      currentRound: week?.round ?? null,
      today,
    });

    return (
      <div className="flex flex-1 flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-[960px] flex-1 px-8 py-12">
          <h1 className="mb-6 text-4xl text-brand-blue dark:text-white">
            Staff-Bereich
          </h1>
          <div className="flex flex-col gap-4.5">
            <SeasonStrip
              currentRound={week?.round ?? null}
              totalRounds={matchdays.length}
              week={week}
            />
            <SaisonDashboard
              overdue={overdue}
              thisWeek={thisWeek}
              pendingFreeWins={pendingFreeWins}
              disputed={disputed}
              resolvedDisputes={resolvedDisputes}
              today={today}
            />
          </div>
        </main>
      </div>
    );
  }

  // Pre-season: registration + seeding management.
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

  let scheduleSetup: {
    seasonStart: string;
    deadlines: string[];
    groups: number;
    matches: number;
    largest: number;
  } | null = null;
  if (phase === "seeded" && window) {
    const rosters = await subDivisionRosters(window.id);
    const sizes = rosters.map((roster) => roster.userIds.length);
    const count = spieltagCount(sizes);
    const seasonStart = new Date().toISOString().slice(0, 10);
    if (count > 0) {
      scheduleSetup = {
        seasonStart,
        deadlines: defaultDeadlines(seasonStart, count),
        groups: rosters.length,
        matches: sizes.reduce((sum, size) => sum + (size * (size - 1)) / 2, 0),
        largest: Math.max(...sizes),
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
              <div className="flex flex-col gap-3">
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
                      largest={scheduleSetup.largest}
                    />
                  ) : null}
                </div>
                {phase === "seeded" && scheduleSetup ? (
                  <p className="text-[13px] text-muted-foreground">
                    {scheduleSetup.groups} Gruppen ·{" "}
                    {scheduleSetup.deadlines.length} Spieltage ·{" "}
                    {scheduleSetup.matches} Spiele — die Saison startet mit der
                    Erstellung des Spielplans.
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
