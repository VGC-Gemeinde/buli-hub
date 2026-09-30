import { redirect } from "next/navigation";
import { BanDialog } from "@/features/bans/components/ban-dialog";
import { BanList } from "@/features/bans/components/ban-list";
import { banCandidates, listBans } from "@/features/bans/queries";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import { StaffPage } from "@/features/staff/components/staff-page";

// The Banliste (docs/plans/banlist.md): people barred from registering for
// future seasons, the lifted bans as history, and the dialog to add one.
// Staff only; nothing about a ban is visible anywhere else.
export default async function StaffBanlistPage() {
  const current = await currentUser();
  if (!current || !roleAtLeast(current.role, "staff")) {
    redirect("/");
  }

  const [bans, candidates] = await Promise.all([listBans(), banCandidates()]);

  return (
    <StaffPage
      title="Banliste"
      intro="Wer hier steht, kann sich für künftige Saisons nicht anmelden und nicht als Ersatz einsteigen. Alles andere im Buli-Hub bleibt offen. Die Liste und die Begründungen sehen nur Staff. Der Gebannte erfährt davon erst, wenn er sich anmelden will, und sieht keinen Grund."
      action={
        <BanDialog
          candidates={candidates.filter(
            (candidate) => candidate.userId !== current.userId,
          )}
        />
      }
    >
      <BanList bans={bans} />
    </StaffPage>
  );
}
