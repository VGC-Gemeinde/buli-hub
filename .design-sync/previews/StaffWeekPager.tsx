import { PagerLegendItem, StaffWeekPager } from "buli-hub";
import { useState } from "react";

/* The Spieltag pager of the staff workspaces: one chip per Spieltag, the
 * round over the workspace's mark. The open week is navy; the running
 * Spieltag has an orange border, or an orange ring when it is the open one.
 * The marks and legends are the two real workspaces' (Match of the Week:
 * motw-week-pager.tsx, Aufnahmen: recording-manager.tsx), ported locally. */

type MotwState = "vod" | "no-vod" | "candidates" | "open";

const MOTW: Record<number, MotwState> = {
  1: "vod",
  2: "vod",
  3: "no-vod",
  4: "vod",
  5: "candidates",
  6: "candidates",
  7: "open",
  8: "open",
  9: "open",
};

const MOTW_LABEL: Record<MotwState, string> = {
  vod: "bestätigt, VOD verlinkt",
  "no-vod": "bestätigt, VOD fehlt noch",
  candidates: "Kandidaten gewählt, noch nicht bestätigt",
  open: "noch keine Kandidaten",
};

function MotwMark({ state }: { state: MotwState }) {
  if (state === "open") {
    return (
      <span
        aria-hidden
        className="h-[2px] w-2.5 rounded-full bg-current opacity-30"
      />
    );
  }
  if (state === "candidates") {
    return (
      <span
        aria-hidden
        className="size-[7px] rotate-45 border-[1.5px] border-current opacity-70"
      />
    );
  }
  return (
    <span
      aria-hidden
      className={
        state === "vod"
          ? "size-[7px] rounded-full bg-brand-orange"
          : "size-[7px] rounded-full border-[1.5px] border-brand-orange"
      }
    />
  );
}

function MotwPager({
  initial,
  currentRound,
}: {
  initial: number;
  currentRound: number | null;
}) {
  const [round, setRound] = useState(initial);
  return (
    <StaffWeekPager
      rounds={[1, 2, 3, 4, 5, 6, 7, 8, 9]}
      activeRound={round}
      currentRound={currentRound}
      onSelect={setRound}
      mark={(r) => <MotwMark state={MOTW[r] ?? "open"} />}
      describe={(r) => MOTW_LABEL[MOTW[r] ?? "open"]}
      legend={
        <>
          <PagerLegendItem mark={<MotwMark state="vod" />}>
            Bestätigt · VOD da
          </PagerLegendItem>
          <PagerLegendItem mark={<MotwMark state="no-vod" />}>
            Bestätigt · VOD fehlt
          </PagerLegendItem>
          <PagerLegendItem mark={<MotwMark state="candidates" />}>
            Kandidaten · nicht bestätigt
          </PagerLegendItem>
          <PagerLegendItem mark={<MotwMark state="open" />}>
            Offen
          </PagerLegendItem>
        </>
      }
    />
  );
}

function HoldMark({ count, active }: { count: number; active: boolean }) {
  if (count === 0) {
    return (
      <span
        aria-hidden
        className="h-[2px] w-2.5 rounded-full bg-current opacity-30"
      />
    );
  }
  return (
    <span
      aria-hidden
      className={
        active
          ? "flex h-[11px] min-w-[11px] items-center justify-center rounded-full bg-white px-[3px] font-bold text-[8px] text-brand-blue leading-none tabular-nums"
          : "flex h-[11px] min-w-[11px] items-center justify-center rounded-full bg-brand-blue px-[3px] font-bold text-[8px] text-white leading-none tabular-nums dark:bg-white dark:text-brand-blue"
      }
    >
      {count}
    </span>
  );
}

export function MatchOfTheWeek() {
  return <MotwPager initial={4} currentRound={5} />;
}

export function OffenerIstAktueller() {
  return <MotwPager initial={5} currentRound={5} />;
}

const HOLDS: Record<number, number> = { 5: 2, 6: 1, 7: 0, 8: 0, 9: 0 };
const POST: Record<number, { name: string; chip: string }> = {
  10: { name: "Woche 1", chip: "W1" },
  11: { name: "Woche 2", chip: "W2" },
};

export function NachsaisonAufnahmen() {
  const [round, setRound] = useState(6);
  const rounds = [5, 6, 7, 8, 9, 10, 11];
  const holds: Record<number, number> = { ...HOLDS, 10: 3, 11: 0 };
  return (
    <StaffWeekPager
      rounds={rounds}
      activeRound={round}
      currentRound={5}
      onSelect={setRound}
      mark={(r, active) => <HoldMark count={holds[r] ?? 0} active={active} />}
      name={(r) => POST[r]?.name ?? `Spieltag ${r}`}
      chip={(r) => POST[r]?.chip ?? String(r)}
      describe={(r) => {
        const count = holds[r] ?? 0;
        return count === 0
          ? "keine Aufnahme markiert"
          : count === 1
            ? "1 Aufnahme markiert"
            : `${count} Aufnahmen markiert`;
      }}
      legend={
        <>
          <PagerLegendItem mark={<HoldMark count={1} active={false} />}>
            Aufnahmen markiert (Anzahl)
          </PagerLegendItem>
          <PagerLegendItem mark={<HoldMark count={0} active={false} />}>
            Keine
          </PagerLegendItem>
        </>
      }
    />
  );
}

export function OhneLaufendenSpieltag() {
  return <MotwPager initial={1} currentRound={null} />;
}
