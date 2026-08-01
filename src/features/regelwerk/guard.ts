import { actionsLocked, LOCKED_ERROR } from "@/features/regelwerk/acceptance";
import { acceptedAt } from "@/features/regelwerk/queries";
import { currentSeason } from "@/features/season/season-status";

/**
 * The action lock. Call at the top of every player action, next to the
 * existing `currentUser()` check — a disabled button is not authorization
 * (design §5.2).
 *
 * Returns null when the action may proceed, or the refusal to hand straight
 * back to the caller. The shape matches what the player actions already
 * return, so adopting it is one early return.
 *
 * Only in-season *player* actions call this. Staff actions do not: staff act
 * as officials there, not as participants. A staff member reporting their own
 * match goes through `reportMatch`, which does call it — the question is which
 * hat the caller is wearing, not which role they hold.
 */
export async function regelwerkBlock(
  userId: string,
): Promise<{ ok: false; error: string } | null> {
  const { window, phase } = await currentSeason();
  if (window === null) {
    return null;
  }

  const accepted = await acceptedAt(window.id, userId);
  if (actionsLocked({ phase, hasAccepted: accepted !== null })) {
    return { ok: false, error: LOCKED_ERROR };
  }
  return null;
}
