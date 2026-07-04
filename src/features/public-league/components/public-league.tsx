"use client";

import Link from "next/link";
import { useState } from "react";
import { PlayerAvatar } from "@/features/season/components/player-avatar";
import { StandingsTable } from "@/features/season/components/standings-panel";
import { cn } from "@/lib/utils";
import type {
  PublicDivision,
  PublicGroup,
  PublicMatch,
  PublicOverview,
} from "../queries";

// The public league overview: a division switcher over standings tables and the
// current matchday's pairings/results. Read-only; a logged-in visitor gets their
// row highlighted (meId) and a link back to their dashboard.
export function PublicLeague({
  overview,
  meId,
}: {
  overview: PublicOverview;
  meId: string;
}) {
  const [tier, setTier] = useState(overview.divisions[0]?.tier ?? 1);
  const division =
    overview.divisions.find((d) => d.tier === tier) ?? overview.divisions[0];

  return (
    <div className="mx-auto w-full max-w-[1040px] flex-1 px-6 pt-10 pb-16">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="h-[9px] w-[18px] -skew-x-[18deg] bg-brand-orange" />
          <h1 className="text-[34px] text-brand-blue leading-[1.1] dark:text-white">
            VGC Bundesliga
          </h1>
          <span className="font-semibold text-[13px] text-muted-foreground uppercase tracking-[0.12em]">
            · {overview.seasonName}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {overview.currentRound ? (
            <span className="font-semibold text-[13px] text-muted-foreground uppercase tracking-[0.1em]">
              Spieltag {overview.currentRound} / {overview.totalRounds}
            </span>
          ) : null}
          {meId ? (
            <Link
              href="/spieler"
              className="font-medium text-brand-orange text-sm hover:underline"
            >
              Zum Spieler-Dashboard →
            </Link>
          ) : null}
        </div>
      </div>

      {overview.divisions.length > 1 ? (
        <div className="mt-6 flex flex-wrap gap-1 self-start rounded-full border bg-muted/40 p-[3px]">
          {overview.divisions.map((d) => (
            <button
              key={d.tier}
              type="button"
              aria-pressed={d.tier === tier}
              onClick={() => setTier(d.tier)}
              className={cn(
                "rounded-full px-3.5 py-1.5 font-semibold text-[13px] uppercase tracking-[0.06em] transition-colors",
                d.tier === tier
                  ? "bg-brand-orange text-white"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {d.name}
            </button>
          ))}
        </div>
      ) : null}

      {division ? <DivisionView division={division} meId={meId} /> : null}
    </div>
  );
}

function DivisionView({
  division,
  meId,
}: {
  division: PublicDivision;
  meId: string;
}) {
  return (
    <div className="mt-8 flex flex-col gap-9">
      {division.divisionStandings ? (
        <section className="flex flex-col gap-3">
          <SectionHead title="Gesamttabelle" meta={division.name} />
          <StandingsTable
            standings={division.divisionStandings}
            meId={meId}
            zones={division.divisionZones ?? undefined}
            groupLabels={division.divisionGroupLabels ?? undefined}
          />
        </section>
      ) : null}

      {division.groups.map((group) => (
        <GroupView key={group.subDivisionId} group={group} meId={meId} />
      ))}
    </div>
  );
}

function GroupView({ group, meId }: { group: PublicGroup; meId: string }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHead title={group.name} />
      <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[1.15fr_1fr]">
        <StandingsTable
          standings={group.standings}
          meId={meId}
          zones={group.zones ?? undefined}
        />
        <MatchdayList matches={group.matches} meId={meId} />
      </div>
    </section>
  );
}

function MatchdayList({
  matches,
  meId,
}: {
  matches: PublicMatch[];
  meId: string;
}) {
  if (matches.length === 0) {
    return (
      <p className="text-[13px] text-muted-foreground">
        Für diesen Spieltag liegen noch keine Paarungen vor.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {matches.map((match) => (
        <MatchRow key={match.matchId} match={match} meId={meId} />
      ))}
    </div>
  );
}

function MatchRow({ match, meId }: { match: PublicMatch; meId: string }) {
  const mine = match.playerA.userId === meId || match.playerB?.userId === meId;
  const className = cn(
    "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
    mine && "border-brand-orange/40 bg-brand-orange/5",
    match.playerB && "transition-colors hover:border-brand-orange/50",
  );
  const content = (
    <>
      <Side
        identity={match.playerA}
        winner={match.winnerId === match.playerA.userId}
        align="left"
      />
      <span className="shrink-0 text-center font-semibold text-muted-foreground text-xs tabular-nums">
        {match.playerB === null ? (
          "spielfrei"
        ) : match.reported ? (
          // A pending free win is not shown publicly until confirmed → „offen".
          <span className="text-foreground">
            {match.scoreA} : {match.scoreB}
          </span>
        ) : (
          "offen"
        )}
      </span>
      {match.playerB ? (
        <Side
          identity={match.playerB}
          winner={match.winnerId === match.playerB.userId}
          align="right"
        />
      ) : (
        <span className="min-w-0 flex-1" />
      )}
    </>
  );
  // Real matches link to their public detail page; byes are not clickable.
  return match.playerB ? (
    <Link href={`/match/${match.matchId}`} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

function Side({
  identity,
  winner,
  align,
}: {
  identity: { userId: string; name: string; avatarUrl: string | null };
  winner: boolean;
  align: "left" | "right";
}) {
  return (
    <span
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2",
        align === "right" && "flex-row-reverse",
      )}
    >
      <PlayerAvatar identity={identity} size="size-[22px]" />
      <span
        className={cn("truncate", winner ? "font-semibold" : "font-medium")}
      >
        {identity.name}
      </span>
    </span>
  );
}

function SectionHead({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="flex items-baseline justify-between border-b pb-2.5">
      <div className="flex items-center gap-2.5">
        <div className="h-[11px] w-[22px] -skew-x-[18deg] bg-brand-orange" />
        <h2 className="text-brand-blue text-xl dark:text-white">{title}</h2>
      </div>
      {meta ? (
        <span className="text-[13px] text-muted-foreground">{meta}</span>
      ) : null}
    </div>
  );
}
