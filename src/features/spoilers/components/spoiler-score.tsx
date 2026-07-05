"use client";

import { cn } from "@/lib/utils";

// The shared masking idiom (design/SPOILER-SCHUTZ.md §1.1): a hidden value is
// drawn in place as a quiet placeholder pill at the size the real value would
// occupy. The click is shielded — surrounding rows stay links.
export function SpoilerPill({
  title,
  ariaLabel = "Ergebnis aufdecken",
  onReveal,
  className,
}: {
  title: string;
  ariaLabel?: string;
  onReveal: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={ariaLabel}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onReveal();
      }}
      className={cn(
        "cursor-pointer rounded-full bg-[oklch(0.93_0.01_262)] transition-colors hover:bg-[oklch(0.86_0.015_262)] dark:bg-white/12 dark:hover:bg-white/20",
        className,
      )}
    />
  );
}

// A match row's score slot under spoiler protection: the placeholder pill
// while covered — the featured match gets the orange MotW pill, which *is*
// its only row marker — and the plain score otherwise. Controlled by the row
// (which also suppresses winner bolding while covered).
export function SpoilerScore({
  scoreA,
  scoreB,
  covered,
  motw = false,
  onReveal,
}: {
  scoreA: number | null;
  scoreB: number | null;
  covered: boolean;
  motw?: boolean;
  onReveal: () => void;
}) {
  if (!covered) {
    return (
      <span className="text-foreground">
        {scoreA} : {scoreB}
      </span>
    );
  }
  if (motw) {
    return (
      <button
        type="button"
        title="Match of the Week — Ergebnis bleibt verdeckt, antippen zum Aufdecken"
        aria-label="Ergebnis aufdecken"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onReveal();
        }}
        className="cursor-pointer whitespace-nowrap rounded-full bg-brand-orange px-[9px] py-1 font-bold text-[8.5px] text-white uppercase leading-none tracking-[0.09em] transition-colors hover:bg-[#ff8d24]"
      >
        MotW
      </button>
    );
  }
  return (
    <SpoilerPill
      title="Ergebnis verdeckt — antippen zum Aufdecken"
      onReveal={onReveal}
      className="h-3 w-10"
    />
  );
}
