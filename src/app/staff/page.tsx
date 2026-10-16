import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { SectionHeader } from "@/components/section-header";
import { Tick } from "@/components/tick";
import { DiscordSyncButton } from "@/features/discord-season/components/sync-button";
import { seasonDiscordConfig } from "@/features/discord-season/config";
import { getSyncState } from "@/features/discord-season/queries";
import {
  cardView,
  needsAttention,
  skipReasonLabel,
} from "@/features/discord-season/report";
import { listDrops } from "@/features/drops/queries";
import { bucketMembership } from "@/features/membership/membership";
import { registeredMembership } from "@/features/membership/queries";
import { sweepGuildMemberships } from "@/features/membership/sweep";
import { motwTodo, weekNames } from "@/features/motw/motw";
import { motwForWindow } from "@/features/motw/queries";
import { staleHolds, staleHoldsSummary } from "@/features/recordings/holds";
import { holdsForWindow } from "@/features/recordings/queries";
import { listRegistrations } from "@/features/registration/queries";
import { windowMatchOverview } from "@/features/reporting/queries";
import { bucketMatches } from "@/features/reporting/staff-dashboard";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import { CreateRelegationPlayoffsDialog } from "@/features/schedule/components/create-relegation-playoffs-dialog";
import { CreateScheduleDialog } from "@/features/schedule/components/create-schedule-dialog";
import { PublishScheduleDialog } from "@/features/schedule/components/publish-schedule-dialog";
import { subDivisionRosters } from "@/features/schedule/queries";
import { relegationPlayoffsSetupDue } from "@/features/schedule/relegation-playoffs";
import {
  relegationPlayoffsSetup,
  relegationPlayoffsSides,
  relegationPlayoffsState,
  seasonCompletionState,
} from "@/features/schedule/relegation-playoffs-setup";
import { sidesChanged } from "@/features/schedule/relegation-playoffs-sides";
import { defaultDeadlines, spieltagCount } from "@/features/schedule/spieltage";
import {
  currentMatchday,
  type MatchdayLite,
} from "@/features/season/dashboard";
import {
  allMatchdaysForWindow,
  matchdaysForWindow,
} from "@/features/season/queries";
import { SeasonCard } from "@/features/staff/components/registration-status";
import { StaffPage } from "@/features/staff/components/staff-page";
import { StatTile } from "@/features/staff/components/stat-tile";
import { TodoList } from "@/features/staff/components/todo-list";
import { latestWindow, windowSeasonPhase } from "@/features/staff/queries";
import { seasonName } from "@/features/staff/registration-window";
import { staffTodos, type TodoFacts } from "@/features/staff/todos";
import {
  formatGermanDateTime,
  formatGermanDay,
  germanToday,
} from "@/lib/german-time";

function ddMM(dateStr: string): string {
  return formatGermanDay(dateStr, { day: "2-digit", month: "2-digit" });
}

