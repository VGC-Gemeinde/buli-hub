import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { RegistrationConfirmation } from "@/features/registration/components/registration-confirmation";
import { getRegistration } from "@/features/registration/queries";
import { groupResults, subDivisionResults } from "@/features/reporting/queries";
import { computeStandings } from "@/features/reporting/standings";
import { currentUser } from "@/features/roles/guard";
import { hasSchedule } from "@/features/schedule/queries";
import {
  ComingSoonPanel,
  RegisterCtaPanel,
  SeasonMessagePanel,
} from "@/features/season/components/pre-season";
import { InSeasonDashboard } from "@/features/season/components/season-dashboard";
import {
  buildPlayerMatches,
  currentMatchday,
  dashboardState,
  splitPlayerMatches,
} from "@/features/season/dashboard";
import {
  groupRoster,
  matchdaysForWindow,
  playerPlacement,
  subDivisionMatches,
} from "@/features/season/queries";
import { getSeeding } from "@/features/seeding/queries";
import { subDivisionName } from "@/features/seeding/seeding";
import { latestWindow } from "@/features/staff/queries";
import {
  registrationState,
  SEASON_NAME,
} from "@/features/staff/registration-window";
import { seasonPhase } from "@/features/staff/season-phase";

// Narrow shell with the plain title — used by every non-in-season state.
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <h1 className="mb-9 text-4xl text-brand-blue dark:text-white">
          Spieler-Dashboard
        </h1>
        {children}
      </main>
    </div>
  );
}

export default async function SpielerPage() {
  const current = await currentUser();
  if (!current) {
    redirect("/");
  }

  const window = await latestWindow();
  const state = window ? registrationState(window, new Date()) : "not_started";
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

  const registration = window
    ? await getRegistration(window.id, current.userId)
    : null;
  const placement =
    window && phase === "regular_season"
      ? await playerPlacement(window.id, current.userId)
      : null;

  const view = dashboardState({
    phase,
    registration: state,
    hasRegistration: registration !== null,
    isPlaced: placement !== null,
  });

  if (view === "in_season" && window && placement) {
    const today = new Date().toISOString().slice(0, 10);
    const [members, matchdays, rawMatches, resultByMatchId, standingsResults] =
      await Promise.all([
        groupRoster(placement.subDivisionId),
        matchdaysForWindow(window.id),
        subDivisionMatches(placement.subDivisionId),
        subDivisionResults(placement.subDivisionId),
        groupResults(placement.subDivisionId),
      ]);

    const matchdaysByRound = new Map(
      matchdays.map((d) => [
        d.round,
        { startsOn: d.startsOn, endsOn: d.endsOn },
      ]),
    );
    const rosterById = new Map(members.map((m) => [m.userId, m]));
    const myMatches = buildPlayerMatches({
      matches: rawMatches,
      matchdaysByRound,
      rosterById,
      userId: current.userId,
    });
    const { next } = splitPlayerMatches(myMatches, today);
    const standings = computeStandings({
      roster: members,
      results: standingsResults,
    });
    const totalRounds = matchdays.length;
    const currentRound =
      currentMatchday(matchdays, today)?.round ?? totalRounds;
    const groupName = subDivisionName(placement.tier, placement.position);

    return (
      <div className="flex flex-1 flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-[1040px] flex-1 px-8 pt-11 pb-18">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h1 className="text-[38px] text-brand-blue leading-[1.1] dark:text-white">
              Deine Saison
            </h1>
            <div className="flex items-center gap-2.5">
              <div className="h-[9px] w-[18px] -skew-x-[18deg] bg-brand-orange" />
              <span className="font-bold font-heading text-brand-blue text-xl uppercase tracking-[0.04em] dark:text-white">
                {groupName}
              </span>
              <span className="font-semibold text-[13px] text-muted-foreground uppercase tracking-[0.12em]">
                · {SEASON_NAME}
              </span>
            </div>
          </div>
          <InSeasonDashboard
            groupName={groupName}
            currentRound={currentRound}
            totalRounds={totalRounds}
            next={next}
            matches={myMatches}
            resultByMatchId={resultByMatchId}
            standings={standings}
            meId={current.userId}
            today={today}
          />
        </main>
      </div>
    );
  }

  const closesAt = window?.closesAt ?? null;
  return (
    <Shell>
      {view === "register_cta" ? (
        <RegisterCtaPanel seasonName={SEASON_NAME} />
      ) : view === "registered_open" && registration ? (
        <RegistrationConfirmation
          data={registration}
          canWithdraw
          closesAt={closesAt}
        />
      ) : view === "registered_closed" && registration ? (
        <RegistrationConfirmation
          data={registration}
          canWithdraw={false}
          closesAt={closesAt}
          note="Die Anmeldung ist geschlossen. Du kannst deine Angaben nicht mehr ändern — warte auf deine Paarungen."
        />
      ) : view === "not_registered_closed" ? (
        <SeasonMessagePanel
          title="Du bist in dieser Saison nicht dabei"
          body="Die Anmeldung ist bereits geschlossen. Die nächste Chance kommt — schau im Discord vorbei."
        />
      ) : view === "not_placed" ? (
        <SeasonMessagePanel
          title="Du bist in der laufenden Saison nicht dabei"
          body="Für diese Saison liegt keine Einteilung für dich vor. Die nächste Anmeldung wird im Discord angekündigt."
        />
      ) : (
        <ComingSoonPanel />
      )}
    </Shell>
  );
}
