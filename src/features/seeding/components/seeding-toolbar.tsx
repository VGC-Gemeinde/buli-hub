"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Tick } from "@/components/tick";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ControlState } from "../control";
import type { SheetFilter } from "../sheet";
import type { RulesEditorStatus, SeedingStep } from "../steps";
import { ControlPill } from "./control-bar";
import { FinalizeDialog } from "./finalize-dialog";
import { type SeedingView, StepBar } from "./step-bar";

const STATUS_PILLS: { value: SheetFilter["status"]; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "returning", label: "Rückkehrer" },
  { value: "new", label: "Neu" },
];

// Fixed three-row header stack: title row (breadcrumb · title · control
// pill) → step bar → contextual row (sheet config / the rules panel's strip /
// the finalized notice). Every row has one job.
export function SeedingToolbar({
  finalized,
  finalizedNotice,
  readOnly,
  season,
  divisionCount,
  size,
  configError,
  onConfigChange,
  steps,
  view,
  onViewChange,
  rulesStatus,
  ready,
  gateHint,
  gateShort,
  onFinalize,
  onGenerateAll,
  generatingAll,
  filter,
  onFilterChange,
  controlState,
  controlHolderName,
  controlPending,
  onAcquireControl,
  onReleaseControl,
}: {
  finalized: boolean;
  finalizedNotice: string | null;
  // Observer mode: someone else drives. Editing controls are disabled, but
  // search + filter stay usable so observers can look around.
  readOnly: boolean;
  season: string;
  divisionCount: string;
  size: string;
  configError: string | null;
  onConfigChange: (divisionCount: string, size: string) => void;
  steps: SeedingStep[];
  view: SeedingView;
  onViewChange: (view: SeedingView) => void;
  rulesStatus: RulesEditorStatus;
  ready: boolean;
  gateHint: string;
  gateShort: string | null;
  onFinalize: () => Promise<{ ok: boolean; error?: string }>;
  onGenerateAll: () => void;
  generatingAll: boolean;
  filter: SheetFilter;
  onFilterChange: (filter: SheetFilter) => void;
  controlState: ControlState;
  controlHolderName: string | null;
  controlPending: boolean;
  onAcquireControl: (force: boolean) => void;
  onReleaseControl: () => void;
}) {
  const spieltage = Number(size) > 1 ? Number(size) - 1 : 0;
  // The finalize dialog has no trigger of its own — the step bar's gated
  // button opens it.
  const [finalizeOpen, setFinalizeOpen] = useState(false);

  return (
    <div className="shrink-0">
      {/* Title row */}
      <div className="flex items-center gap-4 px-7 pt-3.5 pb-2.5">
        <Link
          href="/staff"
          className="flex items-center gap-1 font-medium text-[13px] text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft aria-hidden className="size-[13px]" />
          Staff-Bereich
        </Link>
        <div className="h-[18px] w-px bg-border" />
        <div className="flex min-w-0 items-center gap-3">
          <Tick size="l" />
          <h1 className="whitespace-nowrap text-[28px] text-brand-blue leading-none dark:text-white">
            Divisionen einteilen
          </h1>
          <span className="pt-0.5 font-semibold text-muted-foreground text-xs uppercase tracking-[0.12em]">
            {season}
          </span>
        </div>
        <div className="flex-1" />
        {finalized ? null : (
          <ControlPill
            state={controlState}
            holderName={controlHolderName}
            pending={controlPending}
            onAcquire={onAcquireControl}
            onRelease={onReleaseControl}
          />
        )}
      </div>

      {/* Step bar row */}
      <StepBar
        steps={steps}
        view={view}
        onViewChange={onViewChange}
        rulesStatus={rulesStatus}
        finalize={{
          finalized,
          ready,
          readOnly,
          gateShort,
          gateHint,
          onOpen: () => setFinalizeOpen(true),
        }}
      />
      {finalized || readOnly ? null : (
        <FinalizeDialog
          season={season}
          onConfirm={onFinalize}
          open={finalizeOpen}
          onOpenChange={setFinalizeOpen}
        />
      )}

      {/* Contextual row: sheet config here, the rules view brings its own
          action strip, a finalized seeding shows the notice in the slot. */}
      {finalized ? (
        <div className="border-brand-orange/40 border-b bg-brand-orange/5 px-7 py-2 text-[13.5px]">
          {finalizedNotice
            ? `Die Einteilung wurde am ${finalizedNotice} finalisiert und ist endgültig.`
            : "Die Einteilung ist finalisiert und endgültig."}
        </div>
      ) : view === "rules" ? null : (
        <div className="flex items-center gap-5 border-b px-7 pb-3">
          <div className="flex items-center gap-2">
            <Label className="text-[13px] text-muted-foreground">
              Divisionen
            </Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={divisionCount}
              disabled={readOnly}
              onChange={(e) => onConfigChange(e.target.value, size)}
              className={cn("h-7 w-14", readOnly && "opacity-55")}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-[13px] text-muted-foreground">
              Gruppengröße
            </Label>
            <Input
              type="number"
              min={2}
              max={24}
              value={size}
              disabled={readOnly}
              onChange={(e) => onConfigChange(divisionCount, e.target.value)}
              className={cn("h-7 w-14", readOnly && "opacity-55")}
            />
            <span className="text-[12.5px] text-muted-foreground">
              → {spieltage} Spieltage
            </span>
          </div>
          {configError ? (
            <span className="text-[12.5px] text-destructive">
              {configError}
            </span>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            disabled={generatingAll || readOnly}
            onClick={onGenerateAll}
            className={cn(readOnly && "opacity-55")}
          >
            {generatingAll ? "Wird generiert…" : "Alle Gruppen generieren"}
          </Button>
          <div className="flex-1" />
          <Input
            placeholder="Spieler suchen…"
            value={filter.query}
            onChange={(e) =>
              onFilterChange({ ...filter, query: e.target.value })
            }
            className="h-7 w-[220px]"
          />
          <div className="flex items-center gap-1.5">
            {STATUS_PILLS.map((pill) => (
              <button
                key={pill.value}
                type="button"
                onClick={() =>
                  onFilterChange({ ...filter, status: pill.value })
                }
                className={cn(
                  "h-[26px] rounded-full px-2.5 font-medium text-[12.5px]",
                  filter.status === pill.value
                    ? "bg-brand-blue text-white dark:bg-white dark:text-brand-blue"
                    : "border text-muted-foreground",
                )}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
