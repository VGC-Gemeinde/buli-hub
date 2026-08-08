import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionLink } from "@/components/links";
import { SiteHeader } from "@/components/site-header";
import { TeamSheetCards } from "@/features/teamsheets/components/team-sheet-cards";
import { parseTeamsheet } from "@/features/teamsheets/parse";
import { getTeamSheet } from "@/features/teamsheets/queries";
import { sheetCards } from "@/features/teamsheets/view";

// A stored team sheet, public and readable by anyone holding the link. The page
// carries no result and no opponent on purpose: it is linked from the match
// view and from the Discord results post, and spoiler protection belongs to
// those surfaces, not to a team.
export const metadata: Metadata = {
  // Unguessable but public. Keeping it out of search results means a player's
  // team is found by people who were pointed at it, not by people searching
  // for the player.
  robots: { index: false, follow: false },
};

export default async function PastePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sheet = await getTeamSheet(id);
  if (!sheet) {
    notFound();
  }

  // The stored text is already canonical — parsing it back is how it becomes
  // renderable, and it cannot fail for anything that passed validation on the
  // way in.
  const parsed = parseTeamsheet(sheet.ots);
  if (!parsed.ok) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader breadcrumb="Teamsheet" />
      <main className="mx-auto w-full max-w-[1040px] flex-1 px-6 py-11 sm:px-8">
        <header className="mb-8">
          <h1 className="font-heading text-[34px] text-brand-blue leading-[1.05] dark:text-white">
            Team von {sheet.playerName}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="font-semibold text-[12.5px] text-muted-foreground uppercase tracking-[0.12em]">
              Saison {sheet.seasonNumber}
              <span className="px-1.5 text-border">·</span>
              Spieltag {sheet.round}
            </span>
            <ActionLink
              href={`/match/${sheet.matchId}`}
              className="text-[13px]"
            >
              Zum Match
            </ActionLink>
          </div>
        </header>

        <TeamSheetCards cards={sheetCards(parsed.mons)} ots={sheet.ots} />
      </main>
    </div>
  );
}
