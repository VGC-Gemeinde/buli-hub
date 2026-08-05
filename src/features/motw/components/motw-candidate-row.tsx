"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { type MotwCandidate, recordability } from "../motw";
import { MotwSide } from "./motw-player";

function shortGroup(groupName: string): string {
  return groupName.replace("Division ", "Div ");
}

// One pickable matchup. The whole row is the button — picking a MotW means
// scanning a long list, and hunting a small trailing button for every candidate
// is the slow way to do that. The trailing „Wählen" stays as the visible
// affordance and lights up with the row.
export function MotwCandidateRow({
  candidate,
  picked,
  pending,
  disabled,
  onPick,
}: {
  candidate: MotwCandidate;
  picked: boolean;
  pending: boolean;
  disabled: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled || picked}
      aria-pressed={picked}
      className={cn(
        "group grid w-full grid-cols-1 items-center gap-x-3 gap-y-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
        // The trailing column is fixed, not `auto`: markers appear on some rows
        // only, and a width that depends on them would shift the avatar columns
        // from row to row.
        "sm:grid-cols-[60px_1fr_auto_1fr_236px] sm:py-2",
        picked
          ? "border-brand-orange/55 bg-brand-orange/[0.07]"
          : "hover:border-brand-orange/40 hover:bg-brand-orange/[0.045]",
        disabled && !picked && "pointer-events-none opacity-55",
        !picked && "cursor-pointer",
      )}
    >
      <span className="flex items-center gap-2 sm:block">
        <span className="whitespace-nowrap font-semibold text-[11px] text-muted-foreground uppercase tracking-[0.06em]">
          {shortGroup(candidate.groupName)}
        </span>
        {/* The marker rides along with the group label on mobile, where the
            trailing column has collapsed. */}
        <span className="sm:hidden">
          <RowMarker candidate={candidate} />
        </span>
      </span>

      <MotwSide player={candidate.playerA} side="left" />
      <span className="hidden text-[11.5px] text-muted-foreground/70 sm:block">
        vs.
      </span>
      <MotwSide player={candidate.playerB} side="right" />

      <span className="flex items-center justify-end gap-2.5">
        <span className="hidden sm:block">
          <RowMarker candidate={candidate} />
        </span>
        {picked ? (
          <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-brand-orange/55 bg-brand-orange/12 px-2.5 py-1 font-semibold text-[#9a4b00] text-[12.5px] dark:text-brand-orange">
            <Check aria-hidden className="size-3.5" />
            Gewählt
          </span>
        ) : (
          <span
            className={cn(
              "shrink-0 whitespace-nowrap rounded-md border px-2.5 py-1 font-medium text-[12.5px] transition-colors",
              "group-hover:border-brand-orange group-hover:bg-brand-orange group-hover:text-white",
            )}
          >
            {pending ? "Wird gewählt…" : "Wählen"}
          </span>
        )}
      </span>
    </button>
  );
}

// At most one marker per row, most important first: whether the match can be
// recorded decides the pick, whether it is already played is context. Two chips
// of different weights side by side read as clutter, and all three share one
// outlined pill so the row never looks assembled from spare parts.
export function RowMarker({ candidate }: { candidate: MotwCandidate }) {
  const marker = rowMarker(candidate);
  if (!marker) {
    return null;
  }
  return (
    <span
      title={marker.title}
      className={cn(
        "whitespace-nowrap rounded-full border px-2 py-[3px] font-semibold text-[11px] leading-none",
        marker.tone === "bad" && "border-destructive/45 text-destructive",
        marker.tone === "warn" &&
          "border-brand-orange/55 text-[#9a4b00] dark:text-brand-orange",
        marker.tone === "quiet" && "border-border text-muted-foreground",
      )}
    >
      {marker.label}
    </span>
  );
}

function rowMarker(
  candidate: MotwCandidate,
): { label: string; title: string; tone: "bad" | "warn" | "quiet" } | null {
  const state = recordability(candidate);
  if (state === "no") {
    return {
      label: "nicht aufnehmbar",
      title:
        "Keiner der beiden Spieler hat eine Capture Card — dieses Match lässt sich nicht aufnehmen",
      tone: "bad",
    };
  }
  if (state === "unknown") {
    return {
      label: "Capture Card unklar",
      title:
        "Mindestens einer der beiden hat sein Profil nie ausgefüllt — vor der Wahl nachfragen, ob eine Capture Card vorhanden ist",
      tone: "warn",
    };
  }
  if (candidate.reported) {
    return {
      label: "gemeldet",
      title: "Dieses Match ist bereits gemeldet",
      tone: "quiet",
    };
  }
  return null;
}
