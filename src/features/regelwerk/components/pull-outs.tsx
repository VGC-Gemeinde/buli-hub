import type { ReactNode } from "react";
import { Tick } from "@/components/tick";
import { cn } from "@/lib/utils";

// The four rules players consult mid-match (design §2.7). As bullet lists they
// are unusable — the whole point of each is a shape: a week, three point
// values, an ordered ladder, a clock. Everything here is layout over content
// that also exists in the surrounding prose.

function PullOut({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
      <div className="flex items-center gap-2.5">
        <Tick size="m" />
        <span className="font-semibold text-[13px] text-muted-foreground uppercase tracking-[0.16em]">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

/** "nur in Gruppentabellen", "Champions" — scope qualifiers on a rule. */
export function QualifierPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 font-semibold text-[11px] text-muted-foreground uppercase tracking-[0.06em]">
      {children}
    </span>
  );
}

// --- a) Deine Spielwoche ----------------------------------------------------

const WEEK = [
  { day: "Mo", note: "0:00" },
  { day: "Di", note: "—" },
  { day: "Mi", note: "Meldefrist", deadline: true },
  { day: "Do", note: "—" },
  { day: "Fr", note: "—" },
  { day: "Sa", note: "—" },
  { day: "So", note: "23:59" },
] as const;

export function SpielwochePullOut() {
  return (
    <PullOut title="Deine Spielwoche">
      {/* Seven across only fits from sm up; below that the week wraps to
          4 + 3 rather than shrinking the type past the 12pt floor. */}
      <div className="grid grid-cols-4 gap-1 sm:flex">
        {WEEK.map((entry) => (
          <div
            key={entry.day}
            className={cn(
              "flex flex-1 flex-col items-center gap-1.5 rounded-md py-2.5",
              "deadline" in entry
                ? "border border-brand-orange bg-brand-orange/5"
                : "bg-muted",
            )}
          >
            <span className="font-bold font-heading text-[13px]">
              {entry.day}
            </span>
            <span
              className={cn(
                "text-[11px] tabular-nums",
                "deadline" in entry
                  ? "font-semibold text-brand-orange"
                  : "text-muted-foreground",
              )}
            >
              {entry.note}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[13px] text-muted-foreground leading-[1.55]">
        Gespielt wird von{" "}
        <strong className="font-semibold text-foreground">
          Montag 0:00 Uhr
        </strong>{" "}
        bis{" "}
        <strong className="font-semibold text-foreground">
          Sonntag 23:59 Uhr
        </strong>
        . Melde dich bis{" "}
        <strong className="font-semibold text-foreground">Mittwochabend</strong>{" "}
        bei deinem Gegner. Sonst kann er einen Freewin beanspruchen. Alle Zeiten
        sind deutsche Zeit.
      </p>
    </PullOut>
  );
}

// --- b) Punkte --------------------------------------------------------------

const POINTS = [
  { value: "3", label: "Best of 3\ngewonnen", win: true },
  { value: "0", label: "Best of 3\nverloren", win: false },
  { value: "0", label: "Nicht angetreten\n(gilt als 0-2)", win: false },
] as const;

export function PunktePullOut() {
  return (
    <PullOut title="Punkte">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {POINTS.map((entry) => (
          <div
            key={entry.label}
            className={cn(
              "flex items-center gap-3.5 rounded-lg border px-4 py-3.5",
              entry.win
                ? "border-brand-orange bg-brand-orange/5"
                : "border-border bg-card",
            )}
          >
            <span
              className={cn(
                "font-bold font-heading text-4xl tabular-nums",
                entry.win ? "text-brand-orange" : "text-muted-foreground",
              )}
            >
              {entry.value}
            </span>
            <span className="whitespace-pre-line font-medium text-[13px] leading-snug">
              {entry.label}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[13px] text-muted-foreground leading-[1.55]">
        Für die Game-Wertung zählen{" "}
        <strong className="font-semibold text-foreground">
          Freewins als 2-0
        </strong>{" "}
        für den Sieger und{" "}
        <strong className="font-semibold text-foreground">
          Doppelniederlagen als 0-2
        </strong>{" "}
        für beide Spieler.
      </p>
    </PullOut>
  );
}

// --- c) Tiebreaker ----------------------------------------------------------

const TIEBREAKERS = [
  {
    title: "Game Differenz",
    body: "7 gewonnene und 3 verlorene Games (+4) stehen über 6 gewonnenen und 5 verlorenen (+1).",
  },
  {
    title: "Direkter Vergleich",
    qualifier: "nur in Gruppentabellen",
    body: "Herangezogen werden ausschließlich die Matches gegen die punkt- und differenzgleichen Spieler. Sind mehr als zwei gleichauf, zählt, wie viele von ihnen man geschlagen hat. Haben sie sich reihum besiegt, bringt der direkte Vergleich keine Entscheidung.",
  },
  {
    title: "Game Winrate",
    body: "Der Anteil gewonnener Games an allen ausgetragenen. 6:2 (0,75) steht über 7:3 (0,70). Bei gleicher Game Differenz gibt die bessere Quote den Ausschlag.",
  },
] as const;

export function TiebreakerPullOut() {
  return (
    <PullOut title="Tiebreaker">
      {/* The order *is* the rule, so this is a ladder and never a bullet list. */}
      <ol className="flex flex-col gap-3">
        {TIEBREAKERS.map((entry, index) => (
          <li
            key={entry.title}
            className="flex gap-4 rounded-lg border border-border bg-card p-4"
          >
            <span className="font-bold font-heading text-[22px] text-brand-orange leading-none tabular-nums">
              {index + 1}
            </span>
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold font-heading text-[15px] text-brand-blue uppercase tracking-[0.02em] dark:text-white">
                  {entry.title}
                </span>
                {"qualifier" in entry ? (
                  <QualifierPill>{entry.qualifier}</QualifierPill>
                ) : null}
              </div>
              <p className="text-[13px] text-muted-foreground leading-[1.55]">
                {entry.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </PullOut>
  );
}

// --- d) Nichtantreten -------------------------------------------------------

const NO_SHOW = [
  {
    time: "0 min",
    claimed: false,
    body: "Gegner im Division-Channel taggen. Ohne Tag kann später kein Win eingefordert werden.",
  },
  {
    time: "10 min",
    claimed: true,
    body: "Gamewin einforderbar: @Staff - Liga taggen, Nachweis über die vereinbarte Zeit erbringen, Gegner erneut taggen.",
  },
  {
    time: "15 min",
    claimed: true,
    body: "Setwin einforderbar.",
  },
] as const;

export function NichtantretenPullOut() {
  return (
    <PullOut title="Nichtantreten">
      {/* The header's 3px accent line reused as a timeline: orange marks the
          segments in which the present player has gained a claim. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-2">
        {NO_SHOW.map((step) => (
          <div key={step.time} className="flex flex-1 flex-col gap-1.5">
            <span className="font-bold font-heading text-[15px] tabular-nums">
              {step.time}
            </span>
            <span
              className={cn(
                "h-[3px] w-full",
                step.claimed ? "bg-brand-orange" : "bg-border",
              )}
            />
            <p className="text-[12.5px] text-muted-foreground leading-[1.55]">
              {step.body}
            </p>
          </div>
        ))}
      </div>
    </PullOut>
  );
}
