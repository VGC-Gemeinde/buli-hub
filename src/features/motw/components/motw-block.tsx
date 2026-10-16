"use client";

import { Eye, Lock, Play, Trophy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlayerLink } from "@/features/player-profile/components/player-link";
import type { Identity } from "@/features/season/dashboard";
import { cn } from "@/lib/utils";
import type { MotwBlockData } from "../motw";

// The Match-of-the-Week billboard on the public overview (design/
// MATCH-OF-THE-WEEK.md §2): the league's one editorial moment per week, the
// only dark panel on the page. It features the most recently confirmed match,
// so while a new Spieltag runs unconfirmed it carries the previous week
// (docs/plans/motw-candidates.md). Before the VOD the result is withheld from
// the public (the row carries no score — `embargo`); staff and participants
// get the reveal with a "not public yet" marker. After the VOD it stays behind
// a click-to-reveal so visitors can watch first (client-side reveal — a
// courtesy spoiler tag, not security). Desktop is the A · state · B
// broadcast row; mobile stacks the players with the state box between them.
//
// When the featured match is the Playoff final the block is its final
// variant (docs/plans/relegation-and-playoffs.md): gold where it is orange,
// the trophy and "Finale" as the title, and once the result is revealed the
// winner carries the title of the season and the other side dims.
export function MotwBlock({
  motw,
  season,
}: {
  motw: MotwBlockData;
  // "Saison 9", for the champion's title in the final variant.
  season?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const { match, groupName, weekName, youtubeUrl, isCurrentRound, final } =
    motw;
  const embargo = match.embargo?.access ?? null;
  // The final, played and revealed: who won it.
  const champion =
    final && revealed && match.reported && embargo !== "withheld"
      ? match.winnerId
      : null;
  const decided = final && revealed && match.reported && embargo !== "withheld";
  // findMotw never yields a bye; the guard keeps the types honest.
  if (match.playerB === null) {
    return null;
  }

  return (
    // A container: the layout follows the block's own width, not the
    // window's, so it holds in a narrow column as well.
    <div className="@container relative mt-7 overflow-hidden rounded-xl bg-brand-blue text-white">
      {/* Signature elements: orange top strip + logo watermark. */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-x-0 top-0 h-[3px]",
          final ? "bg-zone-champion" : "bg-brand-orange",
        )}
      />
      {/* biome-ignore lint/performance/noImgElement: decorative watermark; next/image adds nothing for a local SVG */}
      <img
        src="/logo.svg"
        alt=""
        aria-hidden
        className="-right-[70px] -bottom-[60px] pointer-events-none absolute w-[320px] -rotate-[10deg] rounded-[36px] opacity-[0.08]"
      />

      <div className="relative flex flex-col gap-5 px-5 py-5 sm:gap-6 sm:px-8 sm:py-6">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <div className="flex items-center gap-2.5">
            {final ? (
              <Trophy
                aria-hidden
                className="size-5 shrink-0 text-zone-champion"
              />
            ) : (
              <span
                aria-hidden
                className="h-2.5 w-5 -skew-x-[18deg] shrink-0 bg-brand-orange"
              />
            )}
            <h2 className="whitespace-nowrap font-bold font-heading text-[20px] text-white uppercase leading-none tracking-[0.04em] sm:text-[25px]">
              {final ? "Finale" : "Match of the Week"}
            </h2>
          </div>
          {final ? null : (
            <span className="font-semibold text-[12px] text-white/60 uppercase tracking-[0.14em]">
              {weekName} · {groupName}
            </span>
          )}
        </div>

        {/* Three layouts by the block's own width: stacked on a phone; from
            512px a scoreboard, both players on one line and the state
            centred under them; from 768px the broadcast row A · state · B. */}
        <div className="flex flex-col gap-4 @lg:grid @lg:grid-cols-2 @lg:items-center @lg:gap-x-6 @lg:gap-y-3 @3xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] @3xl:gap-y-0">
          <Side
            identity={match.playerA}
            rank={motw.rankA}
            align="left"
            title={champion === match.playerA.userId ? season : undefined}
            dimmed={decided && champion !== match.playerA.userId}
          />
          {/* Fixed footprint so state changes never relayout the card. */}
          <div className="flex h-[74px] min-w-0 flex-col items-center justify-center gap-[7px] @lg:col-span-2 @lg:row-start-2 @3xl:col-span-1 @3xl:col-start-2 @3xl:row-start-1 @3xl:min-w-[190px]">
            {!match.reported ? (
              <>
                <span className="whitespace-nowrap rounded-full border border-white/20 bg-white/10 px-4 py-1.5 font-semibold text-[12px] uppercase tracking-[0.1em]">
                  {/* The block can carry a week that is already over: an
                      overdue featured match must not claim to be running. */}
                  {isCurrentRound ? "Läuft diese Woche" : "Noch nicht gespielt"}
                </span>
                <span className="text-[11.5px] text-white/55">Best of 3</span>
              </>
            ) : embargo === "withheld" ? (
              // Played, but the result is withheld until the VOD is live:
              // nothing to reveal, the chip says when it comes.
              <>
                <span
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-full border bg-white/8 px-4 py-1.5 font-semibold text-[12px] uppercase tracking-[0.1em]",
                    final
                      ? "border-zone-champion/70"
                      : "border-brand-orange/65",
                  )}
                >
                  <Lock
                    aria-hidden
                    className={cn(
                      "size-3.5",
                      final ? "text-zone-champion" : "text-brand-orange",
                    )}
                  />
                  Ergebnis folgt mit dem VOD
                </span>
                <span className="text-[11.5px] text-white/55">
                  Gespielt · Best of 3
                </span>
              </>
            ) : revealed ? (
              <>
                <span className="font-bold font-heading text-[34px] leading-none tabular-nums sm:text-[46px]">
                  {match.scoreA} : {match.scoreB}
                </span>
                <span className="text-[11.5px] text-white/55">
                  {embargo === "preview"
                    ? "Best of 3 · noch nicht öffentlich"
                    : "Best of 3 · gemeldet"}
                </span>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  className={cn(
                    "flex items-center gap-2 rounded-[10px] border bg-white/8 px-5 py-[11px] font-semibold text-sm text-white transition-colors",
                    final
                      ? "border-zone-champion/70 hover:bg-zone-champion/18"
                      : "border-brand-orange/65 hover:bg-brand-orange/18",
                  )}
                >
                  <Eye
                    aria-hidden
                    className={cn(
                      "size-4",
                      final ? "text-zone-champion" : "text-brand-orange",
                    )}
                  />
                  Ergebnis aufdecken
                </button>
                {embargo === "preview" ? (
                  <span className="flex items-center gap-1.5 text-center text-[11.5px] text-white/55">
                    <Lock aria-hidden className="size-3 text-brand-orange" />
                    Noch nicht öffentlich, erst mit dem VOD
                  </span>
                ) : (
                  <span className="text-center text-[11.5px] text-white/55">
                    Spoiler-Schutz: erst das VOD ansehen
                  </span>
                )}
              </>
            )}
          </div>
          <Side
            identity={match.playerB}
            rank={motw.rankB}
            align="right"
            title={champion === match.playerB.userId ? season : undefined}
            dimmed={decided && champion !== match.playerB.userId}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3.5">
          {youtubeUrl ? (
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg bg-brand-orange px-[18px] py-[9px] font-semibold text-sm text-white transition-colors hover:bg-[#ff8d24]"
            >
              <Play aria-hidden className="size-3.5 fill-current" />
              Auf YouTube ansehen
            </a>
          ) : (
            // Same footprint as the button — when the link lands, only the
            // fill changes. "VOD folgt" makes no timing promise.
            <span className="flex items-center gap-2 rounded-lg border border-white/35 border-dashed px-[18px] py-2 font-medium text-sm text-white/55">
              <Play aria-hidden className="size-3.5" />
              VOD folgt
            </span>
          )}
          {/* Wrapped lines align left (DESIGN.md §6): below sm the link takes
              its own left-aligned line, flush right only on the sm+
              one-liner. */}
          <Link
            href={`/match/${match.matchId}`}
            className="w-full font-medium text-[13.5px] text-white/70 transition-colors hover:text-white sm:ml-auto sm:w-auto"
          >
            Zum Match →
          </Link>
        </div>
      </div>
    </div>
  );
}

