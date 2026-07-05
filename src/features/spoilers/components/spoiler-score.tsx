"use client";

// A match row's score slot under spoiler protection: a Discord-style dark
// chip while covered, the plain score otherwise. Controlled by the row (which
// also suppresses winner bolding while covered). The click is shielded — the
// surrounding row stays a link to the match page.
export function SpoilerScore({
  scoreA,
  scoreB,
  covered,
  onReveal,
}: {
  scoreA: number | null;
  scoreB: number | null;
  covered: boolean;
  onReveal: () => void;
}) {
  if (!covered) {
    return (
      <span className="text-foreground">
        {scoreA} : {scoreB}
      </span>
    );
  }
  return (
    <button
      type="button"
      title="Ergebnis verdeckt — antippen zum Aufdecken"
      aria-label="Ergebnis aufdecken"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onReveal();
      }}
      className="rounded-[5px] bg-brand-blue/85 px-2.5 py-[3px] text-[10px] text-white/70 leading-none tracking-[0.2em] transition-colors hover:bg-brand-blue dark:bg-white/15 dark:hover:bg-white/25"
    >
      •••
    </button>
  );
}
