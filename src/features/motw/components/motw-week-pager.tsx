"use client";

import {
  PagerLegendItem,
  StaffWeekPager,
} from "@/features/staff/components/staff-week-pager";
import { cn } from "@/lib/utils";
import type { MotwWeek } from "../motw";

// The season strip of the MotW workspace: every Spieltag at once, with
// where it stands. This is what replaced the separate "Frühere Spieltage"
// list — a round that is still undecided, or confirmed without a VOD, is
// visible here without a second list to work through. The chips, chevrons
// and scrolling are the shared `StaffWeekPager`.
//
// The four marks are shapes, not colors (filled dot / ring / diamond / dash),
// and the legend below spells them out.
export function MotwWeekPager({
  weeks,
  activeRound,
  currentRound,
  onSelect,
}: {
  weeks: MotwWeek[];
  activeRound: number;
  currentRound: number | null;
  onSelect: (round: number) => void;
}) {
  const byRound = new Map(weeks.map((week) => [week.round, week]));
  const stateOf = (round: number): MarkState => {
    const week = byRound.get(round);
    return week ? markState(week) : "open";
  };
  return (
    <StaffWeekPager
      rounds={weeks.map((week) => week.round)}
      activeRound={activeRound}
      currentRound={currentRound}
      onSelect={onSelect}
      mark={(round) => <Mark state={stateOf(round)} />}
      describe={(round) => MARK_LABEL[stateOf(round)]}
      legend={
        <>
          <PagerLegendItem mark={<Mark state="vod" />}>
            Bestätigt · VOD da
          </PagerLegendItem>
          <PagerLegendItem mark={<Mark state="no-vod" />}>
            Bestätigt · VOD fehlt
          </PagerLegendItem>
          <PagerLegendItem mark={<Mark state="candidates" />}>
            Kandidaten · nicht bestätigt
          </PagerLegendItem>
          <PagerLegendItem mark={<Mark state="open" />}>Offen</PagerLegendItem>
        </>
      }
    />
  );
}

type MarkState = "vod" | "no-vod" | "candidates" | "open";

function markState(week: MotwWeek): MarkState {
  if (week.selection) {
    return week.selection.youtubeUrl ? "vod" : "no-vod";
  }
  return week.candidates.length > 0 ? "candidates" : "open";
}

function Mark({ state }: { state: MarkState }) {
  if (state === "open") {
    return (
      <span
        aria-hidden
        className="h-[2px] w-2.5 rounded-full bg-current opacity-30"
      />
    );
  }
  if (state === "candidates") {
    // A diamond: the week has matches in the running but no decision. It
    // inherits the chip's own color (`border-current`), because the active chip
    // is navy and a navy mark would disappear on it.
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
      className={cn(
        "size-[7px] rounded-full",
        state === "vod"
          ? "bg-brand-orange"
          : "border-[1.5px] border-brand-orange",
      )}
    />
  );
}

const MARK_LABEL: Record<MarkState, string> = {
  vod: "bestätigt, VOD verlinkt",
  "no-vod": "bestätigt, VOD fehlt noch",
  candidates: "Kandidaten gewählt, noch nicht bestätigt",
  open: "noch keine Kandidaten",
};
