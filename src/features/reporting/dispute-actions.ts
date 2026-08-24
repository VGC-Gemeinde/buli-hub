"use server";

import { revalidatePath } from "next/cache";
import { syncResultPost } from "@/features/discord-posts/sync";
import { membershipBlock } from "@/features/membership/membership";
import { regelwerkBlock } from "@/features/regelwerk/guard";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import type { Identity } from "@/features/season/dashboard";
import {
  type DisputeDecision,
  type DisputeDecisionInput,
  disputeChange,
  disputeDecisionSchema,
  disputeNoteSchema,
} from "./dispute";
import {
  getMatchForReport,
  getMatchResult,
  listStaffAndAdmins,
  matchOpenDispute,
  resolveDisputeWithChange as persistDecision,
  openDispute as persistOpenDispute,
} from "./queries";
import { staffResultSchema } from "./report";
import { canonicalSheets } from "./sheets";

export type DisputeResult = { ok: true } | { ok: false; error: string };

function revalidate(matchId: string) {
  revalidatePath("/staff");
  revalidatePath("/spieler");
  revalidatePath(`/match/${matchId}`);
}

// A participant contests a recorded result. The result still counts until staff
// act; opening only flags it. One open dispute per match.
export async function openDispute(input: {
  matchId: string;
  reason: string;
}): Promise<DisputeResult> {
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

  const match = await getMatchForReport(input.matchId);
  if (!match || !match.playerB) {
    return { ok: false, error: "Match nicht gefunden" };
  }
  if (
    current.userId !== match.playerA.userId &&
    current.userId !== match.playerB.userId
  ) {
    return { ok: false, error: "Nur die beteiligten Spieler können anfechten" };
  }
  if (!(await getMatchResult(input.matchId))) {
    return { ok: false, error: "Es gibt noch kein Ergebnis zum Anfechten" };
  }
  if (await matchOpenDispute(input.matchId)) {
    return { ok: false, error: "Dieses Match wird bereits geprüft" };
  }
  if (input.reason.trim() === "") {
    return { ok: false, error: "Bitte einen Grund angeben" };
  }
  await persistOpenDispute({
    matchId: input.matchId,
    openedById: current.userId,
    reason: input.reason.trim(),
  });
  revalidate(input.matchId);
  return { ok: true };
}

// Staff decide an open dispute. One call does the whole decision: it applies
// whatever the chosen outcome does to the result (nothing, a confirmation, a
// new result, or a reset) and resolves the dispute in the same transaction, so
// "bestätigt"/"korrigiert" can never disagree with what the result actually is.
export async function decideDispute(input: {
  matchId: string;
  decision: DisputeDecisionInput;
  note: string;
}): Promise<DisputeResult> {
  const current = await currentUser();
  if (!current || !roleAtLeast(current.role, "staff")) {
    return { ok: false, error: "Keine Berechtigung" };
  }
  const note = disputeNoteSchema.safeParse(input.note);
  if (!note.success) {
    return {
      ok: false,
      error: note.error.issues[0]?.message ?? "Ungültige Begründung",
    };
  }
  const decision = disputeDecisionSchema.safeParse(input.decision);
  if (!decision.success) {
    return { ok: false, error: "Ungültige Entscheidung" };
  }
  if (!(await matchOpenDispute(input.matchId))) {
    return { ok: false, error: "Keine offene Anfechtung" };
  }
  const match = await getMatchForReport(input.matchId);
  if (!match || !match.playerB) {
    return { ok: false, error: "Match nicht gefunden" };
  }
  const result = await getMatchResult(input.matchId);
  if (!result) {
    return { ok: false, error: "Es gibt kein Ergebnis zu entscheiden" };
  }

  const validated = await validateDecision(decision.data, {
    ...match,
    playerB: match.playerB,
  });
  if (!validated.ok) {
    return validated;
  }

  const { resolution, change } = disputeChange(
    validated.decision,
    { outcome: result.outcome, confirmed: result.confirmedAt !== null },
    note.data,
    {
      playerAId: match.playerA.userId,
      playerBId: match.playerB.userId,
    },
  );
  if (change.kind === "replace") {
    // Same rule as every other write path: what gets stored is the parser's
    // output, never the payload as posted.
    const canonical = canonicalSheets(change.sheets);
    if (!canonical.ok) {
      return {
        ok: false,
        error: [canonical.error, ...canonical.details].join(" "),
      };
    }
    change.sheets = canonical.sheets;
  }
  await persistDecision({
    matchId: input.matchId,
    resolution,
    note: note.data,
    resolvedById: current.userId,
    change,
  });
  revalidate(input.matchId);
  // A decision can change the public result, so the Discord post has to follow
  // (best-effort — syncResultPost never throws).
  await syncResultPost(input.matchId);
  return { ok: true };
}

// Checks the parts of a decision that need the match: a corrected result goes
// through the same schema as the staff editor, an awarded free win must name a
// participant. Everything else carries no payload.
async function validateDecision(
  decision: DisputeDecisionInput,
  match: {
    matchId: string;
    proofRequired: boolean;
    playerA: Identity;
    playerB: Identity;
  },
): Promise<
  { ok: true; decision: DisputeDecision } | { ok: false; error: string }
> {
  if (decision.kind === "edit") {
    const staffIds = new Set(
      (await listStaffAndAdmins()).map((staff) => staff.userId),
    );
    const parsed = staffResultSchema({
      participants: {
        playerAId: match.playerA.userId,
        playerBId: match.playerB.userId,
      },
      isStaffOrAdmin: (id) => staffIds.has(id),
      proofRequired: match.proofRequired,
    }).safeParse(decision.report);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe",
      };
    }
    return { ok: true, decision: { kind: "edit", report: parsed.data } };
  }
  if (decision.kind === "free_win") {
    if (
      decision.winnerId !== match.playerA.userId &&
      decision.winnerId !== match.playerB.userId
    ) {
      return { ok: false, error: "Unbekannter Spieler" };
    }
  }
  return { ok: true, decision };
}
