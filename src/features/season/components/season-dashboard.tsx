import Link from "next/link";
import { SectionHeader } from "@/components/section-header";
import { Tick } from "@/components/tick";
import { Button } from "@/components/ui/button";
import { PlayerLink } from "@/features/player-profile/components/player-link";
import { matchDisplayState, scoreFor } from "@/features/reporting/match-state";
import type { MatchResultLite } from "@/features/reporting/queries";
import type { StandingsRow } from "@/features/reporting/standings";
import { hoverRow } from "@/lib/emphasis";
import { cn } from "@/lib/utils";
import { daysUntil, type Identity, type PlayerMatch } from "../dashboard";
import { PlayerAvatar } from "./player-avatar";
import { StandingsPanel, type ZoneMap } from "./standings-panel";

const MONTHS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

function day(dateStr: string): number {
  return Number(dateStr.slice(8, 10));
}
function month(dateStr: string): string {
  return MONTHS[Number(dateStr.slice(5, 7)) - 1] ?? "";
}
function formatDeadline(dateStr: string): string {
  return `${day(dateStr)}. ${month(dateStr)}`;
}
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
// "5.–11. Okt." / "28. Sep. – 4. Okt.": the Spielplan's week. The full month
// names of `weekRange` crowd the opponent out of a column that shares the
// row with the table beside it.
function compactRange(startsOn: string, endsOn: string): string {
  const m = (d: string) => SHORT_MONTHS[Number(d.slice(5, 7)) - 1] ?? "";
  return m(startsOn) === m(endsOn)
    ? `${day(startsOn)}.–${day(endsOn)}. ${m(endsOn)}`
    : `${day(startsOn)}. ${m(startsOn)} – ${day(endsOn)}. ${m(endsOn)}`;
}
// "5.10.–11.10.", the phone-width week: a full month name does not fit beside
// an opponent in a 360px row.
function shortRange(startsOn: string, endsOn: string): string {
  const short = (d: string) => `${day(d)}.${Number(d.slice(5, 7))}.`;
  return `${short(startsOn)}–${short(endsOn)}`;
}
function deadlineHint(endsOn: string, today: string): string {
  const days = daysUntil(endsOn, today);
  if (days < 0) return "überfällig";
  if (days === 0) return "heute fällig";
  if (days === 1) return "noch 1 Tag";
  return `noch ${days} Tage`;
}

// The season progress strip: one segment per Spieltag, current in orange.
function ProgressStrip({ current, total }: { current: number; total: number }) {
  return (
    <div className="mt-4 mb-6 flex items-center gap-3.5">
      <div className="flex flex-1 gap-[5px]">
        {Array.from({ length: total }, (_, i) => i + 1).map((round) => (
          <div
            key={round}
            className={cn(
              "h-1.5 flex-1 rounded-[3px]",
              // Played weeks are navy in light mode, but navy on the dark
              // background scored 1.02:1 — invisible, and fainter than the
              // not-yet-played track (1.51:1), inverting the hierarchy. White at
              // 35% restores it, following the same light-navy/dark-white pattern
              // as `Tick`'s navy variant.
              round < current
                ? "bg-brand-blue/30 dark:bg-white/35"
                : round === current
                  ? "bg-brand-orange"
                  : "bg-muted dark:bg-white/12",
            )}
          />
        ))}
      </div>
      {/* 12px/0.04em, not 13px/0.1em: the caption shares this row with the bar
          (`flex-1`), so every pixel it takes is a pixel the bar loses. Montserrat
          is wider than the Barlow Condensed this was tuned for and the caption
          grew to 149px, visibly cutting the bar short. These values put it back
          at ~126px — the width the layout was designed around. */}
      <span className="whitespace-nowrap font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.04em]">
        Spieltag {current} von {total}
      </span>
    </div>
  );
}

