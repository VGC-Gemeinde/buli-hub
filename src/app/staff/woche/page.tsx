import { redirect } from "next/navigation";
import { WeekMatches } from "@/features/reporting/components/week-matches";
import {
  windowMatchOverview,
  windowResolvedDisputes,
} from "@/features/reporting/queries";
import { bucketMatches } from "@/features/reporting/staff-dashboard";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import { currentMatchday } from "@/features/season/dashboard";
import { matchdaysForWindow } from "@/features/season/queries";
import { StaffPage } from "@/features/staff/components/staff-page";
import { latestWindow } from "@/features/staff/queries";
import { germanToday } from "@/lib/german-time";

// The Woche page (docs/plans/staff-dashboard.md): the full match lists the
// dashboard only counts. Worklists (overdue, disputed, free wins to confirm)
// are season-wide; the match list is one Spieltag, the running one unless
// `?spieltag=n` picks another.
export default async function StaffWeekPage({
  searchParams,
}: {
  searchParams: Promise<{ spieltag?: string }>;
}) {
  const current = await currentUser();
  if (!current || !roleAtLeast(current.role, "staff")) {
    redirect("/");
  }
  const window = await latestWindow();
  if (!window) {
    redirect("/staff");
  }
  const matchdays = await matchdaysForWindow(window.id);
  if (matchdays.length === 0) {
    redirect("/staff");
  }

  const today = germanToday();
  const currentRound = currentMatchday(matchdays, today)?.round ?? null;
  const requested = Number((await searchParams).spieltag);
  const round =
    Number.isInteger(requested) &&
    requested >= 1 &&
    requested <= matchdays.length
      ? requested
      : (currentRound ?? matchdays.length);

  const [overview, resolvedDisputes] = await Promise.all([
    windowMatchOverview(window.id),
    windowResolvedDisputes(window.id),
  ]);
  const { overdue, thisWeek, pendingFreeWins, disputed } = bucketMatches({
    matches: overview,
    currentRound: round,
    today,
  });

  return (
    <StaffPage
      title="Woche"
      intro="Was in der Liga gerade offen ist: überfällige Matches, Anfechtungen und Freewins zum Bestätigen, dazu alle Matches eines Spieltags."
    >
      <WeekMatches
        overdue={overdue}
        thisWeek={thisWeek}
        pendingFreeWins={pendingFreeWins}
        disputed={disputed}
        resolvedDisputes={resolvedDisputes}
        round={round}
        totalRounds={matchdays.length}
        currentRound={currentRound}
        today={today}
      />
    </StaffPage>
  );
}
