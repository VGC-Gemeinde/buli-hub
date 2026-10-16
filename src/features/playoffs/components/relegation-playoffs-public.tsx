"use client";

import Link from "next/link";
import { useState } from "react";
import { SectionHeader } from "@/components/section-header";
import { Tick } from "@/components/tick";
import { PlayerAvatar } from "@/features/season/components/player-avatar";
import { SpoilerPill } from "@/features/spoilers/components/spoiler-score";
import { SpoilerSwitch } from "@/features/spoilers/components/spoiler-switch";
import { hoverCard } from "@/lib/emphasis";
import { cn } from "@/lib/utils";
import {
  bracketRounds,
  type DivisionWeekSection,
  type PublicCard,
  type PublicSide,
  type PublicTiebreaker,
} from "../public-view";

// The public pages of Relegation und Playoffs (docs/plans/relegation-and-playoffs.md,
// design/PLAYOFFS.md). Spoiler protection is per browser, as everywhere:
// a played match nobody here plays in is covered by a pill in place of its
// score, and so is every name that only got into a later match by winning
// it. Revealing a match reveals the chain it came through. Nothing moves when
// something is revealed: a covered element takes the space of the revealed
// one.

// Which matches are covered for this viewer, and revealing one.
function useCovers(cards: readonly PublicCard[], spoilersOff: boolean) {
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set());
  const byId = new Map(cards.map((card) => [card.matchId, card]));
  const covered = (matchId: string | null): boolean => {
    if (matchId === null || spoilersOff || revealed.has(matchId)) {
      return false;
    }
    const card = byId.get(matchId);
    if (!card) {
      // A tiebreaker: covered like a played match until revealed.
      return true;
    }
    return !card.mine && (card.state === "played" || card.state === "decided");
  };
  const reveal = (matchId: string) => {
    const next = new Set(revealed);
    const walk = (id: string | null) => {
      if (id === null || next.has(id)) return;
      next.add(id);
      const card = byId.get(id);
      walk(card?.fromA ?? null);
      walk(card?.fromB ?? null);
    };
    walk(matchId);
    setRevealed(next);
  };
  // How a covered side is named: by the match it came through.
  const winnerOf = (matchId: string | null): string => {
    const card = matchId === null ? undefined : byId.get(matchId);
    return card ? `Sieger ${card.label}` : "Aus dem Tiebreaker";
  };
  return { covered, reveal, winnerOf };
}

function OpenCircle({ size }: { size: string }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border-[1.5px] border-border border-dashed",
        size,
      )}
    />
  );
}

const STATUS: Record<PublicCard["state"], string> = {
  open: "offen",
  waiting: "wartet",
  played: "gespielt",
  withheld: "Ergebnis folgt",
  decided: "kampflos",
};

// "12.–18. Okt." / "28. Sep.–4. Okt.": a week in a column head.
const SHORT_MONTHS = [
  "Jan.",
  "Feb.",
  "März",
  "Apr.",
  "Mai",
  "Juni",
  "Juli",
  "Aug.",
  "Sep.",
  "Okt.",
  "Nov.",
  "Dez.",
];
function weekDates(startsOn: string, endsOn: string): string {
  const day = (iso: string) => Number(iso.slice(8, 10));
  const month = (iso: string) => SHORT_MONTHS[Number(iso.slice(5, 7)) - 1];
  return month(startsOn) === month(endsOn)
    ? `${day(startsOn)}.–${day(endsOn)}. ${month(endsOn)}`
    : `${day(startsOn)}. ${month(startsOn)}–${day(endsOn)}. ${month(endsOn)}`;
}

type Week = { name: string; startsOn: string; endsOn: string };

