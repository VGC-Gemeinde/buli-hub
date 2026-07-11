"use client";

import Link from "next/link";
import { useState } from "react";
import { Tick } from "@/components/tick";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { SheetFilter } from "../sheet";
import type { SeedingStep } from "../steps";
import { FinalizeDialog } from "./finalize-dialog";
import { type SeedingView, StepBar } from "./step-bar";

const STATUS_PILLS: { value: SheetFilter["status"]; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "returning", label: "Rückkehrer" },
  { value: "new", label: "Neu" },
];

export function SeedingToolbar({
  finalized,
  readOnly,
  season,
  divisionCount,
  size,
  configError,
  onConfigChange,
  steps,
  view,
  onViewChange,
  ready,
  gateHint,
  onFinalize,
  onGenerateAll,
  generatingAll,
  filter,
  onFilterChange,
}: {
  finalized: boolean;
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
  ready: boolean;
  gateHint: string;
  onFinalize: () => Promise<{ ok: boolean; error?: string }>;
  onGenerateAll: () => void;
  generatingAll: boolean;
  filter: SheetFilter;
  onFilterChange: (filter: SheetFilter) => void;
}) {
  const spieltage = Number(size) > 1 ? Number(size) - 1 : 0;
  // The finalize dialog has no trigger of its own — the step bar's gated
  // button opens it.
  const [finalizeOpen, setFinalizeOpen] = useState(false);

  return (
    <div className="shrink-0">
      <Link
        href="/staff"
        className="inline-block px-7 pt-3 text-muted-foreground text-sm hover:text-foreground"
      >
        ← Zurück zum Staff-Bereich
      </Link>
      <div className="flex items-center gap-7 px-7 pt-2 pb-3">
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
        <StepBar
          steps={steps}
          view={view}
          onViewChange={onViewChange}
          finalize={
            finalized || readOnly
              ? undefined
              : {
                  enabled: ready,
                  hint: gateHint,
                  onClick: () => setFinalizeOpen(true),
                }
          }
        />
        {finalized || readOnly ? null : (
          <FinalizeDialog
            season={season}
            onConfirm={onFinalize}
            open={finalizeOpen}
            onOpenChange={setFinalizeOpen}
          />
        )}
      </div>

      {/* The config/search row belongs to the sheet; the rules view brings
          its own action strip instead. */}
      {finalized || view === "rules" ? (
        <div className="border-b" />
      ) : (
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
              className="h-7 w-14"
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
              className="h-7 w-14"
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
