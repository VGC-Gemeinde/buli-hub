"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import {
  deleteMatchResult,
  getMatchForReport,
  getMatchResult,
  confirmFreeWin as persistConfirmFreeWin,
  upsertStaffResult,
} from "./queries";

export type StaffActionResult = { ok: true } | { ok: false; error: string };

function revalidate(matchId: string) {
  revalidatePath("/staff/saison");
  revalidatePath(`/match/${matchId}`);
  revalidatePath("/spieler");
}

async function staffGate(matchId: string) {
  const current = await currentUser();
  if (!current || !roleAtLeast(current.role, "staff")) {
    return { ok: false as const, error: "Keine Berechtigung" };
  }
  const match = await getMatchForReport(matchId);
  if (!match || !match.playerB) {
    return { ok: false as const, error: "Match nicht gefunden" };
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
  if (!result || result.outcome !== "free_win") {
    return { ok: false, error: "Kein Freewin zum Bestätigen" };
  }
  if (result.confirmedAt) {
    return { ok: false, error: "Bereits bestätigt" };
  }
  await persistConfirmFreeWin(matchId, gate.staffId);
  revalidate(matchId);
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
  await upsertStaffResult({
    matchId: input.matchId,
    outcome: "free_win",
    winnerId: input.winnerId,
    freeWinReason: input.reason.trim(),
    staffId: gate.staffId,
  });
  revalidate(input.matchId);
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
  await upsertStaffResult({
    matchId: input.matchId,
    outcome: "double_loss",
    winnerId: null,
    freeWinReason: null,
    staffId: gate.staffId,
  });
  revalidate(input.matchId);
  return { ok: true };
}

// Staff reopen a match — clears the result so it can be re-reported.
export async function reopenMatch(matchId: string): Promise<StaffActionResult> {
  const gate = await staffGate(matchId);
  if (!gate.ok) {
    return gate;
  }
  await deleteMatchResult(matchId);
  revalidate(matchId);
  return { ok: true };
}
