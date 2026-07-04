import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { matchDisplayState, scoreFor } from "@/features/reporting/match-state";
import type { MatchResultLite } from "@/features/reporting/queries";
import type { StandingsRow } from "@/features/reporting/standings";
import { cn } from "@/lib/utils";
import { daysUntil, type Identity, type PlayerMatch } from "../dashboard";

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

// Game differential with an explicit sign, e.g. "+11", "0", "−3".
function formatDiff(diff: number): string {
  if (diff > 0) return `+${diff}`;
  if (diff < 0) return `−${-diff}`;
  return "0";
}

function day(dateStr: string): number {
  return Number(dateStr.slice(8, 10));
}
function month(dateStr: string): string {
  return MONTHS[Number(dateStr.slice(5, 7)) - 1] ?? "";
}
function formatDeadline(dateStr: string): string {
  return `${day(dateStr)}. ${month(dateStr)}`;
}
function weekRange(startsOn: string, endsOn: string): string {
  return month(startsOn) === month(endsOn)
    ? `${day(startsOn)}.–${day(endsOn)}. ${month(endsOn)}`
    : `${day(startsOn)}. ${month(startsOn)} – ${day(endsOn)}. ${month(endsOn)}`;
}
function deadlineHint(endsOn: string, today: string): string {
  const days = daysUntil(endsOn, today);
  if (days < 0) return "überfällig";
  if (days === 0) return "heute fällig";
  if (days === 1) return "noch 1 Tag";
  return `noch ${days} Tage`;
}

function SectionHeading({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="flex items-baseline justify-between border-b pb-3">
      <div className="flex items-center gap-2.5">
        <div className="h-[11px] w-[22px] -skew-x-[18deg] bg-brand-orange" />
        <h2 className="text-brand-blue text-2xl dark:text-white">{title}</h2>
      </div>
      {meta ? (
        <span className="text-[13px] text-muted-foreground">{meta}</span>
      ) : null}
    </div>
  );
}