// The running season beside the title: which season, which phase, how far.
function SeasonStrip({
  season,
  label,
  progress,
  week,
}: {
  season: string;
  label: string;
  // "Spieltag 3 von 7", "Woche 1 von 2" and how far along; null once the
  // season is complete.
  progress: { text: string; share: number } | null;
  week: MatchdayLite | null;
}) {
  return (
    <div className="flex flex-col gap-1.5 sm:items-end">
      <div className="flex items-center gap-2.5">
        <span className="font-bold font-heading text-[18px] text-brand-blue uppercase leading-none dark:text-white">
          {season}
        </span>
        <Tick size="s" />
        <span className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.12em]">
          {label}
        </span>
      </div>
      {progress ? (
        <div className="flex items-center gap-2.5">
          <span className="whitespace-nowrap font-semibold text-[12.5px] tabular-nums">
            {progress.text}
          </span>
          <div className="h-1.5 w-28 rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-brand-orange"
              style={{ width: `${progress.share * 100}%` }}
            />
          </div>
          {week ? (
            <span className="whitespace-nowrap text-[12.5px] text-muted-foreground tabular-nums">
              {ddMM(week.startsOn)} – {ddMM(week.endsOn)}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Blocks({
  todos,
  week,
  season,
}: {
  todos: ReactNode;
  week?: { meta: string; tiles: ReactNode };
  season: { tiles: ReactNode };
}) {
  return (
    <>
      <section className="flex flex-col gap-3">
        <SectionHeader>Zu erledigen</SectionHeader>
        {todos}
      </section>
      {/* The week and the season side by side on desktop, so the numbers
          stay on the first screen even under a long todo list. */}
      <div
        className={
          week
            ? "grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-7"
            : "grid grid-cols-1"
        }
      >
        {week ? (
          <section className="flex flex-col gap-3">
            <SectionHeader meta={week.meta}>Diese Woche</SectionHeader>
            <div className="grid grid-cols-2 gap-3">{week.tiles}</div>
          </section>
        ) : null}
        <section className="flex flex-col gap-3">
          <SectionHeader>Saison</SectionHeader>
          <div
            className={
              week
                ? "grid grid-cols-2 gap-3"
                : "grid grid-cols-2 gap-3 sm:grid-cols-4"
            }
          >
            {season.tiles}
          </div>
        </section>
      </div>
    </>
  );
}

// The Staff-Bereich overview (docs/plans/staff-dashboard.md): concrete
// problems as todos, everything normal as numbers, full lists on the pages
// the staff tab bar leads to.
export default async function StaffOverviewPage() {
  const current = await currentUser();
  if (!current || !roleAtLeast(current.role, "staff")) {
    redirect("/");
  }

  const window = await latestWindow();
  const { phase, registration: state } = window
    ? await windowSeasonPhase(window)
    : {
        phase: "not_started" as const,
        registration: "not_started" as const,
      };

  // Membership of the registered roster, freshly swept (one Discord call,
  // fail-open). Dropped players are not on this roster.
  const roster = window
    ? await sweepGuildMemberships(window.id).then(() =>
        registeredMembership(window.id),
      )
    : [];
  const { nonMembers, unchecked } = bucketMembership(roster);

  const noTodos: Omit<TodoFacts, "phase"> = {
    overdue: 0,
    disputedMatchIds: [],
    pendingFreeWins: 0,
    staleRecordings: null,
    motw: null,
    publish: null,
    discord: null,
    nonMembers: nonMembers.length,
    scheduleSetup: null,
    relegationPlayoffsSetup: null,
    motwLineUpChanged: null,
    relegationPlayoffsPublish: null,
    tieOrdersOpen: 0,
    seasonCompletable: false,
  };

  // Running season: the schedule exists (published or still internal).
  if ((phase === "regular_season" || phase === "schedule_hidden") && window) {
    const today = germanToday();
    const [overview, matchdays, allWeeks, motwSelections, holds, drops] =
      await Promise.all([
        windowMatchOverview(window.id),
        matchdaysForWindow(window.id),
        allMatchdaysForWindow(window.id),
        motwForWindow(window.id),
        holdsForWindow(window.id),
        listDrops(window.id),
      ]);
    const week = currentMatchday(matchdays, today);
    // The Match of the Week and the recordings run on through the weeks of
    // Relegation und Playoffs, so they count every week.
    const anyWeekDay = currentMatchday(allWeeks, today);
    const anyWeek = anyWeekDay?.round ?? null;
    // The running week after the regular season, from 1.
    const afterWeeks = allWeeks.length - matchdays.length;
    const afterWeek =
      week === null && anyWeek !== null && anyWeek > matchdays.length
        ? anyWeek - matchdays.length
        : null;
    const names = weekNames(allWeeks);
    const { overdue, thisWeek, pendingFreeWins, disputed } = bucketMatches({
      matches: overview,
      currentRound: week?.round ?? null,
      today,
    });
    const weekOpen = thisWeek.filter((match) => match.outcome === null);

    const outcomeById = new Map(overview.map((m) => [m.matchId, m.outcome]));
    const staleRecordings = staleHoldsSummary(
      staleHolds(
        holds.map((hold) => ({
          ...hold,
          reported: (outcomeById.get(hold.matchId) ?? null) !== null,
        })),
        anyWeek,
      ),
    );

    // After the last Spieltag: publishing Relegation und Playoffs, and then
    // the staff orders it leaves to decide.
    let relegationPlayoffsPublish: TodoFacts["relegationPlayoffsPublish"] =
      null;
    let tieOrdersOpen = 0;
    if (phase === "regular_season" && week === null) {
      const after = await relegationPlayoffsState(window.id);
      if (after.kind === "created") {
        if (after.blockers !== null) {
          relegationPlayoffsPublish = { openPoints: after.blockers.length };
        }
        tieOrdersOpen = after.staffOrders.filter((tie) => !tie.decided).length;
      }
    }
    const completion =
      phase === "regular_season" && week === null
        ? await seasonCompletionState(window.id)
        : null;
    const seasonDone = completion?.completed ?? false;
    const seasonCompletable =
      completion !== null &&
      !completion.completed &&
      completion.blockers.length === 0;

    // Relegation or playoff candidates whose line-up moved since nomination.
    const snapshots = holds.filter(
      (hold) => hold.motwRole !== null && hold.nominatedSides !== null,
    );
    let motwLineUpChanged: TodoFacts["motwLineUpChanged"] = null;
    if (snapshots.length > 0) {
      const { matches: sides } = await relegationPlayoffsSides(window.id);
      const changed = snapshots.filter((hold) => {
        const current = sides.find((m) => m.matchId === hold.matchId);
        return (
          current !== undefined &&
          hold.nominatedSides !== null &&
          sidesChanged(hold.nominatedSides, current)
        );
      });
      if (changed.length > 0) {
        const round = Math.min(...changed.map((hold) => hold.round));
        motwLineUpChanged = {
          count: changed.length,
          round,
          name: names.get(round)?.name ?? `Spieltag ${round}`,
        };
      }
    }

    // schedule_hidden: what the publish puts live. The overview excludes
    // byes, so its length is the real match count.
    const sortedDays = [...matchdays].sort((a, b) => a.round - b.round);
    const publishFacts =
      phase === "schedule_hidden" && sortedDays.length > 0
        ? {
            rounds: sortedDays.length,
            matches: overview.length,
            groups: new Set(overview.map((m) => m.groupName)).size,
            firstDeadline: sortedDays[0].endsOn,
            lastDeadline: sortedDays[sortedDays.length - 1].endsOn,
          }
        : null;

    // From the second-to-last Spieltag on: the Relegation und Playoffs
    // schedule, while it is still to create.
    const afterSetup =
      phase === "regular_season" &&
      relegationPlayoffsSetupDue({
        currentRound: week?.round ?? null,
        totalRounds: matchdays.length,
      })
        ? await relegationPlayoffsSetup(window.id)
        : null;

    // The Discord sync, only while the stored report says the server does
    // not match the league. The page never talks to Discord for it.
    const syncState =
      phase === "regular_season" && seasonDiscordConfig() !== null
        ? await getSyncState(window.id)
        : undefined;
    const now = new Date();
    const view =
      syncState !== undefined && needsAttention(syncState, now)
        ? cardView(syncState, now)
        : null;
    const ranAt = (date: Date) =>
      formatGermanDateTime(date, {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });

    const todos = staffTodos({
      ...noTodos,
      phase,
      overdue: overdue.length,
      disputedMatchIds: disputed.map((match) => match.matchId),
      pendingFreeWins: pendingFreeWins.length,
      staleRecordings,
      motwLineUpChanged,
      relegationPlayoffsPublish,
      tieOrdersOpen,
      seasonCompletable,
      // A completed season has no Match of the Week left to pick.
      motw: seasonDone
        ? null
        : motwTodo({
            currentRound: anyWeek,
            totalRounds: allWeeks.length,
            weekName: (round) => names.get(round)?.name ?? `Spieltag ${round}`,
            confirmedRounds: new Set(motwSelections.map((s) => s.round)),
            candidateRounds: new Set(
              holds
                .filter((h) => h.motwRole !== null)
                .map((hold) => hold.round),
            ),
          }),
      publish: publishFacts,
      relegationPlayoffsSetup: afterSetup
        ? {
            weeks: afterSetup.weekContents.length,
            matches: afterSetup.relegationMatches + afterSetup.playoffMatches,
          }
        : null,
      discord:
        view === null
          ? null
          : view.kind === "never"
            ? { kind: "never" }
            : view.kind === "stale"
              ? { kind: "stale", ranAtText: ranAt(view.ranAt) }
              : {
                  kind: "attention",
                  summary: `${view.groups.ready} von ${view.groups.total} Gruppen mit Rolle und Kanal · ${view.players.ready} von ${view.players.total} Spielern mit beiden Rollen · Letzter Abgleich: ${ranAt(view.ranAt)}`,
                  lines: [
                    ...(view.error ? [view.error] : []),
                    ...view.skipped.map(
                      (entry) =>
                        `${entry.name}: ${skipReasonLabel(entry.reason)}`,
                    ),
                  ],
                },
    });

    const reported = thisWeek.length - weekOpen.length;
    const settledRounds = week ? week.round - 1 : matchdays.length;
    return (
      <StaffPage
        title="Staff-Bereich"
        action={
          <SeasonStrip
            season={seasonName(window.seasonNumber)}
            label={
              phase === "schedule_hidden"
                ? "Spielplan intern"
                : seasonDone
                  ? "Saison abgeschlossen"
                  : afterWeek !== null
                    ? "Relegation und Playoffs"
                    : "Reguläre Saison"
            }
            progress={
              seasonDone
                ? null
                : afterWeek !== null
                  ? {
                      text: `Woche ${afterWeek} von ${afterWeeks}`,
                      share: afterWeek / afterWeeks,
                    }
                  : {
                      text: `Spieltag ${week?.round ?? "—"} von ${matchdays.length}`,
                      share:
                        week && matchdays.length > 0
                          ? week.round / matchdays.length
                          : 0,
                    }
            }
            week={week ?? (afterWeek !== null ? anyWeekDay : null)}
          />
        }
      >
        <div className="flex flex-col gap-8">
          <Blocks
            todos={
              <TodoList
                todos={todos}
                renderControl={(action) =>
                  action.kind === "discord_sync" ? (
                    <DiscordSyncButton />
                  ) : action.kind === "publish_schedule" && publishFacts ? (
                    <PublishScheduleDialog
                      facts={publishFacts}
                      triggerSize="sm"
                    />
                  ) : action.kind === "create_relegation_playoffs_schedule" &&
                    afterSetup ? (
                    <CreateRelegationPlayoffsDialog
                      {...afterSetup}
                      triggerSize="sm"
                    />
                  ) : null
                }
              />
            }
            week={{
              meta: week
                ? `Spieltag ${week.round} · bis ${ddMM(week.endsOn)}`
                : "Saison beendet",
              tiles: (
                <>
                  <StatTile
                    value={weekOpen.length}
                    label="Offen"
                    href="/staff/woche#spieltag"
                  />
                  <StatTile
                    value={reported}
                    sub={`von ${thisWeek.length}`}
                    label="Gemeldet"
                    href="/staff/woche#spieltag"
                  />
                  <StatTile
                    value={overdue.length}
                    label="Überfällig"
                    href="/staff/woche#ueberfaellig"
                    alert
                  />
                  <StatTile
                    value={disputed.length}
                    label="Angefochten"
                    href="/staff/woche#angefochten"
                    alert
                  />
                </>
              ),
            }}
            season={{
              tiles: (
                <>
                  <StatTile
                    value={roster.length}
                    label="Spieler"
                    href="/staff/teilnehmer"
                  />
                  <StatTile
                    value={drops.length}
                    label="Drops"
                    href="/staff/teilnehmer?filter=dropped"
                  />
                  <StatTile
                    value={nonMembers.length}
                    label="Nicht auf dem Server"
                    href="/staff/teilnehmer?filter=not_on_server"
                  />
                  <StatTile
                    value={motwSelections.length}
                    sub={`von ${settledRounds}`}
                    label="MotW bestätigt"
                    href="/staff/motw"
                  />
                </>
              ),
            }}
          />
        </div>
      </StaffPage>
    );
  }

  // Pre-season: registration, seeding, schedule.
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const registrationUrl = `${protocol}://${host}/anmeldung`;
  const registrations = window ? await listRegistrations(window.id) : [];

  let scheduleSetup: {
    seasonStart: string;
    deadlines: string[];
    groups: number;
    matches: number;
    largest: number;
  } | null = null;
  if (phase === "seeded" && window) {
    const rosters = await subDivisionRosters(window.id);
    const sizes = rosters.map((r) => r.userIds.length);
    const count = spieltagCount(sizes);
    const seasonStart = germanToday();
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

  const todos = staffTodos({
    ...noTodos,
    phase,
    scheduleSetup: scheduleSetup
      ? {
          groups: scheduleSetup.groups,
          rounds: scheduleSetup.deadlines.length,
          matches: scheduleSetup.matches,
        }
      : null,
  });
  return (
    <StaffPage title="Staff-Bereich">
      <div className="flex flex-col gap-8">
        <SeasonCard
          state={state}
          season={window ? seasonName(window.seasonNumber) : null}
          registrationUrl={registrationUrl}
          closesAt={window?.closesAt ?? null}
        />
        {window ? (
          <Blocks
            todos={
              <TodoList
                todos={todos}
                renderControl={(action) =>
                  action.kind === "create_schedule" && scheduleSetup ? (
                    <CreateScheduleDialog
                      seasonStart={scheduleSetup.seasonStart}
                      defaultDeadlines={scheduleSetup.deadlines}
                      largest={scheduleSetup.largest}
                      triggerSize="sm"
                    />
                  ) : null
                }
              />
            }
            season={{
              tiles: (
                <>
                  <StatTile
                    value={registrations.length}
                    label="Anmeldungen"
                    href="/staff/teilnehmer"
                  />
                  <StatTile
                    value={
                      registrations.filter((r) => r.status === "new").length
                    }
                    label="Neu dabei"
                    href="/staff/teilnehmer"
                  />
                  <StatTile
                    value={nonMembers.length}
                    label="Nicht auf dem Server"
                    href="/staff/teilnehmer?filter=not_on_server"
                  />
                  <StatTile
                    value={unchecked.length}
                    label="Nicht geprüft"
                    href="/staff/teilnehmer?filter=unchecked"
                  />
                </>
              ),
            }}
          />
        ) : null}
      </div>
    </StaffPage>
  );
}
