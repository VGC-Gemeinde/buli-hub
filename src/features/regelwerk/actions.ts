"use server";

import { revalidatePath } from "next/cache";
import { recordAcceptance } from "@/features/regelwerk/queries";
import { currentUser } from "@/features/roles/guard";
import { latestWindow } from "@/features/staff/queries";

export type AcceptResult =
  | { ok: true; acceptedAt: string }
  | { ok: false; error: string };

/**
 * Records that the signed-in user accepts the running season's Regelwerk.
 *
 * Deliberately takes no input: what is being accepted is "the current season's
 * ruleset", which the server already knows. A client-supplied season or
 * document id would be a way to accept something other than what was on
 * screen.
 */
export async function acceptRegelwerk(): Promise<AcceptResult> {
  const current = await currentUser();
  if (!current) {
    return { ok: false, error: "Nicht angemeldet" };
  }

  const window = await latestWindow();
  if (!window) {
    return { ok: false, error: "Es läuft derzeit keine Saison" };
  }

  const accepted = await recordAcceptance(window.id, current.userId);

  // The dashboard shows the prompt and the actions read the lock, so both go
  // stale the moment this succeeds.
  revalidatePath("/regelwerk");
  revalidatePath("/spieler");

  return { ok: true, acceptedAt: accepted.toISOString() };
}
