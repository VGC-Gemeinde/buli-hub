"use client";

import Link from "next/link";
import { useState } from "react";
import { Tick } from "@/components/tick";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlayerLink } from "@/features/player-profile/components/player-link";
import { PLATFORM_LABELS } from "@/features/registration/registration";
import type { Identity } from "@/features/season/dashboard";
import { SpoilerPill } from "@/features/spoilers/components/spoiler-score";
import { pastePath } from "@/features/teamsheets/paths";
import { formatGermanDateTime } from "@/lib/german-time";
import { cn } from "@/lib/utils";
import type { StoredResult } from "../queries";

function formatReportedAt(date: Date): string {
  return formatGermanDateTime(date, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function Dot() {
  return <span className="text-border">·</span>;
}

function Face({
  identity,
  filled,
  size = "size-[50px]",
}: {
  identity: Identity;
  filled?: boolean;
  size?: string;
}) {
  return (
    <Avatar className={size}>
      {identity.avatarUrl ? (
        <AvatarImage src={identity.avatarUrl} alt="" />
      ) : null}
      <AvatarFallback className={filled ? "bg-brand-blue text-white" : ""}>
        {identity.name.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

function BackAndEyebrow({
  label,
  backHref,
  backLabel,
}: {
  label: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <>
      <Link
        href={backHref}
        className="mb-4.5 inline-block font-medium text-[13px] text-muted-foreground hover:text-brand-blue dark:hover:text-white"
      >
        ← {backLabel}
      </Link>
      <div className="flex items-center gap-2">
        <Tick size="s" />
        <span className="whitespace-nowrap font-semibold text-muted-foreground text-xs uppercase tracking-[0.12em]">
          {label}
        </span>
      </div>
    </>
  );
}

// Spoiler protection on the result page (design/SPOILER-SCHUTZ.md §3): with
// `spoilerMode` active, neutral viewers get this normal layout with masked
// slots — replays, teamsheets and the match video stay usable without being
// spoiled. "motw" only changes the notice copy; the exemption from the global
// switch is decided by the page. All reveals are client-side per page load.
export type SpoilerMode = "none" | "default" | "motw";

// Read-only view of a recorded result. A participant sees it from their own
// perspective ("Du" / "Sieg für dich"); a neutral observer (viewerId null or not
// a participant) sees the objective Player A vs Player B view. Corrections go
// through the dispute flow. Everything shown here is public once the game is
// played; disputes live outside this component.
export function ReportSummary({
  result,
  playerA,
  playerB,
  viewerId,
  privileged,
  round,
  groupName,
  disputed = false,
  backHref = "/spieler",
  backLabel = "Zurück zur Übersicht",
  spoilerMode = "none",
}: {
  result: StoredResult;
  playerA: Identity;
  playerB: Identity;
  viewerId: string | null;
  // Participant or staff. Report metadata (reporter, free-win reason, discussed-
  // with) is shown only to them; neutral observers see just the result.
  privileged: boolean;
  round: number;
  groupName: string;
  // An open dispute flips the status chip Final → Angefochten (§4.4). Only
  // participants/staff ever see this — neutral observers are passed `false`.
  disputed?: boolean;
  backHref?: string;
  backLabel?: string;
  spoilerMode?: SpoilerMode;
}) {
  const [pageRevealed, setPageRevealed] = useState(false);
  const [revealedGames, setRevealedGames] = useState<ReadonlySet<number>>(
    new Set(),
  );
  const spoilerActive = spoilerMode !== "none";
  const covered = spoilerActive && !pageRevealed;
  const reveal = () => setPageRevealed(true);
  // Re-covering also resets per-game reveals — a fresh cover.
  const cover = () => {
    setPageRevealed(false);
    setRevealedGames(new Set());
  };
  const revealGame = (gameNumber: number) =>
    setRevealedGames((prev) => new Set(prev).add(gameNumber));

  const isParticipant =
    viewerId === playerA.userId || viewerId === playerB.userId;
  // Participant B is framed as the viewer; everyone else (participant A or a
  // neutral observer) reads left-to-right as Player A vs Player B.
  const viewer = viewerId === playerB.userId ? playerB : playerA;
  const other = viewer === playerA ? playerB : playerA;
  const nameOf = (id: string | null) =>
    id === playerA.userId
      ? playerA.name
      : id === playerB.userId
        ? playerB.name
        : "—";

  // Covered headline: the pairing, in the result headline's own metrics — the
  // reveal swaps text without costing a pixel of height.
  const pairingHeadline = (
    <>
      <span className="break-words">{playerA.name}</span>{" "}
      <span className="text-[oklch(0.68_0.025_263)]">vs.</span>{" "}
      <span className="break-words">{playerB.name}</span>
    </>
  );

  // One quiet line between headline and scoreboard: state + reveal/re-cover
  // link. Copy stays short so the line never wraps (§3.3).
  const notice = spoilerActive ? (
    <p className="mb-6 flex min-h-5 items-baseline gap-2.5 text-[13px] text-muted-foreground">
      <span>
        {covered
          ? spoilerMode === "motw"
            ? "Match of the Week: Ergebnis verdeckt, erst das VOD ansehen."
            : "Spoiler-Schutz aktiv. Sieger und Endstand sind verdeckt."
          : "Ergebnis aufgedeckt, nur für dich auf dieser Seite."}
      </span>
      <button
        type="button"
        onClick={covered ? reveal : cover}
        className="whitespace-nowrap font-semibold text-brand-blue underline underline-offset-[3px] hover:text-brand-orange dark:text-white dark:hover:text-brand-orange"
      >
        {covered ? "Ergebnis aufdecken" : "Wieder verdecken"}
      </button>
    </p>
  ) : null;

  if (result.outcome === "free_win") {
    // Neutral observers only ever reach this branch for a confirmed free win
    // (the page hides pending ones); it is shown as the walkover 2:0. While
    // covered, nothing may say "Freewin" — the eyebrow and headline show the
    // neutral pairing (§3.2).
    const pending = result.confirmedAt === null;
    const self = result.winnerId === viewer.userId ? 2 : 0;
    return (
      <>
        <BackAndEyebrow
          label={`${covered ? "Ergebnis" : "Freewin"} · Spieltag ${round} · ${groupName}`}
          backHref={backHref}
          backLabel={backLabel}
        />
        <div
          className={cn(
            "mt-3 flex items-center gap-3",
            spoilerActive ? "mb-2.5" : "mb-6",
          )}
        >
          <h1 className="text-[38px] text-brand-blue leading-[1.1] dark:text-white">
            {covered
              ? pairingHeadline
              : `Freewin für ${nameOf(result.winnerId)}`}
          </h1>
          <StatusChip disputed={disputed} pending={pending} />
        </div>
        {notice}
        {pending && privileged ? (
          <div className="mb-8 flex flex-col gap-1.5 rounded-xl border border-brand-orange/45 bg-brand-orange/5 px-6 py-5">
            <p className="font-semibold text-[15px] text-brand-blue dark:text-white">
              Noch nicht gewertet
            </p>
            <p className="text-muted-foreground text-sm">
              Ein Staff-Mitglied prüft die Meldung. Erst nach der Bestätigung
              zählt der Freewin für die Tabelle. Bis dahin bleibt das Match
              offen.
            </p>
          </div>
        ) : null}
        <ScoreBoard
          viewer={viewer}
          other={other}
          self={self}
          opp={2 - self}
          winnerId={result.winnerId}
          isParticipant={isParticipant}
          covered={covered}
          reserveMarkers={spoilerActive}
          onReveal={reveal}
        />
        {privileged ? (
          <div className="mt-4.5 flex flex-col gap-4.5">
            {result.freeWinReason ? (
              <Field label="Begründung">
                <p className="max-w-[560px] text-sm">{result.freeWinReason}</p>
              </Field>
            ) : null}
            {result.discussedWithName ? (
              <Field label="Besprochen mit">{result.discussedWithName}</Field>
            ) : null}
            <Field label="Gemeldet">
              Von {nameOf(result.reportedById)} ·{" "}
              {formatReportedAt(result.reportedAt)}
            </Field>
          </div>
        ) : null}
      </>
    );
  }

  const viewerWon = result.winnerId === viewer.userId;
  const selfScore = result.games.filter(
    (g) => g.winnerId === viewer.userId,
  ).length;
  const oppScore = result.games.length - selfScore;
  const title =
    result.outcome === "double_loss"
      ? "Doppelniederlage"
      : isParticipant && viewerWon
        ? "Sieg für dich"
        : `Sieg für ${nameOf(result.winnerId)}`;

  // The rendered game list. While the spoiler mode is active, a Bo3 that
  // ended 2:0 must not betray itself by its row count (§3.6): a phantom third
  // row renders as a normal covered row — its replay button links game 2's
  // replay as a dummy — and becomes the "Nicht gespielt" ghost on reveal.
  const games: {
    gameNumber: number;
    winnerName: string | null;
    replayUrl: string | null;
    phantom: boolean;
  }[] = result.games.map((game) => ({
    gameNumber: game.gameNumber,
    winnerName: nameOf(game.winnerId),
    replayUrl: game.replayUrl ?? null,
    phantom: false,
  }));
  const sheetA = result.sheets.find(
    (sheet) => sheet.playerId === playerA.userId,
  );
  const sheetB = result.sheets.find(
    (sheet) => sheet.playerId === playerB.userId,
  );

  if (spoilerActive && result.games.length === 2) {
    games.push({
      gameNumber: 3,
      winnerName: null,
      replayUrl:
        result.platform === "showdown"
          ? (result.games[1]?.replayUrl ?? null)
          : null,
      phantom: true,
    });
  }

  return (
    <>
      <BackAndEyebrow
        label={`Ergebnis · Spieltag ${round} · ${groupName}`}
        backHref={backHref}
        backLabel={backLabel}
      />
      <div
        className={cn(
          "mt-3 flex items-center gap-3",
          spoilerActive ? "mb-2.5" : "mb-6",
        )}
      >
        <h1 className="text-[38px] text-brand-blue leading-[1.1] dark:text-white">
          {covered ? pairingHeadline : title}
        </h1>
        <StatusChip disputed={disputed} />
      </div>
      {notice}

      <ScoreBoard
        viewer={viewer}
        other={other}
        self={selfScore}
        opp={oppScore}
        winnerId={result.winnerId}
        isParticipant={isParticipant}
        covered={covered}
        reserveMarkers={spoilerActive}
        onReveal={reveal}
      />

      <p className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
        {result.platform ? (
          <span>{PLATFORM_LABELS[result.platform]}</span>
        ) : null}
        {result.platform ? <Dot /> : null}
        {privileged ? (
          <>
            <span>Gemeldet von {nameOf(result.reportedById)}</span>
            <Dot />
          </>
        ) : null}
        <span>{formatReportedAt(result.reportedAt)}</span>
      </p>

      {games.length > 0 ? (
        <section className="mt-9 flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <SectionHead title="Spiele" />
            {covered ? (
              <span className="text-[12.5px] text-muted-foreground">
                Replays spoilerfrei ansehen
              </span>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            {games.map((game) => {
              const gameCovered =
                covered && !revealedGames.has(game.gameNumber);
              if (game.phantom && !gameCovered) {
                // Ghost variant: the phantom row after reveal (§3.6).
                return (
                  <div
                    key={game.gameNumber}
                    className="flex items-center gap-3.5 rounded-lg border border-[oklch(0.87_0.015_262)] border-dashed bg-muted/30 px-4 py-3 dark:border-white/15"
                  >
                    <span className="w-[58px] shrink-0 whitespace-nowrap font-semibold text-muted-foreground text-xs uppercase tracking-[0.08em]">
                      Spiel {game.gameNumber}
                    </span>
                    <span className="flex min-h-[31px] flex-1 items-center text-[13px] text-muted-foreground">
                      Nicht gespielt, die Serie war nach zwei Spielen
                      entschieden.
                    </span>
                  </div>
                );
              }
              return (
                <div
                  key={game.gameNumber}
                  className="flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-lg border px-4 py-3"
                >
                  <span className="w-[58px] shrink-0 whitespace-nowrap font-semibold text-muted-foreground text-xs uppercase tracking-[0.08em]">
                    Spiel {game.gameNumber}
                  </span>
                  {/* The floor keeps the winner name readable; if the replay
                      button no longer fits next to it, it wraps onto its own
                      line instead of squeezing the name away. */}
                  <span className="flex min-h-[31px] min-w-36 flex-1 items-center gap-2 font-semibold text-sm">
                    <span
                      className={
                        gameCovered
                          ? "text-muted-foreground"
                          : "text-brand-blue dark:text-white"
                      }
                    >
                      Sieger:
                    </span>
                    {gameCovered ? (
                      // Each game reveals independently — watch replay 1,
                      // peek game 1, stay unspoiled for the series.
                      <SpoilerPill
                        title="Sieger verdeckt, antippen zum Aufdecken"
                        onReveal={() => revealGame(game.gameNumber)}
                        className="h-[13px] w-[88px]"
                      />
                    ) : (
                      <span className="truncate text-brand-blue dark:text-white">
                        {game.winnerName}
                      </span>
                    )}
                  </span>
                  {game.replayUrl ? (
                    <a
                      href={game.replayUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 whitespace-nowrap rounded-md border px-3 py-1.5 font-semibold text-[13px] hover:border-brand-orange hover:bg-brand-orange/5"
                    >
                      Replay ansehen ↗
                    </a>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="mt-9 flex flex-col gap-3">
        <SectionHead title="Teamsheets" />
        <div className="flex flex-col gap-2">
          {sheetA ? (
            <LinkCard
              label={`Team ${playerA.name}`}
              href={pastePath(sheetA.id)}
              trailing="Teamsheet ansehen ↗"
            />
          ) : null}
          {sheetB ? (
            <LinkCard
              label={`Team ${playerB.name}`}
              href={pastePath(sheetB.id)}
              trailing="Teamsheet ansehen ↗"
            />
          ) : null}
          {result.videoUrl ? (
            <LinkCard
              label="Video zum Match"
              href={result.videoUrl}
              trailing="Ansehen ↗"
            />
          ) : null}
        </div>
      </section>
    </>
  );
}

function StatusChip({
  disputed,
  pending = false,
}: {
  disputed: boolean;
  pending?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-full px-3.5 py-1 font-semibold text-xs uppercase tracking-[0.08em]",
        disputed
          ? "bg-destructive/[0.09] text-destructive"
          : pending
            ? "bg-brand-orange/14 text-brand-blue dark:text-white"
            : "bg-brand-blue/7 text-brand-blue dark:text-white",
      )}
    >
      <span className="-mr-[0.08em] leading-none">
        {disputed ? "Angefochten" : pending ? "Wartet auf Staff" : "Final"}
      </span>
    </span>
  );
}

function SectionHead({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-[9px] w-[18px] -skew-x-[18deg] bg-brand-orange" />
      <h2 className="whitespace-nowrap font-bold font-heading text-[21px] text-brand-blue uppercase tracking-[0.03em] dark:text-white">
        {title}
      </h2>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.12em]">
        {label}
      </span>
      <span className="text-sm">{children}</span>
    </div>
  );
}

// The score block, shared by normal results and free wins (walkover 2:0). Scores
// are given from the `viewer`'s side; the winner marker is driven by `winnerId`.
// While covered, the center becomes the masked `– : –` button in a fixed slot
// and the winner markers stay blank in their reserved rows — revealing never
// moves a pixel (§3.4).
function ScoreBoard({
  viewer,
  other,
  self,
  opp,
  winnerId,
  isParticipant,
  covered = false,
  reserveMarkers = false,
  onReveal = () => {},
}: {
  viewer: Identity;
  other: Identity;
  self: number;
  opp: number;
  winnerId: string | null;
  isParticipant: boolean;
  covered?: boolean;
  reserveMarkers?: boolean;
  onReveal?: () => void;
}) {
  const shownWinnerId = covered ? null : winnerId;
  return (
    <>
      {/* Mobile: each player on their own row with their score — no truncation. */}
      <div className="flex flex-col divide-y rounded-xl border bg-muted/30 sm:hidden">
        <PlayerRow
          identity={viewer}
          score={self}
          winner={shownWinnerId === viewer.userId}
          sub={isParticipant ? "Du" : undefined}
          filled={isParticipant}
          covered={covered}
          onReveal={onReveal}
        />
        <PlayerRow
          identity={other}
          score={opp}
          winner={shownWinnerId === other.userId}
          sub={isParticipant ? "Gegner" : undefined}
          covered={covered}
          onReveal={onReveal}
        />
      </div>

      {/* Desktop: Player A  :  Player B. */}
      <div className="hidden grid-cols-[1fr_auto_1fr] items-center gap-4.5 rounded-xl border bg-muted/30 px-[30px] py-[26px] sm:grid">
        <ScoreSide
          identity={viewer}
          filled={isParticipant}
          sub={isParticipant ? "Du" : undefined}
          winner={shownWinnerId === viewer.userId}
          reserveMarker={reserveMarkers}
        />
        <span className="flex h-14 w-32 items-center justify-center">
          {covered ? (
            <button
              type="button"
              title="Ergebnis verdeckt, antippen zum Aufdecken"
              aria-label="Ergebnis aufdecken"
              onClick={onReveal}
              className="cursor-pointer font-bold font-heading text-[56px] text-[oklch(0.82_0.015_263)] leading-none transition-colors hover:text-[oklch(0.65_0.03_263)] dark:text-white/25 dark:hover:text-white/45"
            >
              –<span className="px-2 text-[38px]">:</span>–
            </button>
          ) : (
            <span className="font-bold font-heading text-[56px] leading-none tabular-nums">
              <span
                className={
                  shownWinnerId === viewer.userId
                    ? "text-brand-blue dark:text-white"
                    : "text-muted-foreground"
                }
              >
                {self}
              </span>
              <span className="px-2 text-[38px] text-border">:</span>
              <span
                className={
                  shownWinnerId === other.userId
                    ? "text-brand-blue dark:text-white"
                    : "text-muted-foreground"
                }
              >
                {opp}
              </span>
            </span>
          )}
        </span>
        <ScoreSide
          identity={other}
          align="right"
          sub={isParticipant ? "Gegner" : undefined}
          winner={shownWinnerId === other.userId}
          reserveMarker={reserveMarkers}
        />
      </div>
    </>
  );
}

// One player as a full-width row (mobile scoreboard): avatar, name + marker, and
// their score. The name gets the whole row, so it never has to truncate. Row
// height is fixed by the avatar, so masking needs no reserved rows here.
function PlayerRow({
  identity,
  score,
  winner,
  sub,
  filled,
  covered = false,
  onReveal = () => {},
}: {
  identity: Identity;
  score: number;
  winner: boolean;
  sub?: string;
  filled?: boolean;
  covered?: boolean;
  onReveal?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Face identity={identity} filled={filled} size="size-10" />
      <div className="min-w-0 flex-1">
        <div className="font-bold font-heading text-[20px] text-brand-blue uppercase leading-[1.15] dark:text-white">
          <PlayerLink userId={identity.userId} name={identity.name} />
        </div>
        {winner ? (
          <span className="flex items-center gap-1.5">
            <span className="h-[6px] w-3 -skew-x-[18deg] bg-brand-orange" />
            <span className="font-bold text-[10.5px] text-brand-orange uppercase tracking-[0.12em]">
              Sieger
            </span>
          </span>
        ) : sub ? (
          <span className="font-semibold text-[10.5px] text-muted-foreground uppercase tracking-[0.12em]">
            {sub}
          </span>
        ) : null}
      </div>
      {covered ? (
        <button
          type="button"
          title="Ergebnis verdeckt, antippen zum Aufdecken"
          aria-label="Ergebnis aufdecken"
          onClick={onReveal}
          className="cursor-pointer font-bold font-heading text-[32px] text-[oklch(0.82_0.015_263)] leading-none transition-colors hover:text-[oklch(0.65_0.03_263)] dark:text-white/25 dark:hover:text-white/45"
        >
          –
        </button>
      ) : (
        <span
          className={cn(
            "font-bold font-heading text-[32px] leading-none tabular-nums",
            winner
              ? "text-brand-blue dark:text-white"
              : "text-muted-foreground",
          )}
        >
          {score}
        </span>
      )}
    </div>
  );
}

function ScoreSide({
  identity,
  sub,
  winner,
  filled,
  align,
  reserveMarker = false,
}: {
  identity: Identity;
  sub?: string;
  winner: boolean;
  filled?: boolean;
  align?: "right";
  reserveMarker?: boolean;
}) {
  const marker = winner ? (
    <span className="flex items-center gap-1.5">
      <span className="h-[7px] w-3.5 -skew-x-[18deg] bg-brand-orange" />
      <span className="font-bold text-[11px] text-brand-orange uppercase tracking-[0.12em]">
        Sieger
      </span>
    </span>
  ) : sub ? (
    <span className="font-semibold text-[11px] text-muted-foreground uppercase tracking-[0.12em]">
      {sub}
    </span>
  ) : null;

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 sm:gap-3",
        align === "right" && "flex-row-reverse",
      )}
    >
      <Face identity={identity} filled={filled} size="size-10 sm:size-[50px]" />
      <div
        className={cn(
          "flex min-w-0 flex-col",
          align === "right" && "items-end",
        )}
      >
        <PlayerLink
          userId={identity.userId}
          name={identity.name}
          className={cn(
            "w-full truncate font-bold font-heading text-[22px] text-brand-blue uppercase leading-[1.05] sm:text-[28px] dark:text-white",
            align === "right" && "text-right",
          )}
        />
        {reserveMarker ? (
          // Reserved marker row: empty while covered, holds the "Sieger"
          // marker after reveal — the names never move (§3.4).
          <span className="flex h-[15px] items-center">{marker}</span>
        ) : (
          marker
        )}
      </div>
    </div>
  );
}

function LinkCard({
  label,
  href,
  trailing,
}: {
  label: string;
  href: string;
  trailing: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between rounded-lg border px-4 py-3.5 hover:border-brand-orange hover:bg-brand-orange/5"
    >
      <span className="font-semibold text-sm">{label}</span>
      <span className="font-semibold text-[13px] text-muted-foreground">
        {trailing}
      </span>
    </a>
  );
}
