"use server";

import { revalidatePath } from "next/cache";
import { syncResultPost } from "@/features/discord-posts/sync";
import {
  droppedIdsForWindow,
  lateDroppedIdsForWindow,
} from "@/features/drops/queries";
import { membershipBlock } from "@/features/membership/membership";
import { regelwerkBlock } from "@/features/regelwerk/guard";
import { currentUser } from "@/features/roles/guard";
import {
  afterResultChange,
  withheldSourceReportRefusal,
} from "@/features/schedule/outcome-guard";
import {
  matchSchedulePublished,
  resultLockError,
} from "@/features/schedule/queries";
import {
  getMatchForReport,
  getMatchResult,
  listStaffAndAdmins,
  saveResult,
} from "./queries";
import { reportSchema, toResultRows } from "./report";
import { canonicalSheets } from "./sheets";

export type ReportResult = { ok: true } | { ok: false; error: string };

// A participating player reports a match result. Results are final on submit
// (no opponent confirmation — disagreement goes through the later dispute flow);
// a free win is stored pending until a staff member confirms it (staff UI later).
export async function reportMatch(input: {
  matchId: string;
  report: unknown;
}): Promise<ReportResult> {
  const current = await currentUser();
  if (!current) {
    return { ok: false, error: "Nicht angemeldet" };
  }

  // Membership before Regelwerk, matching the season gate's precedence: the
  // refusal names the gate the player is currently looking at.
  const memberBlocked = membershipBlock(current.guildMember);
  if (memberBlocked) {
    return memberBlocked;
  }

  const blocked = await regelwerkBlock(current.userId);
  if (blocked) {
    return blocked;
  }

  const lockError = await resultLockError(input.matchId);
  if (lockError) {
    return { ok: false, error: lockError };
  }
  const match = await getMatchForReport(input.matchId);
  if (!match) {
    return { ok: false, error: "Match nicht gefunden" };
  }
  if (!match.playerB) {
    return { ok: false, error: "Ein Freilos kann nicht gemeldet werden" };
  }
  // Defense in depth while the schedule is staff-internal: nobody reports
  // before the pairings are published.
  if (!(await matchSchedulePublished(input.matchId))) {
    return { ok: false, error: "Die Saison läuft noch nicht" };
  }
  if (
    current.userId !== match.playerA.userId &&
    current.userId !== match.playerB.userId
  ) {
    return {
      ok: false,
      error: "Nur die beteiligten Spieler können das Ergebnis melden",
    };
  }
  if (await getMatchResult(input.matchId)) {
    return { ok: false, error: "Das Ergebnis wurde bereits gemeldet" };
  }
  // A drop decides the match — there is nothing left to report.
  const droppedIds = await droppedIdsForWindow(match.windowId);
  if (
    droppedIds.has(match.playerA.userId) ||
    droppedIds.has(match.playerB.userId)
  ) {
    return {
      ok: false,
      error: "Das Match wurde durch einen Drop entschieden",
    };
  }
  // After the regular season a late drop decides an open match too, and a
  // line-up that comes from a withheld result cannot be reported yet
  // (docs/plans/relegation-and-playoffs.md).
  if (match.stage !== "regular") {
    const lateDroppedIds = await lateDroppedIdsForWindow(match.windowId);
    if (
      lateDroppedIds.has(match.playerA.userId) ||
      lateDroppedIds.has(match.playerB.userId)
    ) {
      return {
        ok: false,
        error: "Das Match wurde durch einen Drop entschieden",
      };
    }
    const withheldSource = await withheldSourceReportRefusal(input.matchId);
    if (withheldSource) {
      return { ok: false, error: withheldSource };
    }
  }

  const staffIds = new Set(
    (await listStaffAndAdmins()).map((staff) => staff.userId),
  );
  const parsed = reportSchema({
    participants: {
      playerAId: match.playerA.userId,
      playerBId: match.playerB.userId,
    },
    isStaffOrAdmin: (id) => staffIds.has(id),
    proofRequired: match.proofRequired,
  }).safeParse(input.report);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe",
    };
  }

  const participants = {
    playerAId: match.playerA.userId,
    playerBId: match.playerB.userId,
  };
  const { result, games, sheets } = toResultRows(parsed.data, participants);

  // The sheets are re-parsed here, not trusted: what gets stored is always the
  // parser's own output, so stats cannot reach the database by any route.
  const canonical = canonicalSheets(sheets);
  if (!canonical.ok) {
    return {
      ok: false,
      error: [canonical.error, ...canonical.details].join(" "),
    };
  }

  await saveResult(
    input.matchId,
    result,
    games,
    canonical.sheets,
    current.userId,
  );
  // A tiebreaker's result seats its winner (docs/plans/relegation-and-playoffs.md).
  await afterResultChange(input.matchId);
  revalidatePath("/spieler");
  revalidatePath(`/match/${input.matchId}`);
  // Best-effort Discord mirror (a pending free win converges to "no post").
  await syncResultPost(input.matchId);
  return { ok: true };
}
