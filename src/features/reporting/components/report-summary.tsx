import Link from "next/link";
import { Tick } from "@/components/tick";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PLATFORM_LABELS } from "@/features/registration/registration";
import type { Identity } from "@/features/season/dashboard";
import { cn } from "@/lib/utils";
import type { StoredResult } from "../queries";

function formatReportedAt(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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

// Read-only view of a recorded result. A participant sees it from their own
// perspective („Du" / „Sieg für dich"); a neutral observer (viewerId null or not
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
}) {
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

  if (result.outcome === "free_win") {
    // Neutral observers only ever reach this branch for a confirmed free win
    // (the page hides pending ones); it is shown as the walkover 2:0.
    const pending = result.confirmedAt === null;
    const self = result.winnerId === viewer.userId ? 2 : 0;
    return (
      <>
        <BackAndEyebrow
          label={`Freewin · Spieltag ${round} · ${groupName}`}
          backHref={backHref}
          backLabel={backLabel}
        />
        <div className="mt-3 mb-6 flex items-center gap-3">
          <h1 className="text-[38px] text-brand-blue leading-[1.1] dark:text-white">
            Freewin für {nameOf(result.winnerId)}
          </h1>
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
              {disputed
                ? "Angefochten"
                : pending
                  ? "Wartet auf Staff"
                  : "Final"}
            </span>
          </span>
        </div>
        {pending && privileged ? (
          <div className="mb-8 flex flex-col gap-1.5 rounded-xl border border-brand-orange/45 bg-brand-orange/5 px-6 py-5">
            <p className="font-semibold text-[15px] text-brand-blue dark:text-white">
              Noch nicht gewertet
            </p>
            <p className="text-muted-foreground text-sm">
              Ein Staff-Mitglied prüft die Meldung. Erst nach der Bestätigung
              zählt der Freewin für die Tabelle — bis dahin bleibt das Match
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

  return (
    <>
      <BackAndEyebrow
        label={`Ergebnis · Spieltag ${round} · ${groupName}`}
        backHref={backHref}
        backLabel={backLabel}
      />
      <div className="mt-3 mb-6 flex items-center gap-3">
        <h1 className="text-[38px] text-brand-blue leading-[1.1] dark:text-white">
          {title}
        </h1>
        <span
          className={cn(
            "flex items-center justify-center rounded-full px-3.5 py-1 font-semibold text-xs uppercase tracking-[0.08em]",
            disputed
              ? "bg-destructive/[0.09] text-destructive"
              : "bg-brand-blue/7 text-brand-blue dark:text-white",
          )}
        >
          <span className="-mr-[0.08em] leading-none">
            {disputed ? "Angefochten" : "Final"}
          </span>
        </span>
      </div>

      <ScoreBoard
        viewer={viewer}
        other={other}
        self={selfScore}
        opp={oppScore}
        winnerId={result.winnerId}
        isParticipant={isParticipant}
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

      {result.games.length > 0 ? (
        <section className="mt-9 flex flex-col gap-3">
          <SectionHead title="Spiele" />
          <div className="flex flex-col gap-2">
            {result.games.map((game) => (
              <div
                key={game.gameNumber}
                className="flex items-center gap-3.5 rounded-lg border px-4 py-3"
              >
                <span className="w-[58px] shrink-0 whitespace-nowrap font-semibold text-muted-foreground text-xs uppercase tracking-[0.08em]">
                  Spiel {game.gameNumber}
                </span>
                <span className="flex-1 font-semibold text-brand-blue text-sm dark:text-white">
                  Sieger: {nameOf(game.winnerId)}
                </span>
                {game.replayUrl ? (
                  <a
                    href={game.replayUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border px-3 py-1.5 font-semibold text-[13px] hover:border-brand-orange hover:bg-brand-orange/5"
                  >
                    Replay ansehen ↗
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-9 flex flex-col gap-3">
        <SectionHead title="Teamsheets" />
        <div className="flex flex-col gap-2">
          {result.playerATeamUrl ? (
            <LinkCard
              label={`Team ${playerA.name}`}
              href={result.playerATeamUrl}
              trailing="pokepast.es ↗"
            />
          ) : null}
          {result.playerBTeamUrl ? (
            <LinkCard
              label={`Team ${playerB.name}`}
              href={result.playerBTeamUrl}
              trailing="pokepast.es ↗"
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
function ScoreBoard({
  viewer,
  other,
  self,
  opp,
  winnerId,
  isParticipant,
}: {
  viewer: Identity;
  other: Identity;
  self: number;
  opp: number;
  winnerId: string | null;
  isParticipant: boolean;
}) {
  return (
    <>
      {/* Mobile: each player on their own row with their score — no truncation. */}
      <div className="flex flex-col divide-y rounded-xl border bg-muted/30 sm:hidden">
        <PlayerRow
          identity={viewer}
          score={self}
          winner={winnerId === viewer.userId}
          sub={isParticipant ? "Du" : undefined}
          filled={isParticipant}
        />
        <PlayerRow
          identity={other}
          score={opp}
          winner={winnerId === other.userId}
          sub={isParticipant ? "Gegner" : undefined}
        />
      </div>

      {/* Desktop: Player A  :  Player B. */}
      <div className="hidden grid-cols-[1fr_auto_1fr] items-center gap-4.5 rounded-xl border bg-muted/30 px-[30px] py-[26px] sm:grid">
        <ScoreSide
          identity={viewer}
          filled={isParticipant}
          sub={isParticipant ? "Du" : undefined}
          winner={winnerId === viewer.userId}
        />
        <span className="font-bold font-heading text-[56px] text-brand-blue leading-none dark:text-white">
          {self}
          <span className="px-2 text-border">:</span>
          {opp}
        </span>
        <ScoreSide
          identity={other}
          align="right"
          sub={isParticipant ? "Gegner" : undefined}
          winner={winnerId === other.userId}
        />
      </div>
    </>
  );
}

// One player as a full-width row (mobile scoreboard): avatar, name + marker, and
// their score. The name gets the whole row, so it never has to truncate.
function PlayerRow({
  identity,
  score,
  winner,
  sub,
  filled,
}: {
  identity: Identity;
  score: number;
  winner: boolean;
  sub?: string;
  filled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Face identity={identity} filled={filled} size="size-10" />
      <div className="min-w-0 flex-1">
        <div className="font-bold font-heading text-[20px] text-brand-blue uppercase leading-[1.15] dark:text-white">
          {identity.name}
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
      <span
        className={cn(
          "font-bold font-heading text-[32px] leading-none tabular-nums",
          winner ? "text-brand-blue dark:text-white" : "text-muted-foreground",
        )}
      >
        {score}
      </span>
    </div>
  );
}

function ScoreSide({
  identity,
  sub,
  winner,
  filled,
  align,
}: {
  identity: Identity;
  sub?: string;
  winner: boolean;
  filled?: boolean;
  align?: "right";
}) {
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
        <span
          className={cn(
            "w-full truncate font-bold font-heading text-[22px] text-brand-blue uppercase leading-[1.05] sm:text-[28px] dark:text-white",
            align === "right" && "text-right",
          )}
        >
          {identity.name}
        </span>
        {winner ? (
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
        ) : null}
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
