import { SpoilerScore } from "buli-hub";

/* A match row's score slot under spoiler protection (design/SPOILER-SCHUTZ.md
 * §2.2–2.3). Three renderings out of one component: the neutral placeholder
 * pill while covered, the orange MotW pill for the featured match — that pill
 * IS the row's only MotW marker — and the plain score once revealed.
 *
 * Always shown inside the row's fixed `w-12` slot: pill ⇄ score ⇄ „offen" swap
 * without a pixel of horizontal shift. */

const noop = () => {};

// Width pinned to the overview column so the cards read like the real list.
const ROW =
  "flex w-[560px] items-center gap-2 rounded-lg border px-3 py-2 text-sm";
const SLOT =
  "relative flex w-12 shrink-0 items-center justify-center font-semibold text-muted-foreground text-xs tabular-nums";

function MatchRow({
  playerA,
  playerB,
  winner,
  mine = false,
  children,
}: {
  playerA: string;
  playerB: string;
  winner?: "a" | "b";
  mine?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        mine ? `${ROW} border-brand-orange/40 bg-brand-orange/5` : ROW
      }
    >
      <span
        className={`min-w-0 flex-1 truncate ${winner === "a" ? "font-semibold" : "font-medium"}`}
      >
        {playerA}
      </span>
      <span className={SLOT}>{children}</span>
      <span
        className={`flex min-w-0 flex-1 flex-row-reverse truncate ${winner === "b" ? "font-semibold" : "font-medium"}`}
      >
        {playerB}
      </span>
    </div>
  );
}

/** The whole state machine as a neutral visitor sees a Spieltag: unplayed,
 *  covered, the permanent MotW cover, and the one match that is their own. */
export function Spieltagsliste() {
  return (
    <div className="flex flex-col gap-2">
      <MatchRow playerA="Testerino" playerB="Falinks" winner="a" mine>
        <SpoilerScore
          scoreA={2}
          scoreB={1}
          covered={false}
          onReveal={noop}
        />
      </MatchRow>
      <MatchRow playerA="Blaubeerkuchen" playerB="Wooloo">
        <SpoilerScore scoreA={2} scoreB={0} covered onReveal={noop} />
      </MatchRow>
      <MatchRow playerA="Grafaiai" playerB="Kilowattrel">
        <SpoilerScore scoreA={2} scoreB={1} covered motw onReveal={noop} />
      </MatchRow>
      <MatchRow playerA="Maushold" playerB="Tinkatink">
        offen
      </MatchRow>
    </div>
  );
}

/** Covered: the neutral 40×12 placeholder pill. Winner bolding stays
 *  suppressed — bold names would leak the result the pill is hiding. */
export function Verdeckt() {
  return (
    <MatchRow playerA="Blaubeerkuchen" playerB="Wooloo">
      <SpoilerScore scoreA={2} scoreB={0} covered onReveal={noop} />
    </MatchRow>
  );
}

/** Match of the Week: the orange cover pill replaces the row badge entirely
 *  and ignores the global switch — no row tint, no second marker. */
export function MatchOfTheWeek() {
  return (
    <MatchRow playerA="Grafaiai" playerB="Kilowattrel">
      <SpoilerScore scoreA={2} scoreB={1} covered motw onReveal={noop} />
    </MatchRow>
  );
}

/** Revealed: the plain score in the very same slot, winner bolding back. */
export function Aufgedeckt() {
  return (
    <MatchRow playerA="Blaubeerkuchen" playerB="Wooloo" winner="a">
      <SpoilerScore scoreA={2} scoreB={0} covered={false} onReveal={noop} />
    </MatchRow>
  );
}
