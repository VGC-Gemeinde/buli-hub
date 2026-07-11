"use client";

import { Fragment } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SeedingStep } from "../steps";

// The two views below the control row: the placement sheet and the
// promotion/demotion rules panel.
export type SeedingView = "sheet" | "rules";

// The toolbar's workflow strip — progress display and page navigation in one.
// The first segment (Platzieren · In Gruppen) is the sheet view, the second
// (Auf- & Abstieg) the rules view; the active view is highlighted, clicking a
// segment switches. Each step keeps its status icon (✓ done / ● active /
// ○ pending). "Finalisieren" is not a view but the gated final action: a
// primary button when everything is ready, otherwise disabled with a hint —
// and a plain status chip for observers and after finalize.
export function StepBar({
  steps,
  view,
  onViewChange,
  finalize,
}: {
  steps: SeedingStep[];
  view: SeedingView;
  onViewChange: (view: SeedingView) => void;
  finalize?: { enabled: boolean; hint: string; onClick: () => void };
}) {
  const sheetSteps = steps.filter((s) => s.id === "place" || s.id === "group");
  const rulesStep = steps.find((s) => s.id === "post_season");
  const finalizeStep = steps.find((s) => s.id === "finalize");

  return (
    <div className="flex items-center gap-2.5">
      <ViewSegment
        active={view === "sheet"}
        onClick={() => onViewChange("sheet")}
      >
        {sheetSteps.map((step, i) => (
          <Fragment key={step.id}>
            {i > 0 ? (
              <span aria-hidden className="text-muted-foreground/40">
                ·
              </span>
            ) : null}
            <StepChipContent step={step} />
          </Fragment>
        ))}
      </ViewSegment>
      <Separator />
      {rulesStep ? (
        <ViewSegment
          active={view === "rules"}
          onClick={() => onViewChange("rules")}
        >
          <StepChipContent step={rulesStep} />
        </ViewSegment>
      ) : null}
      <Separator />
      {finalizeStep ? (
        finalize ? (
          <div title={finalize.hint}>
            {finalize.enabled ? (
              <Button type="button" size="sm" onClick={finalize.onClick}>
                Finalisieren…
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled
                className="gap-1.5"
              >
                <StepChipContent step={finalizeStep} action />
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-1">
            <StepChipContent step={finalizeStep} />
          </div>
        )
      ) : null}
    </div>
  );
}

function Separator() {
  return (
    <span aria-hidden className="text-muted-foreground/40">
      ›
    </span>
  );
}

function ViewSegment({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-2.5 py-1.5",
        active
          ? "border-brand-orange/40 bg-brand-orange/5"
          : "border-transparent hover:border-border hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

// `action` appends the dialog ellipsis to the label (the chip sits inside the
// gated finalize button then).
function StepChipContent({
  step,
  action = false,
}: {
  step: SeedingStep;
  action?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5">
      {step.state === "done" ? (
        <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-brand-orange text-[11px] text-white">
          ✓
        </span>
      ) : step.state === "active" ? (
        <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 border-brand-orange">
          <span className="size-[6px] rounded-full bg-brand-orange" />
        </span>
      ) : (
        <span className="size-[18px] shrink-0 rounded-full border-2 border-muted-foreground/30" />
      )}
      <span
        className={cn(
          "whitespace-nowrap font-semibold text-[11.5px] uppercase tracking-[0.06em]",
          step.state === "active" ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {step.label}
        {action ? "…" : null}
      </span>
      {step.count ? (
        <span
          className={cn(
            "text-[11.5px] tabular-nums",
            step.state === "active"
              ? "font-semibold text-foreground"
              : "text-muted-foreground",
          )}
        >
          {step.count.done}/{step.count.total}
        </span>
      ) : null}
    </span>
  );
}