function Side({
  identity,
  rank,
  align,
  title,
  dimmed = false,
}: {
  identity: Identity;
  rank: number | null;
  align: "left" | "right";
  // The final's winner: the season they are champion of.
  title?: string;
  dimmed?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-3.5 transition-opacity",
        align === "left" && "@lg:col-start-1 @lg:row-start-1",
        align === "right" &&
          "@lg:col-start-2 @lg:row-start-1 @lg:flex-row-reverse @3xl:col-start-3",
        dimmed && "opacity-45",
      )}
    >
      <Avatar
        className={cn(
          "size-11 shrink-0 @lg:size-[50px]",
          title ? "border-2 border-zone-champion" : "border border-white/22",
        )}
      >
        {identity.avatarUrl ? (
          <AvatarImage src={identity.avatarUrl} alt="" />
        ) : null}
        <AvatarFallback className="bg-white/10 font-semibold text-white">
          {identity.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          "flex min-w-0 flex-col gap-0.5",
          align === "right" && "@lg:items-end @lg:text-right",
        )}
      >
        <PlayerLink
          userId={identity.userId}
          name={identity.name}
          className="break-words font-bold font-heading text-[22px] text-white uppercase leading-[1.02] @lg:text-[24px] @4xl:text-[32px]"
        />
        {title ? (
          <span className="flex w-fit items-center gap-1.5 rounded-full bg-zone-champion px-2.5 py-[3px] font-bold text-[11.5px] text-brand-blue uppercase tracking-[0.1em]">
            <Trophy aria-hidden className="size-3.5" />
            Meister {title}
          </span>
        ) : rank !== null ? (
          <span className="font-medium text-[12px] text-white/55">
            Platz {rank}
          </span>
        ) : null}
      </div>
    </div>
  );
}
