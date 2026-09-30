"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyStateCard } from "@/components/empty-state-card";
import { Tick } from "@/components/tick";
import { Button } from "@/components/ui/button";
import { emphasisSurface, hoverCard } from "@/lib/emphasis";
import {
  formatGermanDateTime,
  formatGermanDay,
  germanToday,
} from "@/lib/german-time";
import { cn } from "@/lib/utils";
import type { DisputeRow, StaffMatchRow } from "../queries";
import { confirmFreeWin } from "../staff-actions";
import { AwardFreewinDialog } from "./award-freewin-dialog";

function ddMM(dateStr: string | null): string {
  if (!dateStr) return "—";
  return formatGermanDay(dateStr, { day: "2-digit", month: "2-digit" });
}
function reportedAtLabel(date: Date | null): string {
  if (!date) return "";
  return formatGermanDateTime(date, {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}
function daysSince(dateStr: string | null, today: string): number {
  if (!dateStr) return 0;
  return Math.round(
    (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${dateStr}T00:00:00Z`)) /
      86_400_000,
  );
}
function shortGroup(groupName: string): string {
  return groupName.replace("Division ", "Div ");
}
function winnerName(match: StaffMatchRow): string {
  return match.winnerId === match.playerA.userId
    ? match.playerA.name
    : match.playerB.name;
}

function SectionHead({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <Tick size="m" />
      <h2 className="font-bold font-heading text-[24px] text-brand-blue uppercase tracking-[0.03em] dark:text-white">
        {title}
      </h2>
      <span className="rounded-full bg-muted px-2 py-0.5 font-semibold text-[12.5px] text-muted-foreground tabular-nums">
        {count}
      </span>
    </div>
  );
}

type Chip = { label: string; tone: "overdue" | "open" | "free" | "done" };

function ChipEl({ chip }: { chip: Chip }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center whitespace-nowrap rounded-full px-2.5 py-[3px] font-semibold text-xs leading-none",
        chip.tone === "overdue" && "bg-destructive/8 text-destructive",
        chip.tone === "open" && "bg-muted text-muted-foreground",
        chip.tone === "free" &&
          "bg-brand-orange/14 text-brand-blue dark:text-white",
        chip.tone === "done" && "bg-muted text-muted-foreground",
      )}
    >
      {chip.label}
    </span>
  );
}

function MatchRow({
  match,
  chip,
  dimmed,
  alert,
  action,
}: {
  match: StaffMatchRow;
  chip?: Chip;
  dimmed?: boolean;
  alert?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border px-4 py-2.5 sm:flex-row sm:items-center sm:gap-3.5 sm:py-2",
        alert && emphasisSurface("destructive"),
        dimmed && "opacity-60",
      )}
    >
      <div className="flex min-w-0 items-center gap-3 sm:contents">
        <span className="w-24 shrink-0 whitespace-nowrap font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.06em]">
          {shortGroup(match.groupName)} · S{match.round}
        </span>
        <Link
          href={`/match/${match.matchId}`}
          className="min-w-0 flex-1 truncate font-medium text-sm hover:text-brand-blue dark:hover:text-white"
        >
          {match.playerA.name}{" "}
          <span className="text-muted-foreground">vs.</span>{" "}
          {match.playerB.name}
        </Link>
      </div>
      <div className="flex items-center justify-between gap-3 sm:contents">
        {chip ? <ChipEl chip={chip} /> : null}
        <span className="shrink-0 text-right text-[13px] text-muted-foreground tabular-nums sm:w-12">
          {ddMM(match.endsOn)}
        </span>
        {action}
      </div>
    </div>
  );
}

// The body of the Woche page (docs/plans/staff-dashboard.md): the season's
// worklists first, each only when it has something (overdue matches with the
// free-win award, open disputes, free wins to confirm), then one Spieltag's
// matches with a pager, then the resolved disputes as history. Each worklist
// carries an anchor id, which the dashboard's todos and tiles link to.
export const WEEK_ANCHORS = {
  overdue: "ueberfaellig",
  disputed: "angefochten",
  freeWins: "freewins",
  round: "spieltag",
} as const;

export function WeekMatches({
  overdue,
  thisWeek,
  pendingFreeWins,
  disputed,
  resolvedDisputes,
  round,
  totalRounds,
  currentRound,
  today = germanToday(),
}: {
  overdue: StaffMatchRow[];
  // The matches of the Spieltag on screen (`round`).
  thisWeek: StaffMatchRow[];
  pendingFreeWins: StaffMatchRow[];
  disputed: StaffMatchRow[];
  resolvedDisputes: DisputeRow[];
  round: number | null;
  totalRounds: number;
  currentRound: number | null;
  today?: string;
}) {
  const router = useRouter();
  const [showAllWeek, setShowAllWeek] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const weekOpen = thisWeek.filter((m) => m.outcome === null);
  const weekShown = showAllWeek ? thisWeek : weekOpen;
  const allClear =
    overdue.length === 0 &&
    pendingFreeWins.length === 0 &&
    disputed.length === 0 &&
    weekOpen.length === 0;

  async function confirm(matchId: string) {
    setConfirming(matchId);
    setError(null);
    const result = await confirmFreeWin(matchId);
    setConfirming(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8.5">
      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      {overdue.length > 0 ? (
        <section
          id={WEEK_ANCHORS.overdue}
          className="flex scroll-mt-6 flex-col gap-3"
        >
          <SectionHead title="Überfällig" count={overdue.length} />
          <div className="flex flex-col gap-2">
            {overdue.map((m) => (
              <MatchRow
                key={m.matchId}
                match={m}
                alert
                chip={{
                  label: `seit ${daysSince(m.endsOn, today)} Tagen`,
                  tone: "overdue",
                }}
                action={
                  <AwardFreewinDialog
                    matchId={m.matchId}
                    round={m.round}
                    groupName={m.groupName}
                    playerA={m.playerA}
                    playerB={m.playerB}
                    triggerLabel="Freewin"
                    triggerSize="sm"
                  />
                }
              />
            ))}
          </div>
        </section>
      ) : null}

      {disputed.length > 0 ? (
        <section
          id={WEEK_ANCHORS.disputed}
          className="flex scroll-mt-6 flex-col gap-3"
        >
          <SectionHead title="Angefochten" count={disputed.length} />
          <div className="flex flex-col gap-2">
            {disputed.map((m) => (
              <div
                key={m.matchId}
                className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/[0.03] px-4 py-2.5 sm:flex-row sm:items-center sm:gap-3.5 sm:py-2"
              >
                <div className="flex min-w-0 items-center gap-3 sm:contents">
                  <span className="w-24 shrink-0 whitespace-nowrap font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.06em]">
                    {shortGroup(m.groupName)} · S{m.round}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Link
                      href={`/match/${m.matchId}`}
                      className="truncate font-medium text-sm hover:text-brand-blue dark:hover:text-white"
                    >
                      {m.playerA.name}{" "}
                      <span className="text-muted-foreground">vs.</span>{" "}
                      {m.playerB.name}
                    </Link>
                    {m.dispute ? (
                      <p className="truncate text-[13px] text-muted-foreground">
                        "{m.dispute.reason}" · {m.dispute.openedByName ?? "—"}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex sm:contents">
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="border-destructive/35 text-destructive"
                  >
                    <Link href={`/match/${m.matchId}`}>Prüfen</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {pendingFreeWins.length > 0 ? (
        <section
          id={WEEK_ANCHORS.freeWins}
          className="flex scroll-mt-6 flex-col gap-3"
        >
          <SectionHead
            title="Freewins bestätigen"
            count={pendingFreeWins.length}
          />
          <div className="flex flex-col gap-2">
            {pendingFreeWins.map((m) => (
              <div
                key={m.matchId}
                className="flex flex-col gap-2 rounded-lg border px-4 py-2.5 sm:flex-row sm:items-center sm:gap-3.5 sm:py-2"
              >
                <div className="flex min-w-0 items-center gap-3 sm:contents">
                  <span className="w-24 shrink-0 whitespace-nowrap font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.06em]">
                    {shortGroup(m.groupName)} · S{m.round}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Link
                      href={`/match/${m.matchId}`}
                      className="truncate font-medium text-sm hover:text-brand-blue dark:hover:text-white"
                    >
                      {m.playerA.name}{" "}
                      <span className="text-muted-foreground">vs.</span>{" "}
                      {m.playerB.name}
                    </Link>
                    {m.freeWinReason ? (
                      <p className="truncate text-[13px] text-muted-foreground">
                        "{m.freeWinReason}" · gemeldet von{" "}
                        {m.reporterName ?? "—"}
                        {m.reportedAt
                          ? `, ${reportedAtLabel(m.reportedAt)}`
                          : ""}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 sm:contents">
                  <ChipEl
                    chip={{ label: `Freewin: ${winnerName(m)}`, tone: "free" }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={confirming === m.matchId}
                    onClick={() => confirm(m.matchId)}
                  >
                    {confirming === m.matchId ? "…" : "Bestätigen"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {allClear && round === currentRound ? (
        <EmptyStateCard title="Alles erledigt" informational>
          Alle {thisWeek.length} Matches dieser Woche sind gemeldet, nichts ist
          überfällig, keine Freewins offen, keine Anfechtungen.
        </EmptyStateCard>
      ) : null}

      <section
        id={WEEK_ANCHORS.round}
        className="flex scroll-mt-6 flex-col gap-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <SectionHead
            title={round === null ? "Spieltag" : `Spieltag ${round}`}
            count={weekOpen.length}
          />
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowAllWeek((v) => !v)}
              className="font-medium text-[13px] text-muted-foreground hover:text-brand-blue dark:hover:text-white"
            >
              {showAllWeek
                ? "Nur offene"
                : `Alle anzeigen (${thisWeek.length})`}
            </button>
            {round !== null ? (
              <RoundPager
                round={round}
                totalRounds={totalRounds}
                currentRound={currentRound}
              />
            ) : null}
          </div>
        </div>
        {weekShown.length === 0 ? (
          <p className="rounded-lg border px-4 py-4 text-center text-muted-foreground text-sm">
            {showAllWeek
              ? "An diesem Spieltag sind keine Matches angesetzt."
              : "An diesem Spieltag ist alles gemeldet."}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {weekShown.map((m) =>
              m.outcome === null ? (
                <MatchRow
                  key={m.matchId}
                  match={m}
                  chip={{ label: "offen", tone: "open" }}
                />
              ) : (
                <MatchRow
                  key={m.matchId}
                  match={m}
                  dimmed
                  chip={{
                    label:
                      m.outcome === "double_loss"
                        ? "Doppelniederlage"
                        : `Sieg: ${winnerName(m)}`,
                    tone: "done",
                  }}
                />
              ),
            )}
          </div>
        )}
      </section>

      {resolvedDisputes.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <SectionHead
              title="Erledigte Anfechtungen"
              count={resolvedDisputes.length}
            />
            <button
              type="button"
              onClick={() => setShowResolved((v) => !v)}
              className="font-medium text-[13px] text-muted-foreground hover:text-brand-blue dark:hover:text-white"
            >
              {showResolved ? "Ausblenden" : "Anzeigen"}
            </button>
          </div>
          {showResolved ? (
            <div className="flex flex-col gap-2">
              {resolvedDisputes.map((d) => (
                <div
                  key={d.matchId}
                  className="flex flex-col gap-2 rounded-lg border px-4 py-2.5 opacity-80 sm:flex-row sm:items-center sm:gap-3.5 sm:py-2"
                >
                  <div className="flex min-w-0 items-center gap-3 sm:contents">
                    <span className="w-24 shrink-0 whitespace-nowrap font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.06em]">
                      {shortGroup(d.groupName)} · S{d.round}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <Link
                        href={`/match/${d.matchId}`}
                        className="truncate font-medium text-sm hover:text-brand-blue dark:hover:text-white"
                      >
                        {d.playerA.name}{" "}
                        <span className="text-muted-foreground">vs.</span>{" "}
                        {d.playerB.name}
                      </Link>
                      <p className="truncate text-[13px] text-muted-foreground">
                        "{d.reason}" · {d.openedByName ?? "—"}
                      </p>
                      {d.note ? (
                        <p className="truncate text-[13px] text-muted-foreground">
                          Entscheidung: "{d.note}"
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:contents">
                    <ChipEl
                      chip={{
                        label:
                          d.resolution === "corrected"
                            ? "Korrigiert"
                            : "Bestätigt",
                        tone: "done",
                      }}
                    />
                    <span className="shrink-0 text-right text-[13px] text-muted-foreground tabular-nums sm:w-12">
                      {reportedAtLabel(d.resolvedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

// Previous / next Spieltag, and back to the running one. Links, so a
// Spieltag has a URL (`?spieltag=n#spieltag`) and the back button works.
function RoundPager({
  round,
  totalRounds,
  currentRound,
}: {
  round: number;
  totalRounds: number;
  currentRound: number | null;
}) {
  const href = (n: number) =>
    `/staff/woche?spieltag=${n}#${WEEK_ANCHORS.round}`;
  const step = `flex size-8 items-center justify-center rounded-md border text-muted-foreground hover:text-brand-blue dark:hover:text-white ${hoverCard}`;
  const disabled = "pointer-events-none opacity-40";
  return (
    <div className="flex items-center gap-1.5">
      <Link
        href={href(Math.max(1, round - 1))}
        aria-label="Vorheriger Spieltag"
        aria-disabled={round <= 1}
        className={cn(step, round <= 1 && disabled)}
      >
        ‹
      </Link>
      {currentRound !== null && round !== currentRound ? (
        <Link
          href={href(currentRound)}
          className="px-1.5 font-medium text-[13px] text-brand-blue hover:underline dark:text-white"
        >
          Aktueller
        </Link>
      ) : null}
      <Link
        href={href(Math.min(totalRounds, round + 1))}
        aria-label="Nächster Spieltag"
        aria-disabled={round >= totalRounds}
        className={cn(step, round >= totalRounds && disabled)}
      >
        ›
      </Link>
    </div>
  );
}