// The hero: the player's next match. Swaps to the recorded result once reported.
function Hero({
  match,
  result,
  me,
  today,
}: {
  match: PlayerMatch | null;
  result: MatchResultLite | null;
  // The player themself, with their own picture: players found a generic
  // "Du" placeholder confusing and recognise themselves faster by their face.
  me: Identity;
  today: string;
}) {
  const meId = me.userId;
  if (!match) {
    return (
      <section className="rounded-lg border px-5 py-5 sm:px-[30px]">
        <p className="text-muted-foreground">
          Deine Spiele sind gemeldet. Die reguläre Saison ist für dich
          abgeschlossen.
        </p>
      </section>
    );
  }

  const label = (text: string) => (
    <div className="flex items-center gap-2">
      <Tick size="s" />
      <span className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.12em]">
        {text}
      </span>
    </div>
  );

  if (!match.opponent) {
    return (
      <section className="rounded-lg border px-5 py-5 sm:px-[30px]">
        {label(`Spieltag ${match.round}`)}
        <p className="mt-3 font-bold font-heading text-[32px] text-brand-blue uppercase leading-none dark:text-white">
          Spielfrei
        </p>
        <p className="mt-2 text-muted-foreground text-sm">
          Diese Woche hast du kein Match. Zeit zum Vorbereiten.
        </p>
      </section>
    );
  }

  const reported =
    result !== null &&
    !(result.outcome === "free_win" && result.confirmedAt === null);
  const pendingFreeWin =
    result !== null &&
    result.outcome === "free_win" &&
    result.confirmedAt === null;
  const daysLeft = daysUntil(match.endsOn, today);

  return (
    <section className="flex flex-col gap-5 rounded-lg border px-5 py-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-6 sm:px-[30px] sm:py-4">
      <div className="flex min-w-0 flex-col gap-3.5">
        {label(
          reported
            ? `Ergebnis · Spieltag ${match.round}`
            : `Nächstes Match · Spieltag ${match.round}`,
        )}
        <div className="flex min-w-0 items-center gap-3 sm:gap-4.5">
          <PlayerAvatar identity={me} size="size-[46px]" filled />
          <span className="-skew-x-[10deg] px-1 font-bold font-heading text-brand-orange text-xl">
            VS
          </span>
          <PlayerAvatar identity={match.opponent} size="size-[46px]" />
          <span className="min-w-0 truncate font-bold font-heading text-[22px] text-brand-blue uppercase leading-none dark:text-white">
            {match.opponent.name}
          </span>
        </div>
      </div>

      {reported && result ? (
        <Link
          href={`/match/${match.matchId}`}
          className="group flex flex-col items-start gap-2 sm:min-h-[74px] sm:items-end sm:justify-center"
        >
          <ReportedBadge result={result} meId={meId} />
          {result.disputed ? (
            <span className="rounded-full bg-destructive/10 px-2.5 py-[3px] font-semibold text-destructive text-xs">
              Angefochten
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-semibold text-brand-blue text-sm group-hover:underline dark:text-white">
              Ansehen{" "}
              <span
                aria-hidden
                className="transition-transform group-hover:translate-x-0.5"
              >
                →
              </span>
            </span>
          )}
        </Link>
      ) : pendingFreeWin ? (
        <Link
          href={`/match/${match.matchId}`}
          className="group flex flex-col items-start gap-2 sm:min-h-[74px] sm:items-end sm:justify-center"
        >
          <span className="rounded-full bg-brand-orange/12 px-4 py-2 font-semibold text-brand-blue text-sm dark:text-white">
            Freewin · wartet auf Bestätigung
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-brand-blue text-sm group-hover:underline dark:text-white">
            Ansehen{" "}
            <span
              aria-hidden
              className="transition-transform group-hover:translate-x-0.5"
            >
              →
            </span>
          </span>
        </Link>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-7">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:flex-col sm:items-start sm:gap-1">
            <span className="w-full font-semibold text-muted-foreground text-xs uppercase tracking-[0.14em] sm:w-auto">
              Deadline
            </span>
            <span className="font-bold font-heading text-2xl text-brand-blue uppercase dark:text-white">
              {formatDeadline(match.endsOn)}
            </span>
            <span
              className={cn(
                "rounded-full px-3 py-1 font-semibold text-[13px]",
                daysLeft <= 2
                  ? "bg-brand-orange text-white"
                  : "bg-brand-orange/12 text-brand-blue dark:text-white",
              )}
            >
              {deadlineHint(match.endsOn, today)}
            </span>
          </div>
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href={`/match/${match.matchId}`}>Ergebnis melden</Link>
          </Button>
        </div>
      )}
    </section>
  );
}

function ReportedBadge({
  result,
  meId,
}: {
  result: MatchResultLite;
  meId: string;
}) {
  const score = scoreFor(meId, result);
  return (
    <div className="flex items-center gap-3">
      {score.label ? (
        <span
          className={cn(
            "rounded-full px-2.5 py-[3px] font-semibold text-xs",
            score.label === "Sieg"
              ? "bg-brand-orange/12 text-brand-blue dark:text-white"
              : "bg-muted text-muted-foreground",
          )}
        >
          {score.label}
        </span>
      ) : null}
      <span className="whitespace-nowrap font-bold font-heading text-[30px] text-brand-blue leading-none tracking-[0.04em] dark:text-white">
        {score.self} : {score.opponent}
      </span>
    </div>
  );
}

