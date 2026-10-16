import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { RelegationBoard } from "@/features/playoffs/components/relegation-playoffs-public";
import { publicRelegationPlayoffs } from "@/features/playoffs/queries";
import { publicWeekContents } from "@/features/playoffs/week-contents";
import { boundaryName } from "@/features/relegation/pairings";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import { currentSeason } from "@/features/season/season-status";
import {
  parseSpoilersOff,
  SPOILERS_OFF_COOKIE,
} from "@/features/spoilers/spoilers";
import { seasonName } from "@/features/staff/registration-window";

// The Relegation (docs/plans/relegation-and-playoffs.md): public from the
// moment Relegation und Playoffs are published, until the next season.
export default async function RelegationPage() {
  const [{ window }, current] = await Promise.all([
    currentSeason(),
    currentUser(),
  ]);
  if (!window) {
    notFound();
  }
  const isStaff = current !== null && roleAtLeast(current.role, "staff");
  const [data, cookieStore] = await Promise.all([
    publicRelegationPlayoffs(window.id, {
      userId: current?.userId ?? null,
      isStaff,
    }),
    cookies(),
  ]);
  const relegation = data?.cards.filter((card) => card.stage === "relegation");
  if (!data || !relegation || relegation.length === 0) {
    notFound();
  }
  const tiers = [...new Set(relegation.map((card) => card.tier))].sort(
    (a, b) => a - b,
  );
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader section="liga" />
      <RelegationBoard
        cards={data.cards}
        boundaries={tiers.map((tier) => ({
          tier,
          name: boundaryName(tier, tier + 1),
        }))}
        season={seasonName(window.seasonNumber)}
        weeks={publicWeekContents({
          weeks: data.weeks,
          cards: data.cards,
          tiebreakers: data.tiebreakers.length,
        })}
        initialSpoilersOff={parseSpoilersOff(
          cookieStore.get(SPOILERS_OFF_COOKIE)?.value,
        )}
      />
    </div>
  );
}