function PlayerAvatar({
  identity,
  size = "size-7",
  filled = false,
}: {
  identity: Identity;
  size?: string;
  filled?: boolean;
}) {
  return (
    <Avatar className={size}>
      {identity.avatarUrl ? (
        <AvatarImage src={identity.avatarUrl} alt="" />
      ) : null}
      <AvatarFallback
        className={cn(
          "font-semibold text-[10px]",
          filled && "bg-brand-blue text-white",
        )}
      >
        {identity.name.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

// The season progress strip: one segment per Spieltag, current in orange.
function ProgressStrip({ current, total }: { current: number; total: number }) {
  return (
    <div className="mt-4.5 mb-8 flex items-center gap-3.5">
      <div className="flex flex-1 gap-[5px]">
        {Array.from({ length: total }, (_, i) => i + 1).map((round) => (
          <div
            key={round}
            className={cn(
              "h-1.5 flex-1 rounded-[3px]",
              round < current
                ? "bg-brand-blue/30"
                : round === current
                  ? "bg-brand-orange"
                  : "bg-muted",
            )}
          />
        ))}
      </div>
      <span className="whitespace-nowrap font-semibold text-[13px] text-muted-foreground uppercase tracking-[0.1em]">
        Spieltag {current} von {total}
      </span>
    </div>
  );
}

// The hero: the player's next match. Swaps to the recorded result once reported.
function Hero({
  match,
  result,
  meId,
  today,
}: {
  match: PlayerMatch | null;
  result: MatchResultLite | null;
  meId: string;
  today: string;
}) {
  if (!match) {
    return (
      <section className="rounded-lg border px-[30px] py-[26px]">
        <p className="text-muted-foreground">
          Deine Spiele sind gemeldet — die reguläre Saison ist für dich
          abgeschlossen.
        </p>
      </section>
    );
  }

  const label = (text: string) => (
    <div className="flex items-center gap-2">
      <div className="h-2 w-4 -skew-x-[18deg] bg-brand-orange" />
      <span className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.14em]">
        {text}
      </span>
    </div>
  );

  if (!match.opponent) {
    return (
      <section className="rounded-lg border px-[30px] py-[26px]">
        {label(`Spieltag ${match.round}`)}
        <p className="mt-3 font-bold font-heading text-[32px] text-brand-blue uppercase leading-none dark:text-white">
          Spielfrei
        </p>
        <p className="mt-2 text-muted-foreground text-sm">
          Diese Woche hast du kein Match — Zeit zum Vorbereiten.
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
    <section className="flex flex-wrap items-center justify-between gap-6 rounded-lg border px-[30px] py-[26px]">
      <div className="flex flex-col gap-4.5">
        {label(
          reported
            ? `Ergebnis · Spieltag ${match.round}`
            : `Nächstes Match · Spieltag ${match.round}`,
        )}
        <div className="flex items-center gap-4.5">
          <PlayerAvatar
            identity={{ userId: meId, name: "Du", avatarUrl: null }}
            size="size-[46px]"
            filled
          />
          <span className="-skew-x-[10deg] px-1 font-bold font-heading text-brand-orange text-xl">
            VS
          </span>
          <PlayerAvatar identity={match.opponent} size="size-[46px]" />
          <span className="font-bold font-heading text-[22px] text-brand-blue uppercase leading-none dark:text-white">
            {match.opponent.name}
          </span>
        </div>
      </div>

      {reported && result ? (
        <Link
          href={`/match/${match.matchId}`}
          className="flex flex-col items-end gap-1.5"
        >
          <ReportedBadge result={result} meId={meId} />
          {result.disputed ? (
            <span className="rounded-full bg-destructive/10 px-2.5 py-[3px] font-semibold text-destructive text-xs">
              Angefochten
            </span>
          ) : (
            <span className="text-[13px] text-muted-foreground hover:text-brand-blue dark:hover:text-white">
              Ansehen →
            </span>
          )}
        </Link>
      ) : pendingFreeWin ? (
        <Link
          href={`/match/${match.matchId}`}
          className="flex flex-col items-end gap-1.5"
        >
          <span className="rounded-full bg-brand-orange/12 px-4 py-2 font-semibold text-brand-blue text-sm dark:text-white">
            Freewin — wartet auf Bestätigung
          </span>
          <span className="text-[13px] text-muted-foreground hover:text-brand-blue dark:hover:text-white">
            Ansehen →
          </span>
        </Link>
      ) : (
        <div className="flex items-center gap-7">
          <div className="flex flex-col items-start gap-1">
            <span className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.14em]">
              Deadline
            </span>
            <span className="font-bold font-heading text-2xl text-brand-blue uppercase dark:text-white">
              {formatDeadline(match.endsOn)}
            </span>
            <span
              className={cn(
                "rounded-full px-3 py-1 font-semibold text-[13px]",
                daysLeft <= 2
                  ? "bg-brand-orange text-brand-blue"
                  : "bg-brand-orange/12 text-brand-blue dark:text-white",
              )}
            >
              {deadlineHint(match.endsOn, today)}
            </span>
          </div>
          <Button asChild size="lg">
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
      <span className="font-bold font-heading text-[22px] text-brand-blue tracking-[0.04em] dark:text-white">
        {score.self} : {score.opponent}
      </span>
    </div>
  );
}

// One row of „Dein Spielplan".
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

  const chip = "size-[34px] rounded-lg font-bold font-heading text-[17px]";
  const row = cn(
    "flex h-[54px] items-center gap-3.5 rounded-lg border py-2.5 pr-4 pl-2.5",
    state === "current" && "border-brand-orange/45 bg-brand-orange/5",
    state === "overdue" && "border-destructive/35 bg-destructive/5",
    pastBye && "opacity-55",
  );

  const inner = (
    <>
      <div
        className={cn(
          chip,
          "flex items-center justify-center",
          state === "current"
            ? "bg-brand-orange text-brand-blue"
            : "bg-muted text-muted-foreground",
        )}
      >
        {match.round}
      </div>
      {isBye ? (
        <div className="flex flex-1 items-center gap-2.5">
          <div className="size-7 rounded-full border border-dashed" />
          <span className="font-medium text-muted-foreground">Spielfrei</span>
        </div>
      ) : match.opponent ? (
        <div className="flex flex-1 items-center gap-2.5">
          <PlayerAvatar identity={match.opponent} />
          <span className="truncate font-semibold text-[15px]">
            {match.opponent.name}
          </span>
        </div>
      ) : null}
      <RowRight match={match} result={result} state={state} meId={meId} />
    </>
  );

  return isBye ? (
    <div className={row}>{inner}</div>
  ) : (
    <Link
      href={`/match/${match.matchId}`}
      className={cn(row, "hover:bg-muted/40")}
    >
      {inner}
    </Link>
  );
}

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
    <span className="text-[13px] text-muted-foreground">
      {weekRange(match.startsOn, match.endsOn)}
    </span>
  );
  if (state === "reported" && result) {
    const score = scoreFor(meId, result);
    return (
      <div className="flex items-center gap-3">
        {result.disputed ? (
          <span className="rounded-full bg-destructive/10 px-2.5 py-[3px] font-semibold text-destructive text-xs">
            Angefochten
          </span>
        ) : null}
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
        <span className="min-w-[34px] text-right font-bold font-heading text-[19px] text-brand-blue tracking-[0.04em] dark:text-white">
          {score.self} : {score.opponent}
        </span>
      </div>
    );
  }
  if (state === "pending_free_win") {
    return (
      <span className="rounded-full bg-brand-orange/12 px-2.5 py-[3px] font-semibold text-brand-blue text-xs dark:text-white">
        Freewin · offen
      </span>
    );
  }
  if (state === "overdue") {
    return (
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-destructive/10 px-2.5 py-[3px] font-semibold text-destructive text-xs">
          Überfällig
        </span>
        {range}
      </div>
    );
  }
  if (state === "current") {
    return (
      <div className="flex items-center gap-3">
        <span className="font-semibold text-brand-orange text-xs uppercase tracking-[0.1em]">
          Diese Woche
        </span>
        {range}
      </div>
    );
  }
  return range;
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
  meId,
  today,
}: {
  groupName: string;
  currentRound: number;
  totalRounds: number;
  next: PlayerMatch | null;
  matches: PlayerMatch[];
  resultByMatchId: Map<string, MatchResultLite>;
  standings: StandingsRow[];
  meId: string;
  today: string;
}) {
  return (
    <>
      <ProgressStrip current={currentRound} total={totalRounds} />
      <Hero
        match={next}
        result={next ? (resultByMatchId.get(next.matchId) ?? null) : null}
        meId={meId}
        today={today}
      />
      <div className="mt-10 grid grid-cols-1 items-start gap-7 lg:grid-cols-[1.25fr_1fr]">
        <section className="flex flex-col gap-3">
          <SectionHeading
            title="Dein Spielplan"
            meta={`${totalRounds} Spieltage`}
          />
          <div className="flex flex-col gap-2">
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
        </section>

        <section className="flex flex-col gap-3">
          <SectionHeading title="Tabelle" meta={groupName} />
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[400px] border-separate border-spacing-0 text-left [&_tr:last-child_td]:border-b-0">
              <thead>
                <tr className="text-[11px] text-muted-foreground uppercase tracking-[0.1em]">
                  <th className="sticky left-0 z-20 w-[44px] border-b bg-background py-2.5 pr-1 pl-4 font-semibold before:absolute before:inset-0 before:bg-muted/50">
                    <span className="relative">Pl.</span>
                  </th>
                  <th className="sticky left-[44px] z-10 border-r border-b bg-background py-2.5 pr-3 pl-2 font-semibold before:absolute before:inset-0 before:bg-muted/50">
                    <span className="relative">Spieler</span>
                  </th>
                  <th className="border-b bg-muted/50 py-2.5 pr-3 pl-5 text-right font-semibold">
                    Bilanz
                  </th>
                  <th className="border-b bg-muted/50 px-3 py-2.5 text-right font-semibold">
                    Diff.
                  </th>
                  <th className="border-b bg-muted/50 px-3 py-2.5 text-right font-semibold">
                    Punkte
                  </th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row) => {
                  const me = row.userId === meId;
                  // Sticky columns need an opaque base so scrolled columns don't
                  // bleed through; the row highlight rides on top via a `before`
                  // tint so it stays consistent across frozen + scrolling cells.
                  const tint = me
                    ? "before:absolute before:inset-0 before:bg-brand-orange/6"
                    : "";
                  return (
                    <tr
                      key={row.userId}
                      className={cn(me && "bg-brand-orange/6")}
                    >
                      <td
                        className={cn(
                          "sticky left-0 z-20 border-b bg-background py-2.5 pr-1 pl-4 font-semibold text-muted-foreground text-sm tabular-nums",
                          tint,
                        )}
                      >
                        <span className="relative">{row.rank}</span>
                      </td>
                      <td
                        className={cn(
                          "sticky left-[44px] z-10 border-r border-b bg-background py-2.5 pr-3 pl-2",
                          tint,
                        )}
                      >
                        <span className="relative flex min-w-0 items-center gap-2">
                          <PlayerAvatar
                            identity={row}
                            size="size-[26px]"
                            filled={me}
                          />
                          <span
                            className={cn(
                              "truncate text-[14.5px]",
                              me ? "font-semibold" : "font-medium",
                            )}
                          >
                            {row.name}
                          </span>
                          {me ? (
                            <span className="font-bold text-[10px] text-brand-orange uppercase tracking-[0.1em]">
                              Du
                            </span>
                          ) : null}
                        </span>
                      </td>
                      <td className="border-b py-2.5 pr-3 pl-5 text-right text-muted-foreground text-sm tabular-nums">
                        {row.wins} : {row.losses}
                      </td>
                      <td className="border-b px-3 py-2.5 text-right font-semibold text-[14.5px] tabular-nums">
                        {formatDiff(row.gamesWon - row.gamesLost)}
                      </td>
                      <td className="border-b px-3 py-2.5 text-right font-semibold text-[14.5px] tabular-nums">
                        {row.points}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
