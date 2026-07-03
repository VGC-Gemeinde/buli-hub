import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { ReportForm } from "@/features/reporting/components/report-form";
import { ReportSummary } from "@/features/reporting/components/report-summary";
import {
  getMatchForReport,
  getMatchResult,
  listStaffAndAdmins,
} from "@/features/reporting/queries";
import { currentUser } from "@/features/roles/guard";

export default async function MatchReportPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const current = await currentUser();
  if (!current) {
    redirect("/");
  }

  const match = await getMatchForReport(matchId);
  // Unknown match, a bye, or a non-participant: nothing to report here.
  const isParticipant =
    match !== null &&
    (current.userId === match.playerA.userId ||
      current.userId === match.playerB?.userId);
  if (!match || !match.playerB || !isParticipant) {
    redirect("/spieler");
  }

  const result = await getMatchResult(matchId);
  const staffOptions = result ? [] : await listStaffAndAdmins();

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
        <h1 className="mb-1.5 text-3xl text-brand-blue dark:text-white">
          {result ? "Ergebnis" : "Ergebnis melden"}
        </h1>
        <div className="mb-8 flex items-center gap-2">
          <div className="h-2 w-4 -skew-x-[18deg] bg-brand-orange" />
          <span className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.12em]">
            Spieltag {match.round} · {match.playerA.name} vs.{" "}
            {match.playerB.name}
          </span>
        </div>

        {result ? (
          <ReportSummary
            result={result}
            playerA={match.playerA}
            playerB={match.playerB}
          />
        ) : (
          <ReportForm
            matchId={match.matchId}
            playerA={match.playerA}
            playerB={match.playerB}
            reporterId={current.userId}
            staffOptions={staffOptions}
          />
        )}
      </main>
    </div>
  );
}
