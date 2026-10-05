"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { hoverCard } from "@/lib/emphasis";
import { cn } from "@/lib/utils";

// The Spieltag pager of the staff workspaces (docs/plans/staff-week-pager.md):
// one chip per Spieltag, the round number over a mark that says where that
// week stands for this workspace (the MotW decision, the recording holds).
// The open week is navy; the running Spieltag has an orange border, or an
// orange ring when it is the open one. Chevrons step through the weeks, and
// a long season scrolls with the open chip kept in view. Each workspace
// brings only its marks and its legend; the "Aktueller Spieltag" entry is
// the pager's own.
//
// The public Liga pages use the `SpieltagTimeline` instead: that answers
// "where in the season am I", this is a worklist.
export function StaffWeekPager({
  rounds,
  activeRound,
  currentRound,
  onSelect,
  mark,
  describe,
  legend,
}: {
  rounds: readonly number[];
  activeRound: number;
  currentRound: number | null;
  onSelect: (round: number) => void;
  // The week's mark; `active` because a mark drawn in navy has to invert on
  // the navy chip.
  mark: (round: number, active: boolean) => ReactNode;
  // The chip's tooltip after "Spieltag n: ".
  describe: (round: number) => string;
  // The workspace's legend entries (`PagerLegendItem`s).
  legend: ReactNode;
}) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const index = rounds.indexOf(activeRound);

  const scrollActiveIntoView = () =>
    activeRef.current?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });

  // Long seasons scroll: show the open week on arrival.
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });
  }, []);

  const step = (delta: number) => {
    const next = rounds[index + delta];
    if (next !== undefined) {
      onSelect(next);
      // The freshly activated chip has not rendered yet: scroll on the next
      // frame, once the ref points at it.
      requestAnimationFrame(scrollActiveIntoView);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      {/* `w-fit` keeps the chevrons next to the strip in a short season
          instead of pinning them to the page edges; a long one fills the
          width and scrolls. */}
      <div className="flex w-fit max-w-full items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Vorheriger Spieltag"
          disabled={index <= 0}
          onClick={() => step(-1)}
        >
          <ChevronLeft aria-hidden />
        </Button>

        <div
          className="-mx-1 min-w-0 flex-1 overflow-x-auto px-1 py-1"
          role="tablist"
          aria-label="Spieltag wählen"
        >
          <div className="flex gap-1.5">
            {rounds.map((round) => {
              const active = round === activeRound;
              const isCurrent = round === currentRound;
              return (
                <button
                  key={round}
                  ref={active ? activeRef : undefined}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  title={`Spieltag ${round}: ${describe(round)}${
                    isCurrent ? " · aktueller Spieltag" : ""
                  }`}
                  onClick={() => onSelect(round)}
                  className={cn(
                    "flex w-[42px] shrink-0 flex-col items-center gap-1.5 rounded-lg border py-1.5 transition-colors",
                    active
                      ? "border-brand-blue bg-brand-blue text-white"
                      : hoverCard,
                    isCurrent && !active && "border-brand-orange/70",
                    isCurrent &&
                      active &&
                      "ring-2 ring-brand-orange ring-offset-2 ring-offset-background",
                  )}
                >
                  <span className="font-semibold text-[13px] leading-none tabular-nums">
                    {round}
                  </span>
                  {mark(round, active)}
                </button>
              );
            })}
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Nächster Spieltag"
          disabled={index < 0 || index >= rounds.length - 1}
          onClick={() => step(1)}
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-muted-foreground">
        {legend}
        <PagerLegendItem
          mark={
            <span className="size-2.5 rounded-[3px] border border-brand-orange" />
          }
        >
          Aktueller Spieltag
        </PagerLegendItem>
      </div>
    </div>
  );
}

export function PagerLegendItem({
  mark,
  children,
}: {
  mark: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className="flex items-center gap-1.5">
      {mark}
      {children}
    </span>
  );
}
