"use client";

import { divisionName } from "../seeding";
import type { DivisionRef } from "../sheet";

// Floating bar shown while ≥1 player is selected: move the selection to a
// division (or "—" to unplace), or clear the selection.
export function BulkBar({
  count,
  divisions,
  onAssign,
  onClear,
}: {
  count: number;
  divisions: DivisionRef[];
  onAssign: (divisionId: string | null) => void;
  onClear: () => void;
}) {
  if (count === 0) {
    return null;
  }
  return (
    <div className="-translate-x-1/2 absolute bottom-4 left-1/2 z-20 flex items-center gap-3 rounded-xl bg-brand-blue px-3.5 py-2 text-white shadow-lg dark:bg-[oklch(0.26_0.06_265)]">
      <span className="font-semibold text-[13.5px]">{count} ausgewählt</span>
      <span className="text-white/60 text-xs">verschieben nach</span>
      <button
        type="button"
        title="Nicht platziert"
        onClick={() => onAssign(null)}
        className="flex size-[26px] items-center justify-center rounded-md border border-white/30 bg-white/10 text-[12.5px] hover:bg-white/20"
      >
        —
      </button>
      {divisions.map((division) => (
        <button
          key={division.id}
          type="button"
          title={divisionName(division.tier)}
          onClick={() => onAssign(division.id)}
          className="flex size-[26px] items-center justify-center rounded-md border border-white/30 bg-white/10 text-[12.5px] hover:bg-white/20"
        >
          {division.tier}
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="text-[12.5px] text-white/60 hover:text-white"
      >
        Aufheben
      </button>
    </div>
  );
}
