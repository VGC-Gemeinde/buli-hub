"use client";

import Link from "next/link";
import { useState } from "react";
import { Tick } from "@/components/tick";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/features/season/components/player-avatar";
import type { MotwBlockData } from "../motw";

// The prominent Match-of-the-Week block on the public overview, shown only
// while its Spieltag is the current one. The result is spoiler-protected: it
// stays behind a click-to-reveal so visitors can watch the VOD first (the
// reveal is client-side only — a courtesy spoiler tag, not security).
export function MotwBlock({ motw }: { motw: MotwBlockData }) {
  const [revealed, setRevealed] = useState(false);
  const { match, groupName, youtubeUrl } = motw;
  // findMotw never yields a bye; the guard keeps the types honest.
  if (match.playerB === null) {
    return null;
  }

  return (
    <div className="mt-7 flex flex-col gap-5 rounded-xl border border-brand-orange/40 bg-brand-orange/5 px-5 py-4.5 sm:px-7 sm:py-5.5">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <div className="flex items-center gap-2.5">
          <Tick size="m" />
          <h2 className="font-bold font-heading text-[22px] text-brand-blue uppercase leading-none tracking-[0.03em] dark:text-white">
            Match of the Week
          </h2>
        </div>
        <span className="font-semibold text-[13px] text-muted-foreground uppercase tracking-[0.12em]">
          Spieltag {match.round} · {groupName}
        </span>
      </div>

      {/* Pairing: stacked on mobile, A · state · B on desktop. */}
      <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-4.5">
        <div className="flex min-w-0 items-center gap-3">
          <PlayerAvatar identity={match.playerA} size="size-10" />
          <span className="min-w-0 break-words font-bold font-heading text-[20px] text-brand-blue uppercase leading-[1.1] dark:text-white">
            {match.playerA.name}
          </span>
        </div>
        <div className="flex items-center gap-2 pl-[52px] sm:flex-col sm:gap-1 sm:pl-0">
          {match.reported ? (
            revealed ? (
              <span className="font-bold font-heading text-[24px] text-brand-blue leading-none tabular-nums dark:text-white">
                {match.scoreA} : {match.scoreB}
              </span>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-brand-orange/50"
                onClick={() => setRevealed(true)}
              >
                Ergebnis anzeigen
              </Button>
            )
          ) : (
            <span className="whitespace-nowrap rounded-full bg-muted px-3 py-[3px] font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.08em]">
              Offen
            </span>
          )}
          <span className="font-medium text-[11px] text-muted-foreground">
            {match.reported && !revealed ? "Spoiler-geschützt" : "Best of 3"}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-3 sm:justify-end">
          <span className="order-2 min-w-0 break-words font-bold font-heading text-[20px] text-brand-blue uppercase leading-[1.1] sm:order-1 sm:text-right dark:text-white">
            {match.playerB.name}
          </span>
          <span className="order-1 sm:order-2">
            <PlayerAvatar identity={match.playerB} size="size-10" />
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {youtubeUrl ? (
          <Button asChild size="sm">
            <a href={youtubeUrl} target="_blank" rel="noreferrer">
              Auf YouTube ansehen
            </a>
          </Button>
        ) : null}
        <Link
          href={`/match/${match.matchId}`}
          className="font-medium text-[13.5px] text-muted-foreground hover:text-brand-blue dark:hover:text-white"
        >
          Zum Match →
        </Link>
      </div>
    </div>
  );
}