// One side of a match card: avatar, name and where the player came from,
// the score on the right. The winner's row carries a navy rail and the bold
// name; the loser's is muted. A side that is not known yet shows what it
// will be ("Sieger HF 1", "Division 1a · Platz 2").
function CardRow({
  side,
  hidden,
  fallback,
  result,
  score,
}: {
  side: PublicSide;
  // The name came from a covered match: shown as where it comes from.
  hidden: boolean;
  fallback: string;
  result: "won" | "lost" | null;
  score: number | null;
}) {
  const known = side.kind === "player" && !hidden;
  const name =
    side.kind === "vacant"
      ? "Freilos"
      : side.kind === "player" && !hidden
        ? side.identity.name
        : side.kind === "placeholder"
          ? side.label
          : fallback;
  return (
    <div className="relative flex h-12 items-center gap-2.5 pr-3 pl-3.5">
      {result === "won" ? (
        <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-sm bg-brand-blue dark:bg-white" />
      ) : null}
      {known && side.kind === "player" ? (
        <PlayerAvatar identity={side.identity} size="size-7" />
      ) : (
        <OpenCircle size="size-7" />
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            "truncate text-[14px] leading-tight",
            !known && "text-muted-foreground",
            result === "won" && "font-bold text-brand-blue dark:text-white",
            result === "lost" && "text-muted-foreground",
          )}
        >
          {name}
        </span>
        {known && side.kind === "player" && side.note ? (
          <span className="truncate text-[11.5px] text-muted-foreground leading-tight">
            {side.note}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "w-4 text-right font-bold font-heading text-[17px] tabular-nums",
          result === "won"
            ? "text-brand-blue dark:text-white"
            : "text-muted-foreground",
        )}
      >
        {score}
      </span>
    </div>
  );
}

// A match card: a head with its name and state, two player rows. A covered
// result lays one pill over the score column, so nothing moves on reveal.
function BracketCard({
  card,
  covers,
  caption = card.label,
}: {
  card: PublicCard;
  covers: ReturnType<typeof useCovers>;
  caption?: string;
}) {
  const isCovered = covers.covered(card.matchId);
  const showResult =
    !isCovered && (card.state === "played" || card.state === "decided");
  const result = (me: "a" | "b") =>
    !showResult
      ? null
      : card.doubleLoss
        ? "lost"
        : card.winner === me
          ? "won"
          : card.winner !== null
            ? "lost"
            : null;
  const score = (value: number | null) =>
    showResult && card.state === "played" && !card.doubleLoss ? value : null;
  const status = showResult
    ? card.doubleLoss
      ? "Doppelniederlage"
      : card.state === "decided"
        ? "kampflos"
        : null
    : isCovered
      ? null
      : STATUS[card.state];
  return (
    <Link
      href={`/match/${card.matchId}`}
      className={cn(
        "relative block w-full overflow-hidden rounded-[10px] border bg-background",
        card.mine && "border-brand-orange/70",
        hoverCard,
      )}
    >
      <div
        className={cn(
          "flex h-7 items-center justify-between gap-2 border-b px-3.5 font-semibold text-[11px] uppercase tracking-[0.1em]",
          card.mine ? "bg-brand-orange/[0.08]" : "bg-muted/60",
        )}
      >
        <span className="truncate text-muted-foreground">{caption}</span>
        {status ? (
          <span
            className={cn(
              "shrink-0",
              card.state === "open"
                ? "text-brand-orange"
                : "text-muted-foreground",
            )}
          >
            {status}
          </span>
        ) : null}
      </div>
      <CardRow
        side={card.a}
        hidden={!card.mine && covers.covered(card.fromA)}
        fallback={covers.winnerOf(card.fromA)}
        result={result("a")}
        score={score(card.scoreA)}
      />
      <div className="border-t" />
      <CardRow
        side={card.b}
        hidden={!card.mine && covers.covered(card.fromB)}
        fallback={covers.winnerOf(card.fromB)}
        result={result("b")}
        score={score(card.scoreB)}
      />
      {isCovered ? (
        <SpoilerPill
          title="Ergebnis aufdecken"
          onReveal={() => covers.reveal(card.matchId)}
          className="absolute right-2 bottom-[18px] h-[60px] w-[26px]"
        />
      ) : null}
    </Link>
  );
}

