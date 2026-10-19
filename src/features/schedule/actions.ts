"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { syncSeasonDiscord } from "@/features/discord-season/converge";
import { loadFinalTables } from "@/features/final-table/queries";
import { playerWrites } from "@/features/playoffs/progression";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import { matchdaysForWindow } from "@/features/season/queries";
import { validatePostSeason } from "@/features/seeding/post-season";
import {
  divisionsWithGroupSizes,
  getSeeding,
} from "@/features/seeding/queries";
import { latestWindow, windowSeasonPhase } from "@/features/staff/queries";
import { registrationState } from "@/features/staff/registration-window";
import { germanToday } from "@/lib/german-time";
import {
  hasRelegationPlayoffsSchedule,
  hasSchedule,
  markSchedulePublished,
  persistPublication,
  persistRelegationPlayoffsSchedule,
  persistSchedule,
  persistSeasonCompletion,
  SEASON_COMPLETED_ERROR,
  saveTieOrder,
  seasonCompleted,
  subDivisionRosters,
  tiedPlayersHavePlayed,
} from "./queries";
import {
  relegationPlayoffsMatches,
  relegationPlayoffsWeeks,
} from "./relegation-playoffs";
import {
  publishBlockers,
  tiebreakersToCreate,
} from "./relegation-playoffs-publish";
import {
  publishFacts,
  relegationPlayoffsResolved,
  seasonCompletionState,
  syncSeats,
} from "./relegation-playoffs-setup";
import { generateRoundRobin } from "./round-robin";
import {
  dayAfter,
  spieltagCount,
  spieltagDeadlinesSchema,
  windowsFromDeadlines,
} from "./spieltage";

export type ScheduleResult = { ok: true } | { ok: false; error: string };

// Generates the season's single round-robin per sub-division from a finalized
// seeding and stores the Spieltag calendar. Terminal and one-shot: only while
// the seeding is finalized and no schedule exists yet; the season then runs.
export async function createSchedule(input: {
  deadlines: unknown;
}): Promise<ScheduleResult> {
  const current = await currentUser();
  if (!current || !roleAtLeast(current.role, "staff")) {
    return { ok: false, error: "Keine Berechtigung" };
  }

  const window = await latestWindow();
  if (!window || registrationState(window, new Date()) !== "closed") {
    return { ok: false, error: "Nicht möglich" };
  }

  const seeding = await getSeeding(window.id);
  if (!seeding?.finalizedAt) {
    return {
      ok: false,
      error: "Die Einteilung muss zuerst finalisiert werden",
    };
  }

  if (await hasSchedule(window.id)) {
    return { ok: false, error: "Der Spielplan wurde bereits erstellt" };
  }

  const rosters = await subDivisionRosters(window.id);
  const expected = spieltagCount(
    rosters.map((roster) => roster.userIds.length),
  );
  if (expected === 0) {
    return { ok: false, error: "Zu wenige Spieler für einen Spielplan" };
  }

  const parsed = spieltagDeadlinesSchema.safeParse(input.deadlines);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe",
    };
  }
  const deadlines = parsed.data;

  if (deadlines.length !== expected) {
    return {
      ok: false,
      error: "Die Anzahl der Spieltage passt nicht zur Einteilung",
    };
  }

  // The season starts on generation; week 1's deadline must be after it.
  const seasonStart = germanToday();
  if (deadlines[0] <= seasonStart) {
    return {
      ok: false,
      error: "Der erste Spieltag muss nach dem Saisonstart enden",
    };
  }

  const windows = windowsFromDeadlines(seasonStart, deadlines);
  const matchRows = rosters.flatMap((roster) =>
    generateRoundRobin(roster.userIds).flatMap((pairings, roundIndex) =>
      pairings.map((pairing) => ({
        subDivisionId: roster.subDivisionId,
        round: roundIndex + 1,
        playerAId: pairing.a,
        playerBId: pairing.b,
      })),
    ),
  );

  await persistSchedule(window.id, windows, matchRows);
  revalidatePath("/staff");
  return { ok: true };
}

