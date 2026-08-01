"use server";

import { revalidatePath } from "next/cache";
import { regelwerkBlock } from "@/features/regelwerk/guard";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import {
  getMatchForReport,
  getMatchResult,
  matchOpenDispute,
  openDispute as persistOpenDispute,
  resolveDispute as persistResolveDispute,
} from "./queries";

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

// Staff resolve an open dispute: uphold (result stands) or corrected (they have
// edited the result). Records who/when + a note.
export async function resolveDispute(input: {
  matchId: string;
  resolution: "upheld" | "corrected";
  note: string;
}): Promise<DisputeResult> {
  const current = await currentUser();
  if (!current || !roleAtLeast(current.role, "staff")) {
    return { ok: false, error: "Keine Berechtigung" };
  }
  if (!(await matchOpenDispute(input.matchId))) {
    return { ok: false, error: "Keine offene Anfechtung" };
  }
  await persistResolveDispute({
    matchId: input.matchId,
    resolution: input.resolution,
    note: input.note.trim() === "" ? null : input.note.trim(),
    resolvedById: current.userId,
  });
  revalidate(input.matchId);
  return { ok: true };
}