// "Dein Spielplan" in the same anatomy as the Tabelle beside it: one card, a
// header row, rows at the table's row height, so both columns start on one
// line and keep one rhythm (docs/plans/player-dashboard-at-a-glance.md). Row
// states use the table's language too: a 6px rail on the left edge, orange for
// the running Spieltag, red for an overdue one.
function ScheduleTable({
  matches,
  resultByMatchId,
  meId,
  today,
}: {
  matches: PlayerMatch[];
  resultByMatchId: Map<string, MatchResultLite>;
  meId: string;
  today: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center border-b bg-muted/50 text-[11px] text-muted-foreground uppercase tracking-[0.1em]">
        <span className="py-2 pl-4 font-semibold">Spt.</span>
        <span className="py-2 pl-2 font-semibold">Gegner</span>
        <span className="py-2 pr-4 text-right font-semibold">Ergebnis</span>
      </div>
      {matches.map((match) => (
        <ScheduleRow
          key={match.matchId}
          match={match}
          result={resultByMatchId.get(match.matchId) ?? null}
          meId={meId}
          today={today}
        />
      ))}
    </div>
  );
}

function ScheduleRow({
  match,
  result,
  meId,
  today,
}: {
  match: PlayerMatch;
  result: MatchResultLite | null;
  meId: string;
  today: string;
}) {
  const state = matchDisplayState({
    match: {
      startsOn: match.startsOn,
      endsOn: match.endsOn,
      opponent: match.opponent,
    },
    result: result
      ? { outcome: result.outcome, confirmedAt: result.confirmedAt }
      : null,
    today,
  });
  const isBye = match.opponent === null;
  const pastBye = isBye && today > match.endsOn;
  const rail =
    state === "current"
      ? "bg-brand-orange"
      : state === "overdue"
        ? "bg-destructive"
        : null;

  return (
    <div
      className={cn(
        // 42px + the 1px border: the height of a (dense) table row beside it.
        "relative grid min-h-[43px] grid-cols-[44px_minmax(0,1fr)_auto] items-center border-b last:border-b-0",
        state === "current" && "bg-brand-orange/6",
        state === "overdue" && "bg-destructive/6",
        match.inherited && "bg-muted/30",
        !isBye && hoverRow,
      )}
    >
      {/* The row links to the match via a stretched link underneath; the
          opponent name links to their profile above it. Byes are not
          clickable. */}
      {isBye || !match.opponent ? null : (
        <Link
          href={`/match/${match.matchId}`}
          aria-label={`Zum Match gegen ${match.opponent.name}`}
          className="absolute inset-0"
        />
      )}
      {rail ? (
        <span className={cn("absolute inset-y-0 left-0 w-1.5", rail)} />
      ) : null}
      <span
        className={cn(
          "pl-4 font-semibold text-sm tabular-nums",
          state === "current" ? "text-brand-orange" : "text-muted-foreground",
        )}
      >
        {match.round}
      </span>
      {isBye ? (
        <span
          className={cn(
            "flex items-center gap-2.5 py-2 pl-2",
            pastBye && "opacity-55",
          )}
        >
          <span className="size-[26px] shrink-0 rounded-full border border-dashed" />
          <span className="font-medium text-[14.5px] text-muted-foreground">
            Spielfrei
          </span>
        </span>
      ) : match.opponent ? (
        <span className="flex min-w-0 items-center gap-2.5 py-2 pl-2">
          <PlayerAvatar identity={match.opponent} size="size-[26px]" />
          {/* `relative` lifts the profile link above the stretched match
              link. */}
          <PlayerLink
            userId={match.opponent.userId}
            name={match.opponent.name}
            className={cn(
              "relative truncate font-medium text-[14.5px]",
              match.inherited && "text-muted-foreground",
            )}
          />
        </span>
      ) : (
        <span />
      )}
      <span className={cn("pr-4 pl-3", pastBye && "opacity-55")}>
        <RowRight match={match} result={result} state={state} meId={meId} />
      </span>
    </div>
  );
}

