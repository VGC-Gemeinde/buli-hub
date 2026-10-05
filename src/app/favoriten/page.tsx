import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { EmptyStateCard } from "@/components/empty-state-card";
import { SiteHeader } from "@/components/site-header";
import { Tick } from "@/components/tick";
import { SignInButton } from "@/features/auth/components/sign-in-button";
import { FavoritesView } from "@/features/favorites/components/favorites-view";
import { favoriteIds, favoritesPage } from "@/features/favorites/queries";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import { currentSeason } from "@/features/season/season-status";
import {
  parseSpoilersOff,
  SPOILERS_OFF_COOKIE,
} from "@/features/spoilers/spoilers";
import { germanToday } from "@/lib/german-time";

// Favoriten (docs/plans/favorites.md): the signed-in viewer's favourites,
// their week and their season. In the Liga section, which exists while a
// season runs; anonymous visitors get the explanation and the sign-in.
export default async function FavoritenPage() {
  const [{ window, phase }, current] = await Promise.all([
    currentSeason(),
    currentUser(),
  ]);

  if (phase !== "regular_season" || !window) {
    return (
      <Shell>
        <EmptyStateCard title="Keine laufende Saison" informational>
          Gerade läuft keine Saison. Deine Favoriten bleiben gespeichert und
          sind wieder da, sobald die nächste Saison läuft.
        </EmptyStateCard>
      </Shell>
    );
  }

  if (!current) {
    return (
      <Shell>
        <EmptyStateCard title="Spieler verfolgen" action={<SignInButton />}>
          Merk dir Spieler, die du durch die Saison verfolgen willst: ihre
          Matches der Woche, ihre Ergebnisse und ihren Tabellenplatz auf einer
          Seite. Melde dich dafür mit Discord an. Deine Favoriten sieht niemand
          außer dir.
        </EmptyStateCard>
      </Shell>
    );
  }

  const [ids, cookieStore] = await Promise.all([
    favoriteIds(current.userId),
    cookies(),
  ]);
  const data = await favoritesPage({
    windowId: window.id,
    seasonNumber: window.seasonNumber,
    today: germanToday(),
    viewer: {
      userId: current.userId,
      isStaff: roleAtLeast(current.role, "staff"),
    },
    favoriteIds: ids,
  });

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader section="liga" />
      <FavoritesView
        data={data}
        meId={current.userId}
        initialSpoilersOff={parseSpoilersOff(
          cookieStore.get(SPOILERS_OFF_COOKIE)?.value,
        )}
        storedCount={ids.size}
      />
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader section="liga" />
      <div className="mx-auto w-full max-w-[1040px] flex-1 px-6 pt-10 pb-16">
        <div className="flex items-center gap-2.5">
          <Tick size="l" />
          <h1 className="text-[28px] text-brand-blue leading-[1.1] sm:text-[34px] dark:text-white">
            Favoriten
          </h1>
        </div>
        <div className="mt-8 max-w-[640px]">{children}</div>
      </div>
    </div>
  );
}
