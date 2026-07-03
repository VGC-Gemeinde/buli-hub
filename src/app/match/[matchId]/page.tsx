import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { DisputeDialog } from "@/features/reporting/components/dispute-dialog";
import { ReportForm } from "@/features/reporting/components/report-form";
import { ReportSummary } from "@/features/reporting/components/report-summary";
import { StaffMatchPanel } from "@/features/reporting/components/staff-match-panel";
import {
  getMatchForReport,
  getMatchResult,
  listStaffAndAdmins,
  matchOpenDispute,
} from "@/features/reporting/queries";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";

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
  const isParticipant =
    match !== null &&
    (current.userId === match.playerA.userId ||
      current.userId === match.playerB?.userId);
  const isStaff = roleAtLeast(current.role, "staff");
  if (!match || !match.playerB || (!isParticipant && !isStaff)) {
    redirect("/spieler");
  }

  const result = await getMatchResult(matchId);
  const dispute = result ? await matchOpenDispute(matchId) : null;
  const staffOptions = result ? [] : await listStaffAndAdmins();
  const breadcrumb = result
    ? result.outcome === "free_win"
      ? "Freewin"
      : "Ergebnis"
    : "Ergebnis melden";
  // Participants return to their dashboard; a staff officiant to the Staff area.
  const back = isParticipant
    ? { href: "/spieler", label: "Zurück zur Übersicht" }
    : { href: "/staff", label: "Staff-Bereich" };
  const editorInitial =
    result && result.outcome === "normal"
      ? {
          platform: result.platform,
          games: result.games.map((game) => ({
            winnerId: game.winnerId,
            replayUrl: game.replayUrl,
          })),
          playerATeamUrl: result.playerATeamUrl,
          playerBTeamUrl: result.playerBTeamUrl,
          videoUrl: result.videoUrl,
        }
      : null;
  const isPendingFreeWin =
    result?.outcome === "free_win" && result.confirmedAt === null;
  const pendingWinnerName = isPendingFreeWin
    ? result.winnerId === match.playerA.userId
      ? match.playerA.name
      : match.playerB.name
    : null;

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
            backHref={back.href}
            backLabel={back.label}
          />
        ) : null}

        {result && dispute ? (
          <div className="mt-8 flex flex-col gap-1.5 rounded-lg border border-destructive/35 bg-destructive/5 px-5 py-4">
            <p className="font-semibold text-destructive text-sm">
              Angefochten — in Prüfung
            </p>
            <p className="text-muted-foreground text-sm">
              „{dispute.reason}" — {dispute.openedByName ?? "—"}
            </p>
          </div>
        ) : result && isParticipant ? (
          <div className="mt-8">
            <DisputeDialog matchId={match.matchId} />
          </div>
        ) : null}

        {!result ? (
          isParticipant ? (
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
          ) : (
            <>
              <p className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.14em]">
                Spieltag {match.round} · {match.groupName}
              </p>
              <h1 className="mt-2 text-3xl text-brand-blue dark:text-white">
                {match.playerA.name} vs. {match.playerB.name}
              </h1>
              <p className="mt-3 text-muted-foreground">
                Noch kein Ergebnis gemeldet.
              </p>
            </>
          )
        ) : null}

        {isStaff ? (
          <StaffMatchPanel
            matchId={match.matchId}
            round={match.round}
            groupName={match.groupName}
            playerA={match.playerA}
            playerB={match.playerB}
            hasResult={result !== null}
            isPendingFreeWin={isPendingFreeWin}
            pendingWinnerName={pendingWinnerName}
            editorInitial={editorInitial}
            disputeOpen={dispute !== null}
          />
        ) : null}
      </main>
    </div>
  );
}