// Makes the generated schedule visible to players — the season flips from
// schedule_hidden to regular_season everywhere at once. Terminal like the
// steps before it: the timestamp is set once, there is no unpublish.
export async function publishSchedule(): Promise<ScheduleResult> {
  const current = await currentUser();
  if (!current || !roleAtLeast(current.role, "staff")) {
    return { ok: false, error: "Keine Berechtigung" };
  }

  const window = await latestWindow();
  if (!window) {
    return { ok: false, error: "Nicht möglich" };
  }
  if (!(await hasSchedule(window.id))) {
    return { ok: false, error: "Der Spielplan wurde noch nicht erstellt" };
  }
  if (window.schedulePublishedAt !== null) {
    return { ok: false, error: "Die Pairings wurden bereits veröffentlicht" };
  }

  await markSchedulePublished(window.id);
  // The whole app changes at once: landing → Liga-Übersicht, header nav,
  // Spieler-Dashboard, profile, staff hub.
  revalidatePath("/", "layout");
  // Then the Discord server follows: group roles, group channels, player
  // roles. Best-effort and after the publish, so it can neither delay nor
  // block the season; whatever it does not manage, the periodic sync and
  // the staff card's button finish (docs/plans/discord-season-setup.md).
  await syncSeasonDiscord(window.id);
  return { ok: true };
}

// "Spielplan für Relegation und Playoffs erstellen"
// (docs/plans/relegation-and-playoffs.md): the weeks after the last Spieltag
// and every Relegation and playoff match in them, players still unknown.
// Staff only, while the regular season runs, once. Nothing of it reaches
// players until the pairings are published.
export async function createRelegationPlayoffsSchedule(input: {
  deadlines: unknown;
}): Promise<ScheduleResult> {
  const current = await currentUser();
  if (!current || !roleAtLeast(current.role, "staff")) {
    return { ok: false, error: "Keine Berechtigung" };
  }

  const window = await latestWindow();
  if (!window || (await windowSeasonPhase(window)).phase !== "regular_season") {
    return {
      ok: false,
      error: "Erst wenn der Spielplan der Saison veröffentlicht ist",
    };
  }
  if (await hasRelegationPlayoffsSchedule(window.id)) {
    return { ok: false, error: "Der Spielplan wurde bereits erstellt" };
  }

  const divisions = await divisionsWithGroupSizes(window.id);
  if (
    validatePostSeason(divisions).some(
      (issue) => issue.kind === "relegation_unbalanced",
    )
  ) {
    return {
      ok: false,
      error:
        "Die Relegationsplätze der Einteilung gehen nicht auf, so lässt sich keine Relegation spielen",
    };
  }

  const parsed = spieltagDeadlinesSchema.safeParse(input.deadlines);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe",
    };
  }
  const deadlines = parsed.data;
  if (deadlines.length !== relegationPlayoffsWeeks(divisions)) {
    return {
      ok: false,
      error: "Die Anzahl der Wochen passt nicht zur Einteilung",
    };
  }

  const regular = await matchdaysForWindow(window.id);
  const last = regular[regular.length - 1];
  if (!last) {
    return { ok: false, error: "Nicht möglich" };
  }
  if (deadlines[0] <= last.endsOn) {
    return {
      ok: false,
      error: "Die erste Woche muss nach dem letzten Spieltag enden",
    };
  }

  await persistRelegationPlayoffsSchedule({
    windowId: window.id,
    firstRound: last.round + 1,
    windows: windowsFromDeadlines(dayAfter(last.endsOn), deadlines),
    matchRows: relegationPlayoffsMatches(divisions),
  });
  revalidatePath("/staff");
  revalidatePath("/staff/spielplan");
  revalidatePath("/staff/relegation-playoffs");
  return { ok: true };
}

// "Relegation und Playoffs veröffentlichen" (docs/plans/relegation-and-playoffs.md):
// the regular season's results become final, the tiebreakers are created,
// every known seat is written into its match, and all of it goes public.
// Staff only, once, and only when nothing of the regular season is open.
export async function publishRelegationPlayoffs(): Promise<ScheduleResult> {
  const current = await currentUser();
  if (!current || !roleAtLeast(current.role, "staff")) {
    return { ok: false, error: "Keine Berechtigung" };
  }
  const window = await latestWindow();
  if (!window || (await windowSeasonPhase(window)).phase !== "regular_season") {
    return { ok: false, error: "Nicht möglich" };
  }
  if (window.regularSeasonClosedAt !== null) {
    return {
      ok: false,
      error: "Relegation und Playoffs sind bereits veröffentlicht",
    };
  }
  const blockers = publishBlockers(
    await publishFacts(window.id, germanToday()),
  );
  if (blockers.length > 0) {
    return {
      ok: false,
      error: `Erst klären: ${blockers.map((b) => b.label).join(", ")}.`,
    };
  }

  // Nothing is decided yet: the seats are the table's, ties stay open.
  const [state, { tablesByTier }] = await Promise.all([
    relegationPlayoffsResolved(window.id),
    loadFinalTables(window.id),
  ]);
  if (!state) {
    return {
      ok: false,
      error: "Der Spielplan für Relegation und Playoffs fehlt",
    };
  }
  const published = await persistPublication({
    windowId: window.id,
    round: state.firstRound,
    tiebreakers: tiebreakersToCreate(tablesByTier),
    seats: playerWrites(state.resolved),
  });
  if (!published) {
    return {
      ok: false,
      error: "Relegation und Playoffs sind bereits veröffentlicht",
    };
  }
  revalidatePath("/", "layout");
  // Then Discord follows: the Playoffs and Relegation roles and chat
  // channels. Best-effort; the periodic sync finishes what this does not.
  await syncSeasonDiscord(window.id);
  return { ok: true };
}

