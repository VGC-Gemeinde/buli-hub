import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import {
  MotwManager,
  type MotwPastPick,
  type MotwWeek,
} from "@/features/motw/components/motw-manager";
import { selectableRounds } from "@/features/motw/motw";
import { motwForWindow } from "@/features/motw/queries";
import { windowMatchOverview } from "@/features/reporting/queries";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import { currentMatchday } from "@/features/season/dashboard";
import { matchdaysForWindow } from "@/features/season/queries";
import { latestWindow } from "@/features/staff/queries";

// Staff manager for the Match of the Week: pick (or replace/remove) the
// featured match of the current and next Spieltag, and maintain VOD links —
// also for past rounds, since uploads can lag the week.
export default async function StaffMotwPage() {
  const current = await currentUser();
  if (!current || !roleAtLeast(current.role, "staff")) {
    redirect("/");
  }

  const window = await latestWindow();
  if (!window) {
    redirect("/staff");
  }
  const matchdays = await matchdaysForWindow(window.id);
  // No schedule → no running season → nothing to pick.
  if (matchdays.length === 0) {
    redirect("/staff");
  }

  const today = new Date().toISOString().slice(0, 10);
  const currentRound = currentMatchday(matchdays, today)?.round ?? null;
  const [selections, overview] = await Promise.all([
    motwForWindow(window.id),
    windowMatchOverview(window.id),
  ]);

  const pickable = selectableRounds(currentRound, matchdays.length);
  const weeks: MotwWeek[] = [...pickable]
    .sort((a, b) => a - b)
    .map((round) => {
      const day = matchdays.find((m) => m.round === round);
      return {
        round,
        current: round === currentRound,
        startsOn: day?.startsOn ?? today,
        endsOn: day?.endsOn ?? today,
        matches: overview
          .filter((m) => m.round === round)
          .map((m) => ({
            matchId: m.matchId,
            groupName: m.groupName,
            playerAName: m.playerA.name,
            playerBName: m.playerB.name,
          })),
        selection: selections.find((s) => s.round === round) ?? null,
      };
    });

  const matchById = new Map(overview.map((m) => [m.matchId, m]));
  const past: MotwPastPick[] = selections
    .filter((s) => !pickable.has(s.round))
    .map((s) => {
      const match = matchById.get(s.matchId);
      return {
        round: s.round,
        matchId: s.matchId,
        youtubeUrl: s.youtubeUrl,
        groupName: match?.groupName ?? "—",
        playerAName: match?.playerA.name ?? "—",
        playerBName: match?.playerB.name ?? "—",
      };
    })
    .sort((a, b) => b.round - a.round);

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader
        breadcrumb="Match of the Week"
        breadcrumbRoot={{ href: "/staff", label: "Staff-Bereich" }}
      />
      <main className="mx-auto w-full max-w-[900px] flex-1 px-6 py-12 sm:px-8">
        <h1 className="mb-3 text-[40px] text-brand-blue dark:text-white">
          Match of the Week
        </h1>
        <p className="mb-9 max-w-[640px] text-muted-foreground text-sm">
          Ein Match pro Spieltag wird auf der öffentlichen Übersicht
          hervorgehoben — mit Spoiler-Schutz für das Ergebnis. Wähle zu
          Wochenbeginn das Match der laufenden oder nächsten Woche; der
          YouTube-Link folgt, sobald das VOD hochgeladen ist.
        </p>
        <MotwManager weeks={weeks} past={past} />
      </main>
    </div>
  );
}
