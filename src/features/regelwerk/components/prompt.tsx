import { regelwerkPrompt } from "@/features/regelwerk/acceptance";
import { RegelwerkPromptDialog } from "@/features/regelwerk/components/prompt-dialogs";
import { acceptedAt } from "@/features/regelwerk/queries";
import { getRegistration } from "@/features/registration/queries";
import { currentUser } from "@/features/roles/guard";
import { currentSeason } from "@/features/season/season-status";

/**
 * Resolves whether the signed-in player still owes an acceptance and renders
 * the matching dialog.
 *
 * Mounted per page rather than in the site chrome, and only on season pages
 * where actions live (`/spieler`, `/match/[matchId]`). Putting it in the header
 * would put the non-dismissible gate on `/regelwerk` itself — locking the
 * player out of the one page that can unlock them.
 */
export async function RegelwerkPrompt() {
  const current = await currentUser();
  if (!current) {
    return null;
  }

  const { window, phase } = await currentSeason();
  if (window === null) {
    return null;
  }

  const [registration, accepted] = await Promise.all([
    getRegistration(window.id, current.userId),
    acceptedAt(window.id, current.userId),
  ]);

  const prompt = regelwerkPrompt({
    phase,
    isRegistered: registration !== null,
    hasAccepted: accepted !== null,
  });
  if (prompt === "none") {
    return null;
  }

  return (
    <RegelwerkPromptDialog prompt={prompt} seasonNumber={window.seasonNumber} />
  );
}
