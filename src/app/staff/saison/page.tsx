import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SaisonDashboard } from "@/features/reporting/components/saison-dashboard";
import { windowMatchOverview } from "@/features/reporting/queries";
import { bucketMatches } from "@/features/reporting/staff-dashboard";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import { currentMatchday } from "@/features/season/dashboard";
import { matchdaysForWindow } from "@/features/season/queries";
import { latestWindow } from "@/features/staff/queries";

export default async function StaffSaisonPage() {
  const current = await currentUser();
  if (!current || !roleAtLeast(current.role, "staff")) {
    redirect("/");
  }

  const window = await latestWindow();
  const matchdays = window ? await matchdaysForWindow(window.id) : [];
  // A schedule (matchdays) exists exactly when the regular season is running.
  if (!window || matchdays.length === 0) {
    redirect("/staff");
  }

  const today = new Date().toISOString().slice(0, 10);
  const overview = await windowMatchOverview(window.id);
  const currentRound = currentMatchday(matchdays, today)?.round ?? null;
  const { overdue, thisWeek, pendingFreeWins } = bucketMatches({
    matches: overview,
    currentRound,
    today,
  });

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <Link
          href="/staff"
          className="mb-4 inline-block text-muted-foreground text-sm hover:text-foreground"
        >
          ← Zurück zum Staff-Bereich
        </Link>
        <h1 className="mb-9 text-4xl text-brand-blue dark:text-white">
          Reguläre Saison
        </h1>
        <SaisonDashboard
          overdue={overdue}
          thisWeek={thisWeek}
          pendingFreeWins={pendingFreeWins}
          currentRound={currentRound}
          totalRounds={matchdays.length}
        />
      </main>
    </div>
  );
}
