"use client";

import { useMemo, useState, useTransition } from "react";
import { EmptyStateCard } from "@/components/empty-state-card";
import { SectionHeader } from "@/components/section-header";
import { Tick } from "@/components/tick";
import {
  MatchRow,
  SpieltagTimeline,
} from "@/features/public-league/components/public-league";
import { SpoilerSwitch } from "@/features/spoilers/components/spoiler-switch";
import { setFavorite } from "../actions";
import { favoritesWeek, keepRemoved } from "../favorites";
import type { FavoritesPageData } from "../queries";
import { FavoriteSearch } from "./favorite-search";
import { FavoritesTable } from "./favorites-table";

// The Favoriten page (docs/plans/favorites.md): the week first, then the
// players. One reveal state per match is shared by the match row and the
// table, so uncovering a result anywhere uncovers it everywhere on the page.
export function FavoritesView({
  data,
  meId,
  initialSpoilersOff,
  storedCount,
}: {
  data: FavoritesPageData;
  meId: string;
  initialSpoilersOff: boolean;
  // Favourites stored for the viewer, including those without a row this
  // season: tells "none yet" from "none of yours plays".
  storedCount: number;
}) {
  const [spoilersOff, setSpoilersOff] = useState(initialSpoilersOff);
  const [round, setRound] = useState(data.currentRound ?? 1);
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set());
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());
  const [shown, setShown] = useState({
    players: data.players,
    groups: data.groups,
  });
  const [lastData, setLastData] = useState(data);
  const [error, setError] = useState<string | null>(null);
  const [adding, startAdding] = useTransition();

  // Fresh data arrives after an add. A favourite removed here stays in view
  // until the next load, so it is carried over.
  if (data !== lastData) {
    setLastData(data);
    setShown((previous) => keepRemoved(data, previous, removed));
  }

  const active = useMemo(
    () =>
      new Set(
        shown.players
          .map((p) => p.userId)
          .filter((userId) => !removed.has(userId)),
      ),
    [shown.players, removed],
  );
  const week = favoritesWeek(shown.groups, round);
  const matchday = data.matchdays.find((m) => m.round === round) ?? null;

  function reveal(matchId: string) {
    setRevealed((previous) => new Set(previous).add(matchId));
  }

  async function toggle(userId: string) {
    const on = removed.has(userId);
    const flip = (set: ReadonlySet<string>) => {
      const next = new Set(set);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    };
    setError(null);
    setRemoved(flip);
    const result = await setFavorite({ playerId: userId, on });
    if (!result.ok) {
      setRemoved(flip);
      setError(result.error);
    }
  }

  function add(userId: string) {
    setError(null);
    setRemoved((previous) => {
      const next = new Set(previous);
      next.delete(userId);
      return next;
    });
    startAdding(async () => {
      const result = await setFavorite({ playerId: userId, on: true });
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  const search = (label: string) => (
    <div className="flex flex-col gap-2">
      <FavoriteSearch
        label={label}
        candidates={data.candidates}
        favoriteIds={active}
        onAdd={add}
        disabled={adding}
      />
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1040px] flex-1 px-6 pt-10 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <Tick size="l" />
          <h1 className="text-[28px] text-brand-blue leading-[1.1] sm:text-[34px] dark:text-white">
            Favoriten
          </h1>
          <span className="whitespace-nowrap font-semibold text-[13px] text-muted-foreground uppercase tracking-[0.12em]">
            · {data.seasonName}
          </span>
        </div>
        {shown.players.length > 0 ? (
          <SpoilerSwitch
            spoilersOff={spoilersOff}
            onChange={(off) => {
              setSpoilersOff(off);
              // Protection back on is a fresh cover, no half-revealed
              // leftovers (design/SPOILER-SCHUTZ.md §2.1).
              if (!off) {
                setRevealed(new Set());
              }
            }}
          />
        ) : null}
      </div>

      {shown.players.length === 0 ? (
        <EmptyStateCard
          className="mt-8 max-w-[640px]"
          title={
            storedCount === 0
              ? "Noch keine Favoriten"
              : "Keiner deiner Favoriten spielt mit"
          }
          action={search(
            storedCount === 0
              ? "Ersten Favoriten hinzufügen"
              : "Spieler hinzufügen",
          )}
        >
          {storedCount === 0
            ? "Merk dir Spieler, die du durch die Saison verfolgen willst. Hier siehst du dann auf einen Blick, gegen wen sie diese Woche spielen, wie es ausging und wo sie in der Tabelle stehen."
            : "Deine Favoriten sind in dieser Saison nicht dabei. Sie bleiben gespeichert und tauchen wieder auf, sobald sie spielen."}
        </EmptyStateCard>
      ) : (
        <div className="mt-8 flex flex-col gap-10">
          <section className="flex flex-col gap-4">
            <SectionHeader>Spielplan</SectionHeader>
            <SpieltagTimeline
              selected={round}
              total={data.totalRounds}
              current={data.currentRound}
              matchday={matchday}
              onSelect={setRound}
            />
            {week.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                Keiner deiner Favoriten spielt an diesem Spieltag.
              </p>
            ) : (
              <div className="grid grid-cols-1 items-start gap-x-8 gap-y-5 lg:grid-cols-2">
                {week.map((group) => (
                  <div
                    key={group.subDivisionId}
                    className="flex flex-col gap-2"
                  >
                    <p className="font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.12em]">
                      {group.name}
                    </p>
                    {group.matches.map((match) => (
                      <MatchRow
                        key={match.matchId}
                        match={match}
                        meId={meId}
                        spoilersOff={spoilersOff}
                        favoriteIds={active}
                        revealed={revealed.has(match.matchId)}
                        onReveal={() => reveal(match.matchId)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <SectionHeader count={active.size}>Deine Spieler</SectionHeader>
            <FavoritesTable
              players={shown.players}
              removedIds={removed}
              currentRound={data.currentRound}
              meId={meId}
              spoilersOff={spoilersOff}
              revealed={revealed}
              onReveal={reveal}
              onToggle={toggle}
            />
            <p className="px-1 text-[12.5px] text-muted-foreground">
              Platz und Bilanz wie in der öffentlichen Tabelle. Die Form zeigt
              die bisherigen Spieltage, älteste links. Solange das Ergebnis der
              laufenden Woche verdeckt ist, sind Platz und Bilanz es auch.
            </p>
            <div className="mt-3">{search("Spieler hinzufügen")}</div>
          </section>
        </div>
      )}
    </div>
  );
}
