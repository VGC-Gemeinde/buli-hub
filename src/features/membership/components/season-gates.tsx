import { MembershipGateDialog } from "@/features/membership/components/gate-dialog";
import { isConfirmedNonMember } from "@/features/membership/membership";
import { RegelwerkPrompt } from "@/features/regelwerk/components/prompt";
import { getRegistration } from "@/features/registration/queries";
import { currentUser } from "@/features/roles/guard";
import { currentSeason } from "@/features/season/season-status";

/**
 * The one gate mount for season pages, replacing the bare RegelwerkPrompt
 * mounts. It decides between the membership gate and the Regelwerk prompt and
 * never renders both: two non-dismissible dialogs cannot stack, and membership
 * wins because rejoining the server is the prerequisite for everything else —
 * after a successful recheck the refresh re-renders this component and an owed
 * Regelwerk gate appears next.
 *
 * The membership gate needs a registration to have something to demand: a
 * signed-in non-member who never registered is just a visitor. The extra
 * queries run only for confirmed non-members, so the common path costs
 * nothing beyond the request-cached currentUser().
 *
 * Mounted per page rather than in the site chrome, for the same reason as
 * RegelwerkPrompt: a global mount would put a non-dismissible dialog on
 * /regelwerk, /anmeldung and the legal pages.
 */
export async function SeasonGates() {
  const current = await currentUser();
  if (current && isConfirmedNonMember(current.guildMember)) {
    const { window } = await currentSeason();
    if (window && (await getRegistration(window.id, current.userId))) {
      return <MembershipGateDialog />;
    }
  }
  return <RegelwerkPrompt />;
}
