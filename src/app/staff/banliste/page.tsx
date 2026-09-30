import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { Tick } from "@/components/tick";
import { BanDialog } from "@/features/bans/components/ban-dialog";
import { BanList } from "@/features/bans/components/ban-list";
import { banCandidates, listBans } from "@/features/bans/queries";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";

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
    <div className="flex flex-1 flex-col">
      <SiteHeader
        breadcrumb="Banliste"
        breadcrumbRoot={{ href: "/staff", label: "Staff-Bereich" }}
      />
      <main className="mx-auto w-full max-w-[1040px] flex-1 px-6 py-12 sm:px-8">
        <Link
          href="/staff"
          className="mb-4.5 inline-block font-medium text-[13px] text-muted-foreground hover:text-brand-blue dark:hover:text-white"
        >
          ← Staff-Bereich
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Tick size="l" />
            <h1 className="text-[30px] text-brand-blue dark:text-white">
              Banliste
            </h1>
          </div>
          <BanDialog
            candidates={candidates.filter(
              (candidate) => candidate.userId !== current.userId,
            )}
          />
        </div>
        <p className="mt-2 mb-9 max-w-[680px] text-muted-foreground text-sm">
          Wer hier steht, kann sich für künftige Saisons nicht anmelden und
          nicht als Ersatz einsteigen. Alles andere im Buli-Hub bleibt offen.
          Die Liste und die Begründungen sehen nur Staff. Der Gebannte erfährt
          davon erst, wenn er sich anmelden will, und sieht keinen Grund.
        </p>
        <BanList bans={bans} />
      </main>
    </div>
  );
}
