"use client";

import { ChevronRight } from "lucide-react";
import { Tick } from "@/components/tick";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type RulesEditorStatus,
  rulesStepSublabel,
  type SeedingStep,
  type SeedingStepState,
} from "../steps";

// The two views below the step bar: the placement sheet and the
// promotion/demotion rules panel.
export type SeedingView = "sheet" | "rules";

// What the finalize step needs beyond the pure step state: whether the page
// is finalized/observing, the gate texts and the dialog opener.
export type FinalizeStepProps = {
  finalized: boolean;
  ready: boolean;
  readOnly: boolean;
  gateShort: string | null;
  gateHint: string;
  onOpen: () => void;
};

const STEP_NUMBER: Record<SeedingStep["id"], number> = {
  place: 1,
  group: 2,
  post_season: 3,
  finalize: 4,
};

// The workflow strip — a full-width stepper row that answers three questions
// without mixing them up: numbered circles show *how far*, the highlighted
// view segment shows *where you are*, and the finalize step spells out *what
// still blocks* inline. Steps 1+2 share the sheet segment (their work happens
// in the sheet), step 3 is the rules segment, step 4 is the gated action.
export function StepBar({
  steps,
  view,
  onViewChange,
  rulesStatus,
  finalize,
}: {
  steps: SeedingStep[];
  view: SeedingView;
  onViewChange: (view: SeedingView) => void;
  rulesStatus: RulesEditorStatus;
  finalize: FinalizeStepProps;
}) {
  const place = steps.find((s) => s.id === "place");
  const group = steps.find((s) => s.id === "group");
  const rules = steps.find((s) => s.id === "post_season");
  const fin = steps.find((s) => s.id === "finalize");
  const rulesSub = rulesStepSublabel(rulesStatus);

  return (
    <div className="flex items-center gap-1 border-b px-7 pt-1 pb-2.5">
      <ViewSegment
        active={view === "sheet"}
        title="Ansicht: Spieler platzieren und Gruppen bilden"
        onClick={() => onViewChange("sheet")}
      >
        {place ? (
          <Step step={place}>
            <ProgressSub count={place.count} fill="bg-brand-orange" />
          </Step>
        ) : null}
        <ChevronRight
          aria-hidden
          className="size-[13px] text-muted-foreground/40"
        />
        {group ? (
          <Step step={group}>
            <ProgressSub
              count={group.count}
              fill="bg-brand-blue dark:bg-white/80"
            />
          </Step>
        ) : null}
      </ViewSegment>
      <Separator />
      <ViewSegment
        active={view === "rules"}
        title="Ansicht: Saison-Regeln festlegen (Auf- & Abstieg, Replay-Pflicht)"
        onClick={() => onViewChange("rules")}
      >
        {rules ? (
          <Step step={rules}>
            <span
              className={cn(
                "text-[11.5px]",
                rulesSub.warn
                  ? "text-[oklch(0.55_0.13_50)]"
                  : "text-muted-foreground",
              )}
            >
              {rulesSub.text}
            </span>
          </Step>
        ) : null}
      </ViewSegment>
      <Separator />
      {fin ? <FinalizeStep step={fin} finalize={finalize} /> : null}
      <div className="flex-1" />
      {finalize.finalized ? null : (
        <span className="text-[12px] text-muted-foreground/70">
          Schritte 1–3 abschließen, dann finalisieren
        </span>
      )}
    </div>
  );
}

function Separator() {
  return (
    <ChevronRight
      aria-hidden
      className="size-[15px] text-muted-foreground/50"
    />
  );
}

function ViewSegment({
  active,
  title,
  onClick,
  children,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      title={title}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-[10px] border px-3.5 py-1.5",
        active
          ? "border-brand-orange/40 bg-brand-orange/5 shadow-[inset_0_-2px_0_var(--brand-orange)]"
          : "border-transparent hover:border-border hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

// Numbered circle: progress semantics only (✓ done, number otherwise) — the
// segment highlight, not the circle, marks the current view.
function Circle({
  state,
  number,
}: {
  state: SeedingStepState;
  number: number;
}) {
  return (
    <span
      className={cn(
        "flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 font-bold text-[11.5px]",
        state === "done" && "border-brand-orange bg-brand-orange text-white",
        state === "active" &&
          "border-brand-orange bg-background text-brand-orange",
        state === "pending" &&
          "border-muted-foreground/30 text-muted-foreground",
      )}
    >
      {state === "done" ? "✓" : number}
    </span>
  );
}

function Step({
  step,
  children,
}: {
  step: SeedingStep;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-2.5">
      <Circle state={step.state} number={STEP_NUMBER[step.id]} />
      <span className="flex flex-col items-start gap-[3px]">
        <StepLabel step={step} />
        {children}
      </span>
    </span>
  );
}

function StepLabel({ step }: { step: SeedingStep }) {
  return (
    <span
      className={cn(
        "whitespace-nowrap font-heading text-[14.5px] uppercase leading-none tracking-[0.05em]",
        step.state === "pending" ? "text-muted-foreground" : "text-foreground",
      )}
    >
      {step.label}
    </span>
  );
}

function ProgressSub({
  count,
  fill,
}: {
  count?: { done: number; total: number };
  fill: string;
}) {
  if (!count) {
    return null;
  }
  const pct =
    count.total > 0 ? Math.round((count.done / count.total) * 100) : 0;
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-[3px] w-[52px] rounded-full bg-muted">
        <span
          className={cn("block h-[3px] rounded-full", fill)}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="text-[11.5px] text-muted-foreground tabular-nums">
        {count.done}/{count.total}
      </span>
    </span>
  );
}

// Step 4 — deliberately not a segment: it must read as an action (or its
// blocker), never as navigation.
function FinalizeStep({
  step,
  finalize,
}: {
  step: SeedingStep;
  finalize: FinalizeStepProps;
}) {
  if (finalize.finalized) {
    return (
      <span className="flex items-center gap-2 rounded-[10px] border border-brand-orange/40 bg-brand-orange/5 px-3 py-2 font-semibold text-[13px]">
        <Tick size="s" />
        Finalisiert — endgültig
      </span>
    );
  }
  if (finalize.ready && !finalize.readOnly) {
    return (
      <span
        className="flex items-center gap-2.5 px-2"
        title={finalize.gateHint}
      >
        <Circle state={step.state} number={STEP_NUMBER.finalize} />
        <Button type="button" onClick={finalize.onOpen}>
          Finalisieren…
        </Button>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2.5 px-2" title={finalize.gateHint}>
      <Circle state={step.state} number={STEP_NUMBER.finalize} />
      <span className="flex flex-col items-start gap-[3px]">
        <StepLabel step={step} />
        <span className="whitespace-nowrap text-[11.5px] text-muted-foreground">
          {finalize.ready && finalize.readOnly
            ? "Übernimm die Steuerung, um zu finalisieren"
            : (finalize.gateShort ?? "")}
        </span>
      </span>
    </span>
  );
}