const tieOrderSchema = z.object({
  tieKey: z.string().min(1),
  order: z.array(z.string().uuid()).min(3),
  reason: z.string().trim().min(1, "Bitte eine Begründung angeben").max(500),
});

// Staff set the order of a shared place of three or more players across a
// zone boundary, as their off-hub tiebreaker tournament decided it. Only
// after publishing (the table is frozen then, so the order cannot go stale).
// Changing it is refused once a Relegation or playoff match of one of the
// tied players has a result.
export async function setTieOrder(input: unknown): Promise<ScheduleResult> {
  const current = await currentUser();
  if (!current || !roleAtLeast(current.role, "staff")) {
    return { ok: false, error: "Keine Berechtigung" };
  }
  const parsed = tieOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe",
    };
  }
  const window = await latestWindow();
  if (!window || window.regularSeasonClosedAt === null) {
    return {
      ok: false,
      error: "Die Reihenfolge wird nach dem Veröffentlichen festgelegt",
    };
  }
  if (await seasonCompleted(window.id)) {
    return { ok: false, error: SEASON_COMPLETED_ERROR };
  }
  const { tablesByTier } = await loadFinalTables(window.id);
  const tie = [...tablesByTier.values()]
    .flat()
    .flatMap((table) => table.ties)
    .find((t) => t.key === parsed.data.tieKey);
  if (tie?.decision !== "staff_order") {
    return { ok: false, error: "Diesen Gleichstand gibt es nicht" };
  }
  const order = parsed.data.order;
  if (
    order.length !== tie.userIds.length ||
    !tie.userIds.every((id) => order.includes(id))
  ) {
    return {
      ok: false,
      error:
        "Die Reihenfolge muss genau die gleichauf liegenden Spieler nennen",
    };
  }
  if (await tiedPlayersHavePlayed(window.id, tie.userIds)) {
    return {
      ok: false,
      error:
        "Ein Match, das auf dieser Reihenfolge aufbaut, hat schon ein Ergebnis",
    };
  }
  await saveTieOrder({
    windowId: window.id,
    tieKey: tie.key,
    order,
    reason: parsed.data.reason,
    staffId: current.userId,
  });
  await syncSeats(window.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

// "Saison abschließen" (docs/plans/relegation-and-playoffs.md): after the
// final, once everything is decided and nothing is withheld, every result
// becomes final and each player's outcome is written onto their placement.
export async function completeSeason(): Promise<ScheduleResult> {
  const current = await currentUser();
  if (!current || !roleAtLeast(current.role, "staff")) {
    return { ok: false, error: "Keine Berechtigung" };
  }
  const window = await latestWindow();
  if (!window) {
    return { ok: false, error: "Nicht möglich" };
  }
  const state = await seasonCompletionState(window.id);
  if (!state) {
    return {
      ok: false,
      error: "Erst nach dem Veröffentlichen von Relegation und Playoffs",
    };
  }
  if (state.completed) {
    return { ok: false, error: "Die Saison ist bereits abgeschlossen" };
  }
  if (state.blockers.length > 0) {
    return {
      ok: false,
      error: `Erst klären: ${state.blockers.join(", ")}.`,
    };
  }
  const completed = await persistSeasonCompletion({
    windowId: window.id,
    outcomes: state.result.players.flatMap((player) =>
      player.outcome
        ? [{ userId: player.userId, outcome: player.outcome }]
        : [],
    ),
    championId: state.result.champion === "none" ? null : state.result.champion,
  });
  if (!completed) {
    return { ok: false, error: "Die Saison ist bereits abgeschlossen" };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
