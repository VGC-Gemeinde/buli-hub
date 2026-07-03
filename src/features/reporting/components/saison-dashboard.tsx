"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DisputeRow, StaffMatchRow } from "../queries";
import { confirmFreeWin } from "../staff-actions";
import { AwardFreewinDialog } from "./award-freewin-dialog";

function ddMM(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${dateStr}T00:00:00Z`));
}
function reportedAtLabel(date: Date | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
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
      <div className="h-[11px] w-[22px] -skew-x-[18deg] bg-brand-orange" />
      <h2 className="font-bold font-heading text-[22px] text-brand-blue uppercase tracking-[0.03em] dark:text-white">
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
  action,
}: {
  match: StaffMatchRow;
  chip?: Chip;
  dimmed?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3.5 rounded-lg border px-4 py-2",
        dimmed && "opacity-60",
      )}
    >
      <span className="w-24 shrink-0 whitespace-nowrap font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.06em]">
        {shortGroup(match.groupName)} · S{match.round}
      </span>
      <Link
        href={`/match/${match.matchId}`}
        className="min-w-0 flex-1 truncate font-medium text-sm hover:text-brand-blue dark:hover:text-white"
      >
        {match.playerA.name} <span className="text-muted-foreground">vs.</span>{" "}
        {match.playerB.name}
      </Link>
      {chip ? <ChipEl chip={chip} /> : null}
      <span className="w-12 shrink-0 text-right text-[13px] text-muted-foreground tabular-nums">
        {ddMM(match.endsOn)}
      </span>
      {action}
    </div>
  );
}

export function SaisonDashboard({
  overdue,
  thisWeek,
  pendingFreeWins,
  disputed,
  resolvedDisputes,
  today = new Date().toISOString().slice(0, 10),
}: {
  overdue: StaffMatchRow[];
  thisWeek: StaffMatchRow[];
  pendingFreeWins: StaffMatchRow[];
  disputed: StaffMatchRow[];
  resolvedDisputes: DisputeRow[];
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
      <div className="grid grid-cols-4 gap-3">
        <Stat label="Überfällig" value={overdue.length} alert />
        <Stat label="Angefochten" value={disputed.length} alert />
        <Stat label="Offen diese Woche" value={weekOpen.length} />
        <Stat label="Freewins offen" value={pendingFreeWins.length} />
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      {overdue.length > 0 ? (
        <section className="flex flex-col gap-3">
          <SectionHead title="Überfällig" count={overdue.length} />
          <div className="flex flex-col gap-2">
            {overdue.map((m) => (
              <MatchRow
                key={m.matchId}
                match={m}
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
        <section className="flex flex-col gap-3">
          <SectionHead title="Angefochten" count={disputed.length} />
          <div className="flex flex-col gap-2">
            {disputed.map((m) => (
              <div
                key={m.matchId}
                className="flex items-center gap-3.5 rounded-lg border border-destructive/30 bg-destructive/[0.03] px-4 py-2"
              >
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
                      „{m.dispute.reason}" — {m.dispute.openedByName ?? "—"}
                    </p>
                  ) : null}
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/match/${m.matchId}`}>Prüfen</Link>
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {pendingFreeWins.length > 0 ? (
        <section className="flex flex-col gap-3">
          <SectionHead
            title="Freewins bestätigen"
            count={pendingFreeWins.length}
          />
          <div className="flex flex-col gap-2">
            {pendingFreeWins.map((m) => (
              <div
                key={m.matchId}
                className="flex items-center gap-3.5 rounded-lg border px-4 py-2"
              >
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
                      „{m.freeWinReason}" — gemeldet von {m.reporterName ?? "—"}
                      {m.reportedAt ? `, ${reportedAtLabel(m.reportedAt)}` : ""}
                    </p>
                  ) : null}
                </div>
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
            ))}
          </div>
        </section>
      ) : null}

      {allClear ? (
        <div className="flex items-center gap-4 rounded-lg border border-dashed px-6 py-5">
          <div className="h-2.5 w-5 -skew-x-[18deg] bg-brand-orange" />
          <div>
            <p className="font-bold font-heading text-brand-blue text-xl uppercase dark:text-white">
              Alles erledigt
            </p>
            <p className="text-[13.5px] text-muted-foreground">
              Alle {thisWeek.length} Matches dieser Woche sind gemeldet, nichts
              ist überfällig, keine Freewins offen, keine Anfechtungen.
            </p>
          </div>
        </div>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <SectionHead title="Diese Woche offen" count={weekOpen.length} />
          <button
            type="button"
            onClick={() => setShowAllWeek((v) => !v)}
            className="font-medium text-[13px] text-muted-foreground hover:text-brand-blue dark:hover:text-white"
          >
            {showAllWeek ? "Nur offene" : `Alle anzeigen (${thisWeek.length})`}
          </button>
        </div>
        {weekShown.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-4 text-center text-muted-foreground text-sm">
            {showAllWeek
              ? "Diese Woche sind keine Matches angesetzt."
              : "Diese Woche ist alles gemeldet."}
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
                  className="flex items-center gap-3.5 rounded-lg border px-4 py-2 opacity-80"
                >
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
                      „{d.reason}" — {d.openedByName ?? "—"}
                    </p>
                  </div>
                  <ChipEl
                    chip={{
                      label:
                        d.resolution === "corrected"
                          ? "Korrigiert"
                          : "Bestätigt",
                      tone: "done",
                    }}
                  />
                  <span className="w-12 shrink-0 text-right text-[13px] text-muted-foreground tabular-nums">
                    {reportedAtLabel(d.resolvedAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  alert,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  const isAlert = alert && value > 0;
  return (
    <div
      className={cn(
        "rounded-lg border px-4.5 py-3.5",
        isAlert && "border-destructive/40 bg-destructive/5",
      )}
    >
      <div
        className={cn(
          "font-bold font-heading text-[32px] leading-none tabular-nums",
          value === 0
            ? "text-[oklch(0.72_0.02_262)]"
            : "text-brand-blue dark:text-white",
          isAlert && "text-destructive",
        )}
      >
        {value}
      </div>
      <div
        className={cn(
          "mt-1 font-semibold text-xs uppercase tracking-[0.08em]",
          isAlert ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {label}
      </div>
    </div>
  );
}