// The right cell of a Spielplan row: the result once it counts, otherwise
// the week, flagged when it is this week or overdue.
function RowRight({
  match,
  result,
  state,
  meId,
}: {
  match: PlayerMatch;
  result: MatchResultLite | null;
  state: ReturnType<typeof matchDisplayState>;
  meId: string;
}) {
  const range = (
    <span className="whitespace-nowrap text-[13px] text-muted-foreground">
      <span className="hidden sm:inline">
        {compactRange(match.startsOn, match.endsOn)}
      </span>
      <span className="sm:hidden">
        {shortRange(match.startsOn, match.endsOn)}
      </span>
    </span>
  );
  if (state === "reported" && result) {
    const score = scoreFor(meId, result);
    return (
      <span className="flex items-center justify-end gap-2.5">
        {match.inherited ? (
          <span
            title="Vor deinem Einstieg als Ersatz. Das Match zählt für deinen Platz als Niederlage."
            className="whitespace-nowrap rounded-full border border-dashed px-2 py-[2px] font-semibold text-[11.5px] text-muted-foreground"
          >
            <span className="hidden sm:inline">Vor deinem Einstieg</span>
            <span className="sm:hidden">Vor Einstieg</span>
          </span>
        ) : null}
        {result.disputed ? (
          <span className="whitespace-nowrap rounded-full bg-destructive/10 px-2 py-[2px] font-semibold text-[11.5px] text-destructive">
            Angefochten
          </span>
        ) : null}
        {/* The chip spells out the outcome; an inherited row says what it is
            instead, its score is always the loss. */}
        {score.label && !match.inherited ? (
          <span
            className={cn(
              "hidden whitespace-nowrap rounded-full px-2 py-[2px] font-semibold text-[11.5px] sm:inline",
              score.label === "Sieg"
                ? "bg-brand-orange/12 text-brand-blue dark:text-white"
                : "bg-muted text-muted-foreground",
            )}
          >
            {score.label}
          </span>
        ) : null}
        <span className="min-w-[38px] whitespace-nowrap text-right font-bold font-heading text-[17px] text-brand-blue tracking-[0.04em] dark:text-white">
          {score.self} : {score.opponent}
        </span>
      </span>
    );
  }
  if (state === "pending_free_win") {
    return (
      <span className="flex justify-end">
        <span className="whitespace-nowrap rounded-full bg-brand-orange/12 px-2 py-[2px] font-semibold text-[11.5px] text-brand-blue dark:text-white">
          Freewin · offen
        </span>
      </span>
    );
  }
  if (state === "overdue") {
    return (
      <span className="flex items-center justify-end gap-2.5">
        <span className="whitespace-nowrap rounded-full bg-destructive/10 px-2 py-[2px] font-semibold text-[11.5px] text-destructive">
          Überfällig
        </span>
        {range}
      </span>
    );
  }
  // The running Spieltag is marked by the row itself (rail, tint, orange
  // number); a label here would only push the opponent's name out.
  return <span className="flex justify-end">{range}</span>;
}

// The full in-season dashboard: progress → hero → Spielplan + Tabelle.
export function InSeasonDashboard({
  groupName,
  currentRound,
  totalRounds,
  next,
  matches,
  resultByMatchId,
  standings,
  groupZones,
  divisionName,
  divisionStandings,
  divisionZones,
  divisionGroupLabels,
  defaultScope,
  me,
  groupWithheld,
  divisionWithheld,
  today,
}: {
  groupName: string;
  currentRound: number;
  totalRounds: number;
  next: PlayerMatch | null;
  matches: PlayerMatch[];
  resultByMatchId: Map<string, MatchResultLite>;
  standings: StandingsRow[];
  groupZones?: ZoneMap;
  divisionName: string;
  divisionStandings: StandingsRow[] | null;
  divisionZones?: ZoneMap;
  divisionGroupLabels?: Map<string, string>;
  defaultScope: "group" | "division";
  // The signed-in player, as the hero shows them.
  me: Identity;
  // Embargoed results that do not count in the tables yet
  // (docs/plans/standings-embargo.md).
  groupWithheld?: number;
  divisionWithheld?: number;
  today: string;
}) {
  const meId = me.userId;
  return (
    <>
      <ProgressStrip current={currentRound} total={totalRounds} />
      <Hero
        match={next}
        result={next ? (resultByMatchId.get(next.matchId) ?? null) : null}
        me={me}
        today={today}
      />
      <div className="mt-8 grid grid-cols-1 items-start gap-7 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <SectionHeader meta={`${totalRounds} Spieltage`}>
            Dein Spielplan
          </SectionHeader>
          <ScheduleTable
            matches={matches}
            resultByMatchId={resultByMatchId}
            meId={meId}
            today={today}
          />
        </section>

        <section className="flex flex-col gap-3">
          <StandingsPanel
            groupName={groupName}
            groupStandings={standings}
            groupZones={groupZones}
            divisionName={divisionName}
            divisionStandings={divisionStandings}
            divisionZones={divisionZones}
            divisionGroupLabels={divisionGroupLabels}
            defaultScope={defaultScope}
            meId={meId}
            groupWithheld={groupWithheld}
            divisionWithheld={divisionWithheld}
          />
        </section>
      </div>
    </>
  );
}
