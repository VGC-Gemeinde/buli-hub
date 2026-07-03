"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StaffMatchRow } from "../queries";
import { confirmFreeWin } from "../staff-actions";

function formatDeadline(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("de-DE", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${dateStr}T00:00:00Z`));
}

function SectionHead({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-[11px] w-[22px] -skew-x-[18deg] bg-brand-orange" />
      <h2 className="text-brand-blue text-xl dark:text-white">{title}</h2>
      <span className="rounded-full bg-muted px-2 py-0.5 font-semibold text-[12.5px] text-muted-foreground tabular-nums">
        {count}
      </span>
    </div>
  );
}

function MatchRow({
  match,
  chip,
  action,
}: {
  match: StaffMatchRow;
  chip?: { label: string; tone: "overdue" | "open" | "free" };
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg border px-4 py-2.5">
      <Link
        href={`/match/${match.matchId}`}
        className="flex min-w-0 flex-1 items-center gap-3 hover:text-brand-blue dark:hover:text-white"
      >
        <span className="w-[92px] shrink-0 font-semibold text-[12.5px] text-muted-foreground uppercase tracking-[0.06em]">
          {match.groupName} · S{match.round}
        </span>
        <span className="truncate font-medium text-sm">
          {match.playerA.name}{" "}
          <span className="text-muted-foreground">vs.</span>{" "}
          {match.playerB.name}
        </span>
      </Link>
      {chip ? (
        <span
          className={cn(
            "shrink-0 whitespace-nowrap rounded-full px-2.5 py-[3px] font-semibold text-xs",
            chip.tone === "overdue" && "bg-destructive/10 text-destructive",
            chip.tone === "open" &&
              "bg-brand-orange/12 text-brand-blue dark:text-white",
            chip.tone === "free" &&
              "bg-brand-orange/12 text-brand-blue dark:text-white",
          )}
        >
          {chip.label}
        </span>
      ) : null}
      <span className="w-[52px] shrink-0 text-right text-[13px] text-muted-foreground">
        {formatDeadline(match.endsOn)}
      </span>
      {action}
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed px-4 py-4 text-center text-muted-foreground text-sm">
      {text}
    </p>
  );
}

export function SaisonDashboard({
  overdue,
  thisWeek,
  pendingFreeWins,
  currentRound,
  totalRounds,
}: {
  overdue: StaffMatchRow[];
  thisWeek: StaffMatchRow[];
  pendingFreeWins: StaffMatchRow[];
  currentRound: number | null;
  totalRounds: number;
}) {
  const router = useRouter();
  const [showAllWeek, setShowAllWeek] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const weekOpen = thisWeek.filter((m) => m.outcome === null);
  const weekShown = showAllWeek ? thisWeek : weekOpen;

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
    <div className="flex flex-col gap-9">
      <div className="flex flex-wrap gap-3">
        <Stat label="Überfällig" value={overdue.length} tone="alert" />
        <Stat label="Offen diese Woche" value={weekOpen.length} />
        <Stat label="Freigewinne offen" value={pendingFreeWins.length} />
        <Stat
          label="Spieltag"
          value={currentRound ? `${currentRound}/${totalRounds}` : "—"}
        />
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <section className="flex flex-col gap-3">
        <SectionHead title="Überfällig" count={overdue.length} />
        {overdue.length === 0 ? (
          <EmptyNote text="Keine überfälligen Matches." />
        ) : (
          <div className="flex flex-col gap-2">
            {overdue.map((m) => (
              <MatchRow
                key={m.matchId}
                match={m}
                chip={{ label: "Überfällig", tone: "overdue" }}
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <SectionHead title="Diese Woche" count={weekShown.length} />
          <button
            type="button"
            onClick={() => setShowAllWeek((v) => !v)}
            className="font-medium text-[13px] text-muted-foreground hover:text-brand-blue dark:hover:text-white"
          >
            {showAllWeek ? "Nur offene" : "Alle dieser Woche"}
          </button>
        </div>
        {weekShown.length === 0 ? (
          <EmptyNote
            text={
              showAllWeek
                ? "Diese Woche sind keine Matches angesetzt."
                : "Diese Woche ist alles gemeldet."
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            {weekShown.map((m) => (
              <MatchRow
                key={m.matchId}
                match={m}
                chip={
                  m.outcome === null
                    ? { label: "offen", tone: "open" }
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHead
          title="Freigewinne bestätigen"
          count={pendingFreeWins.length}
        />
        {pendingFreeWins.length === 0 ? (
          <EmptyNote text="Keine Freigewinne zu bestätigen." />
        ) : (
          <div className="flex flex-col gap-2">
            {pendingFreeWins.map((m) => (
              <MatchRow
                key={m.matchId}
                match={m}
                chip={{
                  label: `Freigewinn: ${
                    m.winnerId === m.playerA.userId
                      ? m.playerA.name
                      : m.playerB.name
                  }`,
                  tone: "free",
                }}
                action={
                  <Button
                    type="button"
                    size="sm"
                    disabled={confirming === m.matchId}
                    onClick={() => confirm(m.matchId)}
                  >
                    {confirming === m.matchId ? "…" : "Bestätigen"}
                  </Button>
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHead title="Disputes" count={0} />
        <EmptyNote text="Einsprüche gegen Ergebnisse folgen als eigenes Feature." />
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "alert";
}) {
  return (
    <div
      className={cn(
        "min-w-[130px] flex-1 rounded-lg border px-4 py-3",
        tone === "alert" &&
          value !== 0 &&
          "border-destructive/40 bg-destructive/5",
      )}
    >
      <div className="font-bold font-heading text-3xl text-brand-blue tabular-nums dark:text-white">
        {value}
      </div>
      <div className="mt-0.5 font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.08em]">
        {label}
      </div>
    </div>
  );
}
