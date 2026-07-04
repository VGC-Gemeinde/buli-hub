import { notFound } from "next/navigation";
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

// Public, read-only for neutral observers; participants get the report form +
// dispute option and staff get the staff panel. Disputes are never shown to
// neutral visitors.
export default async function MatchReportPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;

  const match = await getMatchForReport(matchId);
  // A bye (playerB null) or an unknown id has no match to show.
  if (!match || !match.playerB) {
    notFound();
  }

  const current = await currentUser();
  const isParticipant =
    current !== null &&
    (current.userId === match.playerA.userId ||
      current.userId === match.playerB.userId);
  const isStaff = current !== null && roleAtLeast(current.role, "staff");
  const privileged = isParticipant || isStaff;

  const result = await getMatchResult(matchId);
  // A pending (unconfirmed) free win is not public — neutral observers see the
  // match as still open until it is confirmed.
  const pendingFreeWinHidden =
    !privileged &&
    result?.outcome === "free_win" &&
    result.confirmedAt === null;
  const shownResult = pendingFreeWinHidden ? null : result;
  // Dispute machinery stays with participants + staff.
  const dispute = result && privileged ? await matchOpenDispute(matchId) : null;
  const staffOptions =
    !result && isParticipant ? await listStaffAndAdmins() : [];
  const breadcrumb = shownResult
    ? shownResult.outcome === "free_win"
      ? "Freewin"
      : "Ergebnis"
    : isParticipant
      ? "Ergebnis melden"
      : "Spiel";
  // Participants return to their dashboard, staff to the Staff area, neutral
  // observers to the public overview.
  const back = isParticipant
    ? { href: "/spieler", label: "Zurück zur Übersicht" }
    : isStaff
      ? { href: "/staff", label: "Staff-Bereich" }
      : { href: "/", label: "Zur Übersicht" };
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
        {shownResult ? (
          <ReportSummary
            result={shownResult}
            playerA={match.playerA}
            playerB={match.playerB}
            viewerId={current?.userId ?? null}
            privileged={privileged}
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

        {!shownResult ? (
          isParticipant && current ? (
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
