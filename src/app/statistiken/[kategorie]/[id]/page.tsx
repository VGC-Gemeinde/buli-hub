import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { EntryDetailView } from "@/features/pokemon-stats/components/entry-detail";
import {
  DetailBack,
  PokemonDetailView,
} from "@/features/pokemon-stats/components/pokemon-detail";
import {
  NoSheetsYet,
  NothingSelected,
  StatsContainer,
  StatsFilterRow,
  statsPath,
} from "@/features/pokemon-stats/components/stats-shell";
import { entryDetail, pokemonDetail } from "@/features/pokemon-stats/details";
import {
  CATEGORIES,
  type Category,
  DEFAULT_FILTER,
  statsHref,
} from "@/features/pokemon-stats/filter";
import { CATEGORY_KIND } from "@/features/pokemon-stats/labels";
import { loadStats } from "@/features/pokemon-stats/load";
import { moveCard } from "@/features/pokemon-stats/move-card";
import { groupedEntryId } from "@/features/pokemon-stats/sheets";

// The detail behind a ranking entry (specs/001-pokemon-usage-stats, Stories
// 4 and 5). An entry not played under the filters shows its empty state,
// not a 404: the link may come from another selection.
export default async function StatsDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ kategorie: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { kategorie, id } = await params;
  if (!CATEGORIES.includes(kategorie as Category)) {
    notFound();
  }
  const category = kategorie as Category;
  const query = await searchParams;
  // A forme now counted under its base was an entry of its own before
  // specs/002-pokemon-forme-groups; its links land on the grouped entry, the
  // query string travels along as on /statistiken.
  if (category === "pokemon") {
    const grouped = groupedEntryId(id);
    if (grouped !== id) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        for (const item of Array.isArray(value)
          ? value
          : value
            ? [value]
            : []) {
          params.append(key, item);
        }
      }
      const path = statsPath("pokemon", grouped);
      redirect(params.size > 0 ? `${path}?${params}` : path);
    }
  }
  const load = await loadStats(query);
  const path = statsPath(category, id);

  const body = () => {
    if (!load) {
      return <NoSheetsYet />;
    }
    const filters = <StatsFilterRow load={load} path={path} />;
    const absent = (
      <NothingSelected
        title="In dieser Auswahl nicht gespielt"
        body={load.label}
        resetHref={statsHref(path, DEFAULT_FILTER)}
      />
    );
    if (category === "pokemon") {
      const detail = pokemonDetail(load.sheets, id);
      return detail ? (
        <PokemonDetailView detail={detail} load={load} filters={filters} />
      ) : (
        <>
          {filters}
          {absent}
        </>
      );
    }
    const kind = CATEGORY_KIND[category];
    if (kind === "pokemon") {
      notFound();
    }
    const detail = entryDetail(load.sheets, kind, id);
    if (!detail) {
      return (
        <>
          {filters}
          {absent}
        </>
      );
    }
    return (
      <EntryDetailView
        category={category}
        detail={detail}
        card={category === "attacken" ? moveCard(detail.name) : null}
        load={load}
        filters={filters}
      />
    );
  };

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader section="liga" />
      <StatsContainer>
        <DetailBack />
        {body()}
      </StatsContainer>
    </div>
  );
}
