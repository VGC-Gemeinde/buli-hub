import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { RankingView } from "@/features/pokemon-stats/components/ranking-view";
import {
  NoSheetsYet,
  StatsContainer,
  StatsTitle,
} from "@/features/pokemon-stats/components/stats-shell";
import { CATEGORIES, type Category } from "@/features/pokemon-stats/filter";
import { loadStats } from "@/features/pokemon-stats/load";

// A ranking of the current season's team sheets
// (specs/001-pokemon-usage-stats). Public; outside a running season the
// stats are empty.
export default async function RankingPage({
  params,
  searchParams,
}: {
  params: Promise<{ kategorie: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { kategorie } = await params;
  if (!CATEGORIES.includes(kategorie as Category)) {
    notFound();
  }
  const category = kategorie as Category;
  const load = await loadStats(await searchParams);
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader section="liga" />
      <StatsContainer>
        <StatsTitle category={category} load={load} />
        {load ? (
          <RankingView category={category} load={load} />
        ) : (
          <NoSheetsYet />
        )}
      </StatsContainer>
    </div>
  );
}
