import { Trophy } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/features/season/components/player-avatar";
import type { Identity } from "@/features/season/dashboard";
import { cn } from "@/lib/utils";
import type { DashboardHero } from "../dashboard";

const OUTCOME = {
  promoted: {
    mark: "↑",
    title: "Aufstieg",
    tone: "bg-zone-promote text-white",
  },
  demoted: { mark: "↓", title: "Abstieg", tone: "bg-zone-demote text-white" },
  stays: {
    mark: "=",
    title: "Klassenerhalt",
    tone: "bg-muted text-foreground",
  },
} as const;

// The Spieler-Dashboard's hero after the regular season
// (docs/plans/relegation-and-playoffs.md): the next match with its stakes,
// or the season outcome, the champion's in gold.
export function AfterSeasonHero({
  hero,
  me,
  season,
}: {
  hero: DashboardHero;
  me: Identity;
  season: string;
}) {
  if (hero.kind === "outcome") {
    if (hero.champion) {
      return (
        <section className="mt-6 flex items-center gap-5 rounded-xl border-2 border-zone-champion bg-zone-champion px-6 py-6 text-brand-blue">
          <Trophy aria-hidden className="size-10 shrink-0" />
          <div className="min-w-0">
            <div className="font-bold text-[12px] uppercase tracking-[0.12em]">
              Meister {season}
            </div>
            <div className="truncate font-extrabold text-[34px] uppercase leading-tight">
              {me.name}
            </div>
          </div>
        </section>
      );
    }
    const look = OUTCOME[hero.outcome];
    return (
      <section className="mt-6 flex flex-wrap items-center gap-5 rounded-xl border px-6 py-6">
        <span
          aria-hidden
          className={cn(
            "flex size-[52px] shrink-0 items-center justify-center rounded-lg font-bold text-[26px]",
            look.tone,
          )}
        >
          {look.mark}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.12em]">
            Dein Saisonergebnis
          </div>
          <div className="font-extrabold text-[28px] text-brand-blue uppercase leading-tight dark:text-white">
            {look.title}
          </div>
          <div className="text-[14px] text-muted-foreground">
            Nächste Saison in Division {hero.nextTier}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6 flex flex-col gap-4 rounded-xl border border-brand-orange/40 bg-brand-orange/5 px-6 py-5">
      <div className="font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.12em]">
        {hero.stage}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <PlayerAvatar identity={me} size="size-11" />
        <span className="font-semibold text-[13px] text-muted-foreground uppercase">
          vs
        </span>
        {hero.opponent.kind === "player" ? (
          <>
            <PlayerAvatar identity={hero.opponent.identity} size="size-11" />
            <span className="font-bold font-heading text-[22px] text-brand-blue uppercase dark:text-white">
              {hero.opponent.identity.name}
            </span>
          </>
        ) : (
          <>
            <span className="size-11 rounded-full border-[1.5px] border-border border-dashed" />
            <span className="text-[18px] text-muted-foreground">
              {hero.opponent.label}
            </span>
          </>
        )}
        <div className="sm:ml-auto">
          {hero.opponent.kind === "player" ? (
            <Button asChild>
              <Link href={`/match/${hero.matchId}`}>Ergebnis melden</Link>
            </Button>
          ) : (
            <Button type="button" disabled>
              Gegner steht noch nicht fest
            </Button>
          )}
        </div>
      </div>
      {hero.stakes ? (
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border px-3 py-1 text-[13px]">
            <span className="font-semibold uppercase tracking-[0.08em]">
              Sieg
            </span>{" "}
            · {hero.stakes.win}
          </span>
          <span className="rounded-full border px-3 py-1 text-[13px]">
            <span className="font-semibold uppercase tracking-[0.08em]">
              Niederlage
            </span>{" "}
            · {hero.stakes.loss}
          </span>
        </div>
      ) : null}
    </section>
  );
}
