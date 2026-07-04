import Link from "next/link";
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
        <div className="h-2 w-4 -skew-x-[18deg] bg-brand-orange" />
        <span className="whitespace-nowrap font-semibold text-muted-foreground text-xs uppercase tracking-[0.14em]">
          {label}
        </span>
      </div>
    </>
  );
}

// Read-only view of a recorded result, from the viewer's perspective.
// Corrections go through the (later) dispute flow.
export function ReportSummary({
  result,
  playerA,
  playerB,
  viewerId,
  round,
  groupName,
  backHref = "/spieler",
  backLabel = "Zurück zur Übersicht",
}: {
  result: StoredResult;
  playerA: Identity;
  playerB: Identity;
  viewerId: string;
  round: number;
  groupName: string;
  backHref?: string;
  backLabel?: string;
}) {
  const viewer = viewerId === playerA.userId ? playerA : playerB;
  const other = viewerId === playerA.userId ? playerB : playerA;
  const nameOf = (id: string | null) =>
    id === playerA.userId
      ? playerA.name
      : id === playerB.userId
        ? playerB.name
        : "—";

  if (result.outcome === "free_win") {
    const pending = result.confirmedAt === null;
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
              pending
                ? "bg-brand-orange/14 text-brand-blue dark:text-white"
                : "bg-brand-blue/7 text-brand-blue dark:text-white",
            )}
          >
            <span className="-mr-[0.08em] leading-none">
              {pending ? "Wartet auf Staff" : "Final"}
            </span>
          </span>
        </div>
        {pending ? (
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
        <div className="flex flex-col gap-4.5">
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
      : viewerWon
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
        <span className="flex items-center justify-center rounded-full bg-brand-blue/7 px-3.5 py-1 font-semibold text-brand-blue text-xs uppercase tracking-[0.08em] dark:text-white">
          <span className="-mr-[0.08em] leading-none">Final</span>
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4.5 rounded-xl border bg-muted/30 px-[30px] py-[26px]">
        <ScoreSide identity={viewer} filled sub="Du" winner={viewerWon} />
        <span className="font-bold font-heading text-[56px] text-brand-blue leading-none dark:text-white">
          {selfScore}
          <span className="px-2 text-border">:</span>
          {oppScore}
        </span>
        <ScoreSide
          identity={other}
          align="right"
          sub="Gegner"
          winner={result.winnerId === other.userId}
        />
      </div>

      <p className="mt-3.5 flex items-center gap-2 whitespace-nowrap text-[13px] text-muted-foreground">
        {result.platform ? (
          <span>{PLATFORM_LABELS[result.platform]}</span>
        ) : null}
        {result.platform ? <Dot /> : null}
        <span>Gemeldet von {nameOf(result.reportedById)}</span>
        <Dot />
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

      <p className="mt-10 border-t pt-5 text-[13.5px] text-muted-foreground">
        Stimmt etwas nicht? Ergebnisse sind final — wende dich an den Staff, um
        eine Korrektur anzustoßen.
      </p>
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

function ScoreSide({
  identity,
  sub,
  winner,
  filled,
  align,
}: {
  identity: Identity;
  sub: string;
  winner: boolean;
  filled?: boolean;
  align?: "right";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3",
        align === "right" && "flex-row-reverse",
      )}
    >
      <Face identity={identity} filled={filled} />
      <div
        className={cn(
          "flex min-w-0 flex-col",
          align === "right" && "items-end",
        )}
      >
        <span className="truncate font-bold font-heading text-[28px] text-brand-blue uppercase leading-[1.05] dark:text-white">
          {identity.name}
        </span>
        {winner ? (
          <span className="flex items-center gap-1.5">
            <span className="h-[7px] w-3.5 -skew-x-[18deg] bg-brand-orange" />
            <span className="font-bold text-[11px] text-brand-orange uppercase tracking-[0.12em]">
              Sieger
            </span>
          </span>
        ) : (
          <span className="font-semibold text-[11px] text-muted-foreground uppercase tracking-[0.12em]">
            {sub}
          </span>
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
