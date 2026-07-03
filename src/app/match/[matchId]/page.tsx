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
  const breadcrumb = result
    ? result.outcome === "free_win"
      ? "Freigewinn"
      : "Ergebnis"
    : "Ergebnis melden";

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader breadcrumb={breadcrumb} />
      <main className="mx-auto w-full max-w-[760px] flex-1 px-8 pt-9 pb-[140px]">
        {result ? (
          <ReportSummary
            result={result}
            playerA={match.playerA}
            playerB={match.playerB}
            viewerId={current.userId}
            round={match.round}
            groupName={match.groupName}
          />
        ) : (
          <ReportForm
            matchId={match.matchId}
            round={match.round}
            groupName={match.groupName}
            deadline={match.deadline}
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