function PageTitle({
  title,
  meta,
  sub,
  spoilersOff,
  onSpoilers,
}: {
  title: string;
  meta: string;
  // One line under the title, e.g. the week.
  sub?: string;
  spoilersOff: boolean;
  onSpoilers: (off: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <Tick size="l" />
          <h1 className="text-[28px] text-brand-blue leading-[1.1] sm:text-[40px] dark:text-white">
            {title}
          </h1>
          <span className="whitespace-nowrap font-semibold text-[13px] text-muted-foreground uppercase tracking-[0.12em]">
            · {meta}
          </span>
        </div>
        {sub ? (
          <span className="text-[14px] text-muted-foreground">{sub}</span>
        ) : null}
      </div>
      <SpoilerSwitch spoilersOff={spoilersOff} onChange={onSpoilers} />
    </div>
  );
}

// `/playoffs`: the title on top, the bracket below it, round by round.
export function PlayoffsBoard({
  cards,
  season,
  weeks,
  initialSpoilersOff,
}: {
  cards: PublicCard[];
  season: string;
  weeks: Week[];
  initialSpoilersOff: boolean;
}) {
  const [spoilersOff, setSpoilersOff] = useState(initialSpoilersOff);
  const covers = useCovers(cards, spoilersOff);
  return (
    <div className="mx-auto flex w-full max-w-[1040px] flex-1 flex-col gap-8 px-4 pt-10 pb-16 sm:px-6">
      <PageTitle
        title="Playoffs"
        meta={season}
        spoilersOff={spoilersOff}
        onSpoilers={setSpoilersOff}
      />
      <Bracket cards={cards} covers={covers} weeks={weeks} />
    </div>
  );
}

// The bracket. From sm up the rounds stand side by side, each match in its
// slot of the full bracket (a first-round bye leaves its slot empty), joined
// to the match it leads to by lines; it scrolls sideways when the rounds do
// not fit. On a phone the rounds stand one under the other, without lines.
function Bracket({
  cards,
  covers,
  weeks = [],
}: {
  cards: PublicCard[];
  covers: ReturnType<typeof useCovers>;
  weeks?: Week[];
}) {
  const rounds = bracketRounds(cards);
  const total = rounds.length;
  const at = new Set(
    rounds.flatMap((round) =>
      round.cards.map((card) => `${round.week}:${card.position}`),
    ),
  );
  const head = (round: (typeof rounds)[number]) => {
    const week = weeks[round.week - 1];
    return (
      <div className="flex items-baseline justify-between gap-3 border-b pb-2">
        <span className="font-bold font-heading text-[15px] text-brand-blue uppercase tracking-[0.04em] dark:text-white">
          {round.name}
        </span>
        {week ? (
          <span className="whitespace-nowrap text-[12.5px] text-muted-foreground tabular-nums">
            {week.name} · {weekDates(week.startsOn, week.endsOn)}
          </span>
        ) : null}
      </div>
    );
  };
  return (
    <>
      <div className="flex flex-col gap-8 sm:hidden">
        {rounds.map((round) => (
          <div key={round.week} className="flex flex-col gap-3">
            {head(round)}
            {round.cards.map((card) => (
              <BracketCard key={card.matchId} card={card} covers={covers} />
            ))}
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto pb-2 sm:block">
        <div
          className="grid min-w-max gap-x-12 gap-y-4"
          style={{
            gridTemplateColumns: `repeat(${total}, minmax(240px, 340px))`,
          }}
        >
          {rounds.map((round) => (
            <div key={`head-${round.week}`}>{head(round)}</div>
          ))}
          {rounds.map((round) => {
            const slots = 2 ** (total - round.week);
            return (
              <div key={round.week} className="flex flex-col">
                {Array.from({ length: slots }, (_, position) => {
                  const card = round.cards.find((c) => c.position === position);
                  const fed =
                    round.week > 1 &&
                    (at.has(`${round.week - 1}:${2 * position}`) ||
                      at.has(`${round.week - 1}:${2 * position + 1}`));
                  const last = round.week === total;
                  return (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: a slot is its position in the bracket
                      key={position}
                      className="relative flex min-h-[130px] flex-1 items-center py-2"
                    >
                      {card ? (
                        <>
                          <BracketCard card={card} covers={covers} />
                          {fed ? (
                            <span className="absolute top-1/2 right-full w-6 border-t" />
                          ) : null}
                          {!last ? (
                            <>
                              <span className="absolute top-1/2 left-full w-6 border-t" />
                              <span
                                className={cn(
                                  "absolute left-[calc(100%+1.5rem)] h-1/2 border-l",
                                  position % 2 === 0 ? "top-1/2" : "top-0",
                                )}
                              />
                            </>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// One relegation pairing: the upper division's player left, the lower one's
// right, the outcome in two lines underneath, whichever way it went (the
// number of lines would give the result away otherwise).
function Pairing({
  card,
  covers,
}: {
  card: PublicCard;
  covers: ReturnType<typeof useCovers>;
}) {
  const isCovered = covers.covered(card.matchId);
  const decided =
    !isCovered && (card.state === "played" || card.state === "decided");
  const name = (side: PublicSide, from: string | null) =>
    side.kind === "player" && !(covers.covered(from) && !card.mine)
      ? side.identity.name
      : null;
  const upper = name(card.a, card.fromA);
  const lower = name(card.b, card.fromB);
  const tier = card.tier;
  // Lower side wins: swap; upper wins or both lose: upper stays or drops.
  const lines: { mark: string; tone: string; text: string }[] = decided
    ? card.winner === "b"
      ? [
          {
            mark: "↑",
            tone: "text-zone-promote",
            text: `${lower ?? "Der Aufsteiger"} steigt in Division ${tier} auf`,
          },
          {
            mark: "↓",
            tone: "text-zone-demote",
            text: `${upper ?? "Der Absteiger"} steigt in Division ${tier + 1} ab`,
          },
        ]
      : card.doubleLoss
        ? [
            {
              mark: "↓",
              tone: "text-zone-demote",
              text: `${upper ?? "Der Spieler oben"} steigt in Division ${tier + 1} ab`,
            },
            {
              mark: "=",
              tone: "text-muted-foreground",
              text: `${lower ?? "Der Spieler unten"} bleibt in Division ${tier + 1}`,
            },
          ]
        : [
            {
              mark: "=",
              tone: "text-muted-foreground",
              text: `${upper ?? "Der Spieler oben"} bleibt in Division ${tier}`,
            },
            {
              mark: "=",
              tone: "text-muted-foreground",
              text: `${lower ?? "Der Spieler unten"} bleibt in Division ${tier + 1}`,
            },
          ]
    : [];
  const sideBlock = (
    side: PublicSide,
    from: string | null,
    align: "start" | "end",
  ) => (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5",
        align === "end" && "sm:flex-row-reverse sm:text-right",
      )}
    >
      {side.kind === "player" && !(covers.covered(from) && !card.mine) ? (
        <PlayerAvatar identity={side.identity} size="size-8" />
      ) : (
        <OpenCircle size="size-8" />
      )}
      <div className="min-w-0">
        <div className="truncate text-[14.5px]">
          {side.kind === "vacant"
            ? "Freilos"
            : side.kind === "player" && !(covers.covered(from) && !card.mine)
              ? side.identity.name
              : side.kind === "placeholder"
                ? side.label
                : "Aus dem Tiebreaker"}
        </div>
        {side.kind === "player" && side.note ? (
          <div
            className={cn(
              "flex items-center gap-1.5 text-[12px] text-muted-foreground",
              align === "end" && "sm:flex-row-reverse",
            )}
          >
            <span className="h-1 w-3 shrink-0 bg-zone-playoff" />
            <span className="truncate">{side.note}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
  return (
    <Link
      href={`/match/${card.matchId}`}
      className={cn(
        "flex flex-col gap-2 px-5 py-3.5",
        card.mine &&
          "bg-brand-orange/5 shadow-[inset_3px_0_0_var(--brand-orange)]",
        "transition-colors hover:bg-muted",
      )}
    >
      {/* Side by side from sm up; on a phone the two sides stack, the score
          beside both. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,1fr)_88px_minmax(0,1fr)] sm:gap-2">
        {sideBlock(card.a, card.fromA, "start")}
        <div className="row-span-2 flex justify-center sm:row-span-1">
          {isCovered ? (
            <SpoilerPill
              title="Ergebnis aufdecken"
              onReveal={() => covers.reveal(card.matchId)}
              className="h-4 w-11"
            />
          ) : card.state === "played" && !card.doubleLoss ? (
            <span className="font-bold text-[15px] tabular-nums">
              {card.scoreA} : {card.scoreB}
            </span>
          ) : (
            <span className="text-[13px] text-muted-foreground">
              {card.doubleLoss && decided ? "DN" : STATUS[card.state]}
            </span>
          )}
        </div>
        {sideBlock(card.b, card.fromB, "end")}
      </div>
      {isCovered ? (
        <div className="flex flex-col gap-1.5 pl-[42px]">
          <span className="my-[3px] h-[11px] w-[200px] rounded-full bg-muted" />
          <span className="my-[3px] h-[11px] w-[170px] rounded-full bg-muted" />
        </div>
      ) : lines.length > 0 ? (
        <div className="flex flex-col gap-0.5 pl-[42px]">
          {lines.map((line) => (
            <span key={line.text} className="text-[15px] sm:whitespace-nowrap">
              <span className={cn("font-bold", line.tone)}>{line.mark}</span>{" "}
              {line.text}
            </span>
          ))}
        </div>
      ) : null}
    </Link>
  );
}

// `/relegation`: one card per boundary, its pairings underneath.
export function RelegationBoard({
  cards,
  boundaries,
  season,
  weeks,
  initialSpoilersOff,
}: {
  cards: PublicCard[];
  boundaries: { tier: number; name: string }[];
  season: string;
  weeks: { name: string; startsOn: string; endsOn: string; content: string }[];
  initialSpoilersOff: boolean;
}) {
  const [spoilersOff, setSpoilersOff] = useState(initialSpoilersOff);
  const covers = useCovers(cards, spoilersOff);
  return (
    <div className="mx-auto flex w-full max-w-[1040px] flex-1 flex-col gap-10 px-4 pt-10 pb-16 sm:px-6">
      <PageTitle
        title="Relegation"
        meta={season}
        sub={
          weeks[0]
            ? `${weeks[0].name} · ${weekDates(weeks[0].startsOn, weeks[0].endsOn)}`
            : undefined
        }
        spoilersOff={spoilersOff}
        onSpoilers={setSpoilersOff}
      />
      <RelegationBoundaries
        cards={cards}
        boundaries={boundaries}
        covers={covers}
      />
    </div>
  );
}

// One card per boundary, its pairings underneath.
function RelegationBoundaries({
  cards,
  boundaries,
  covers,
}: {
  cards: PublicCard[];
  boundaries: { tier: number; name: string }[];
  covers: ReturnType<typeof useCovers>;
}) {
  return (
    <section className="flex flex-col gap-5">
      {boundaries.map((boundary) => (
        <div
          key={boundary.tier}
          className="overflow-hidden rounded-[14px] border"
        >
          <div className="flex items-center gap-2.5 px-5 py-3.5">
            <Tick size="m" color="navy" />
            <span className="font-bold font-heading text-[18px] text-brand-blue uppercase dark:text-white">
              {boundary.name}
            </span>
          </div>
          <div className="divide-y border-t">
            {cards
              .filter(
                (card) =>
                  card.stage === "relegation" && card.tier === boundary.tier,
              )
              .sort((x, y) => x.position - y.position)
              .map((card) => (
                <Pairing key={card.matchId} card={card} covers={covers} />
              ))}
          </div>
        </div>
      ))}
    </section>
  );
}

// The Liga-Übersicht's block under the Match of the Week: the running
// bracket round, the final once everything is played, and the way to both
// pages.
export function RelegationPlayoffsOverviewBlock({
  cards,
  spoilersOff,
}: {
  cards: PublicCard[];
  spoilersOff: boolean;
}) {
  const covers = useCovers(cards, spoilersOff);
  const rounds = bracketRounds(cards);
  // The running round: the first one with a match not decided yet.
  const running =
    rounds.find((round) =>
      round.cards.some(
        (card) => card.state === "open" || card.state === "waiting",
      ),
    ) ?? null;
  // After the final: the final, with its winner.
  const shownRound = running ?? rounds.at(-1) ?? null;
  const relegation = cards.some((card) => card.stage === "relegation");
  return (
    <section className="mt-4 flex flex-col gap-4 rounded-xl border px-5 py-5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Tick size="m" />
          <h2 className="font-bold font-heading text-[25px] text-brand-blue uppercase dark:text-white">
            Playoffs
          </h2>
          {running ? (
            <span className="font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.12em]">
              {running.name}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {rounds.length > 0 ? (
            <Link
              href="/playoffs"
              className="font-semibold text-[14px] text-brand-blue hover:underline dark:text-white"
            >
              Zu den Playoffs →
            </Link>
          ) : null}
          {relegation ? (
            <Link
              href="/relegation"
              className="font-semibold text-[14px] text-brand-blue hover:underline dark:text-white"
            >
              Zur Relegation →
            </Link>
          ) : null}
        </div>
      </div>
      {shownRound ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {shownRound.cards.map((card) => (
            <BracketCard key={card.matchId} card={card} covers={covers} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

// The tiebreakers of a division, for its view on the Liga-Übersicht: who
// plays for which shared place, and how it went.
export function TiebreakerList({
  tiebreakers,
  spoilersOff,
}: {
  tiebreakers: PublicTiebreaker[];
  spoilersOff: boolean;
}) {
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set());
  return (
    <ul className="flex flex-col divide-y rounded-xl border">
      {tiebreakers.map((tiebreaker) => {
        const covered =
          tiebreaker.state === "played" &&
          !tiebreaker.mine &&
          !spoilersOff &&
          !revealed.has(tiebreaker.matchId);
        const shown = tiebreaker.state === "played" && !covered;
        const name = (side: "a" | "b") => {
          const identity = side === "a" ? tiebreaker.a : tiebreaker.b;
          return (
            <span
              className={cn(
                "flex min-w-0 items-center gap-2",
                side === "b" && "flex-row-reverse text-right",
              )}
            >
              <PlayerAvatar identity={identity} size="size-7" />
              <span
                className={cn(
                  "truncate text-[14px]",
                  shown && tiebreaker.winner === side && "font-bold",
                  shown &&
                    tiebreaker.winner !== null &&
                    tiebreaker.winner !== side &&
                    "text-muted-foreground",
                )}
              >
                {identity.name}
              </span>
            </span>
          );
        };
        return (
          <li key={tiebreaker.matchId}>
            <Link
              href={`/match/${tiebreaker.matchId}`}
              className={cn(
                "flex flex-col gap-1.5 px-4 py-3 transition-colors hover:bg-muted",
                tiebreaker.mine && "bg-brand-orange/5",
              )}
            >
              <span className="font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.12em]">
                {tiebreaker.tableName} · {tiebreaker.placeLabel} geteilt
              </span>
              <div className="grid grid-cols-[1fr_64px_1fr] items-center gap-2">
                {name("a")}
                <span className="flex justify-center">
                  {covered ? (
                    <SpoilerPill
                      title="Ergebnis aufdecken"
                      onReveal={() =>
                        setRevealed(new Set([...revealed, tiebreaker.matchId]))
                      }
                      className="h-4 w-11"
                    />
                  ) : shown && !tiebreaker.doubleLoss ? (
                    <span className="font-bold text-[15px] tabular-nums">
                      {tiebreaker.scoreA} : {tiebreaker.scoreB}
                    </span>
                  ) : (
                    <span className="text-[13px] text-muted-foreground">
                      {shown
                        ? "DN"
                        : tiebreaker.state === "withheld"
                          ? "Ergebnis folgt"
                          : "offen"}
                    </span>
                  )}
                </span>
                {name("b")}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// One week after the regular season in a division's Spielplan on the
// Liga-Übersicht: its tiebreakers, Relegation pairings and Playoff round
// under micro labels, with the same spoiler protection as the pages.
export function DivisionWeekMatches({
  sections,
  cards,
  spoilersOff,
  empty = "Diese Division spielt in dieser Woche nicht.",
}: {
  sections: DivisionWeekSection[];
  // Every card, so revealing one reveals the chain it came through.
  cards: PublicCard[];
  spoilersOff: boolean;
  empty?: string;
}) {
  const covers = useCovers(cards, spoilersOff);
  if (sections.length === 0) {
    return <p className="text-[13px] text-muted-foreground">{empty}</p>;
  }
  return (
    <div className="flex flex-col gap-5">
      {sections.map((section) => (
        <div key={section.label} className="flex flex-col gap-2">
          <p className="font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.12em]">
            {section.label}
          </p>
          {section.kind === "tiebreaker" ? (
            <TiebreakerList
              tiebreakers={section.tiebreakers}
              spoilersOff={spoilersOff}
            />
          ) : (
            // Two compact cards per row: the half-width column has no room
            // for the Relegation page's pairing with its outcome lines.
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {section.cards.map((card) => (
                <BracketCard
                  key={card.matchId}
                  card={card}
                  covers={covers}
                  caption={
                    section.kind === "relegation"
                      ? `Paarung ${card.label}`
                      : card.label
                  }
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// The staff Spielplan once Relegation und Playoffs are published: the
// tiebreakers, the Relegation and the bracket as they stand, with every
// result (staff see the withheld ones too), each card linking to its match.
export function StaffRelegationPlayoffs({
  cards,
  tiebreakers,
  boundaries,
  spoilersOff,
}: {
  cards: PublicCard[];
  tiebreakers: PublicTiebreaker[];
  boundaries: { tier: number; name: string }[];
  spoilersOff: boolean;
}) {
  const covers = useCovers(cards, spoilersOff);
  return (
    <div className="flex flex-col gap-10">
      {tiebreakers.length > 0 ? (
        <section className="flex flex-col gap-4">
          <SectionHeader tickColor="navy">Tiebreaker</SectionHeader>
          <TiebreakerList tiebreakers={tiebreakers} spoilersOff={spoilersOff} />
        </section>
      ) : null}
      {boundaries.length > 0 ? (
        <section className="flex flex-col gap-4">
          <SectionHeader tickColor="navy">Relegation</SectionHeader>
          <RelegationBoundaries
            cards={cards}
            boundaries={boundaries}
            covers={covers}
          />
        </section>
      ) : null}
      {cards.some((card) => card.stage === "playoff") ? (
        <section className="flex flex-col gap-4">
          <SectionHeader tickColor="navy">Playoffs</SectionHeader>
          <Bracket cards={cards} covers={covers} />
        </section>
      ) : null}
    </div>
  );
}
