"use server";

import { revalidatePath } from "next/cache";
import { syncResultPost } from "@/features/discord-posts/sync";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import {
  afterResultChange,
  type CountedOutcome,
  countedOutcome,
  outcomeChangeRefusal,
  withheldSourceReportRefusal,
} from "@/features/schedule/outcome-guard";
import { resultLockError } from "@/features/schedule/queries";
import {
  deleteMatchResult,
  getMatchForReport,
  getMatchResult,
  listStaffAndAdmins,
  confirmFreeWin as persistConfirmFreeWin,
  replaceResult,
  upsertStaffResult,
} from "./queries";
import { staffResultSchema, toResultRows } from "./report";
import { canonicalSheets } from "./sheets";

export type StaffActionResult = { ok: true } | { ok: false; error: string };

// Refresh the affected screens and mirror the new public state to Discord
// (best-effort — syncResultPost never throws). Every staff result power
// changes what the channel should show: confirm/award posts, edit rewrites,
// reopen deletes.
async function revalidate(matchId: string) {
  // Seats that depend on the match follow first, so the screens refreshed
  // below already show them.
  await afterResultChange(matchId);
  revalidatePath("/staff");
  revalidatePath(`/match/${matchId}`);
  revalidatePath("/spieler");
  await syncResultPost(matchId);
}

// Refuses a change that alters how a Relegation, playoff or tiebreaker
// match ends once a match building on it has a result.
async function guardOutcome(
  matchId: string,
  next: CountedOutcome,
): Promise<StaffActionResult | null> {
  const refusal = await outcomeChangeRefusal(matchId, next);
  return refusal ? { ok: false, error: refusal } : null;
}

async function staffGate(matchId: string) {
  const current = await currentUser();
  if (!current || !roleAtLeast(current.role, "staff")) {
    return { ok: false as const, error: "Keine Berechtigung" };
  }
  // Every staff result power changes a result, so none of them may touch a
  // regular match once the regular season is closed.
  const lockError = await resultLockError(matchId);
  if (lockError) {
    return { ok: false as const, error: lockError };
  }
  const match = await getMatchForReport(matchId);
  if (!match?.playerB) {
    return { ok: false as const, error: "Match nicht gefunden" };
  }
  // A line-up that comes from a withheld result gets no result yet, from
  // staff either (docs/plans/relegation-and-playoffs.md).
  const withheldSource = await withheldSourceReportRefusal(matchId);
  if (withheldSource) {
    return { ok: false as const, error: withheldSource };
  }
  // Narrow playerB to non-null for the callers.
  const playerB = match.playerB;
  return {
    ok: true as const,
    staffId: current.userId,
    match: { ...match, playerB },
  };
}

// Any staff member confirms a pending free win — it then counts for standings.
export async function confirmFreeWin(
  matchId: string,
): Promise<StaffActionResult> {
  const gate = await staffGate(matchId);
  if (!gate.ok) {
    return gate;
  }
  const result = await getMatchResult(matchId);
  if (result?.outcome !== "free_win") {
    return { ok: false, error: "Kein Freewin zum Bestätigen" };
  }
  if (result.confirmedAt) {
    return { ok: false, error: "Bereits bestätigt" };
  }
  if (result.winnerId) {
    const refused = await guardOutcome(matchId, {
      kind: "won",
      winnerId: result.winnerId,
    });
    if (refused) {
      return refused;
    }
  }
  await persistConfirmFreeWin(matchId, gate.staffId);
  await revalidate(matchId);
  return { ok: true };
}

// Staff proactively award a free win (confirmed immediately).
export async function awardFreeWin(input: {
  matchId: string;
  winnerId: string;
  reason: string;
}): Promise<StaffActionResult> {
  const gate = await staffGate(input.matchId);
  if (!gate.ok) {
    return gate;
  }
  if (
    input.winnerId !== gate.match.playerA.userId &&
    input.winnerId !== gate.match.playerB.userId
  ) {
    return { ok: false, error: "Unbekannter Spieler" };
  }
  if (input.reason.trim() === "") {
    return { ok: false, error: "Bitte einen Grund angeben" };
  }
  const refused = await guardOutcome(input.matchId, {
    kind: "won",
    winnerId: input.winnerId,
  });
  if (refused) {
    return refused;
  }
  await upsertStaffResult({
    matchId: input.matchId,
    outcome: "free_win",
    winnerId: input.winnerId,
    freeWinReason: input.reason.trim(),
    staffId: gate.staffId,
  });
  await revalidate(input.matchId);
  return { ok: true };
}

// Staff proactively award a double loss (both players lose, no winner).
export async function awardDoubleLoss(input: {
  matchId: string;
}): Promise<StaffActionResult> {
  const gate = await staffGate(input.matchId);
  if (!gate.ok) {
    return gate;
  }
  const refused = await guardOutcome(input.matchId, { kind: "double_loss" });
  if (refused) {
    return refused;
  }
  await upsertStaffResult({
    matchId: input.matchId,
    outcome: "double_loss",
    winnerId: null,
    freeWinReason: null,
    staffId: gate.staffId,
  });
  await revalidate(input.matchId);
  return { ok: true };
}

// Staff full edit of an existing result — change anything (games, platform,
// replays, team sheets, or switch to a double loss). Free wins go through the
// award dialog; players still do the initial submission.
export async function editResult(input: {
  matchId: string;
  report: unknown;
}): Promise<StaffActionResult> {
  const gate = await staffGate(input.matchId);
  if (!gate.ok) {
    return gate;
  }
  if (!(await getMatchResult(input.matchId))) {
    return { ok: false, error: "Es gibt kein Ergebnis zum Bearbeiten" };
  }
  const staffIds = new Set(
    (await listStaffAndAdmins()).map((staff) => staff.userId),
  );
  const parsed = staffResultSchema({
    participants: {
      playerAId: gate.match.playerA.userId,
      playerBId: gate.match.playerB.userId,
    },
    isStaffOrAdmin: (id) => staffIds.has(id),
    proofRequired: gate.match.proofRequired,
  }).safeParse(input.report);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe",
    };
  }
  const { result, games, sheets } = toResultRows(parsed.data, {
    playerAId: gate.match.playerA.userId,
    playerBId: gate.match.playerB.userId,
  });
  const canonical = canonicalSheets(sheets);
  if (!canonical.ok) {
    return {
      ok: false,
      error: [canonical.error, ...canonical.details].join(" "),
    };
  }
  const refused = await guardOutcome(
    input.matchId,
    countedOutcome({
      outcome: result.outcome,
      winnerId: result.winnerId,
      // A staff edit counts as soon as it is stored.
      confirmedAt: new Date(),
    }),
  );
  if (refused) {
    return refused;
  }
  await replaceResult({
    matchId: input.matchId,
    result,
    games,
    sheets: canonical.sheets,
    staffId: gate.staffId,
  });
  await revalidate(input.matchId);
  return { ok: true };
}

// Staff reopen a match — clears the result so it can be re-reported.
export async function reopenMatch(matchId: string): Promise<StaffActionResult> {
  const gate = await staffGate(matchId);
  if (!gate.ok) {
    return gate;
  }
  const refused = await guardOutcome(matchId, { kind: "none" });
  if (refused) {
    return refused;
  }
  await deleteMatchResult(matchId);
  await revalidate(matchId);
  return { ok: true };
}
