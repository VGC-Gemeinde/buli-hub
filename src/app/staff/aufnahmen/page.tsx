import { redirect } from "next/navigation";
import { RecordingManager } from "@/features/recordings/components/recording-manager";
import {
  buildHeldMatches,
  buildRecordingWeeks,
  type RecordingMatch,
} from "@/features/recordings/holds";
import { holdsForWindow } from "@/features/recordings/queries";
import { windowMatchOverview } from "@/features/reporting/queries";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import { currentMatchday } from "@/features/season/dashboard";
import { matchdaysForWindow } from "@/features/season/queries";
import { StaffPage } from "@/features/staff/components/staff-page";
import { latestWindow } from "@/features/staff/queries";
import { streamPhotoUrl } from "@/features/stream-photos/photo";
import { streamPhotoPathsFor } from "@/features/stream-photos/queries";
import { germanToday } from "@/lib/german-time";

// Staff workspace for recordings (docs/plans/recording-holds.md): the matches
// currently held for the stream, and the picker to mark more of the current
// and later Spieltage.
export default async function StaffRecordingsPage() {
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

  const currentRound = currentMatchday(matchdays, germanToday())?.round ?? null;
  const [overview, holds] = await Promise.all([
    windowMatchOverview(window.id),
    holdsForWindow(window.id),
  ]);
  const roleByMatch = new Map(holds.map((h) => [h.matchId, h.motwRole]));
  const photos = await streamPhotoPathsFor([
    ...new Set(
      overview.flatMap((match) => [match.playerA.userId, match.playerB.userId]),
    ),
  ]);
  const withPhoto = (identity: {
    userId: string;
    name: string;
    avatarUrl: string | null;
  }) => ({
    ...identity,
    streamPhotoUrl: streamPhotoUrl(photos.get(identity.userId) ?? null),
  });
  const matches: RecordingMatch[] = overview.map((match) => ({
    matchId: match.matchId,
    round: match.round,
    tier: match.tier,
    groupName: match.groupName,
    playerA: withPhoto(match.playerA),
    playerB: withPhoto(match.playerB),
    reported: match.outcome !== null,
    pendingFreeWin: match.outcome === "free_win" && match.confirmedAt === null,
    decidedByDrop: match.decidedByDrop,
    held: roleByMatch.has(match.matchId),
    motwRole: roleByMatch.get(match.matchId) ?? null,
    endsOn: match.endsOn,
  }));

  return (
    <StaffPage
      title="Aufnahmen"
      intro="Matches, die der Staff für den Stream aufnimmt. Ein markiertes Match bleibt nach der Meldung zurückgehalten: Ergebnis, Replays und Teamsheets sehen nur Staff und die beiden Spieler, im Ergebniskanal wird nichts gepostet. Nach dem Stream hier freigeben, dann wird alles wie gewohnt veröffentlicht."
    >
      <RecordingManager
        held={buildHeldMatches(matches, currentRound)}
        weeks={buildRecordingWeeks({ matchdays, currentRound, matches })}
        currentRound={currentRound}
      />
    </StaffPage>
  );
}
