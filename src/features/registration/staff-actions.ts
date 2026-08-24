"use server";

import { revalidatePath } from "next/cache";
import { clearAcceptance } from "@/features/regelwerk/queries";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import { removePlacement } from "@/features/seeding/queries";
import { latestWindow, windowSeasonPhase } from "@/features/staff/queries";
import { cancellationBlocked } from "./cancellation";
import { deleteRegistration, getRegistration } from "./queries";

export type CancelRegistrationResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Staff cancel of another player's registration, for the gap between
 * Anmeldeschluss and the finalized seeding — the primary case being a
 * registered player who is not (or no longer) on the Discord server. The
 * player withdraws themself while the window is open; from the finalized
 * seeding onward removal is a drop (`cancellationBlocked` says so).
 *
 * Mirrors withdraw(): registration and acceptance go together, plus any draft
 * placement. Deletes run placement → acceptance → registration, so an
 * interruption leaves a retryable state instead of a half-cancelled ghost.
 */
export async function cancelRegistration(input: {
  userId: string;
}): Promise<CancelRegistrationResult> {
  const current = await currentUser();
  if (!current || !roleAtLeast(current.role, "staff")) {
    return { ok: false, error: "Keine Berechtigung" };
  }

  const window = await latestWindow();
  if (!window) {
    return { ok: false, error: "Keine Saison gefunden" };
  }

  // The same derivation the staff dashboard uses — the phase is never stored.
  const { phase } = await windowSeasonPhase(window);
  const refusal = cancellationBlocked(phase);
  if (refusal) {
    return { ok: false, error: refusal };
  }

  if (!(await getRegistration(window.id, input.userId))) {
    return {
      ok: false,
      error: "Für diesen Spieler liegt keine Anmeldung vor.",
    };
  }

  await removePlacement(window.id, input.userId);
  // The acceptance goes with the registration, exactly as in withdraw():
  // someone who is not in the season must not count as having agreed to its
  // rules, and a later re-registration has to ask again.
  await clearAcceptance(window.id, input.userId);
  await deleteRegistration(window.id, input.userId);

  revalidatePath("/staff");
  revalidatePath("/staff/seeding");
  revalidatePath("/anmeldung");
  revalidatePath("/regelwerk");
  revalidatePath("/spieler");
  revalidatePath("/spieler/[userId]", "page");
  return { ok: true };
}
