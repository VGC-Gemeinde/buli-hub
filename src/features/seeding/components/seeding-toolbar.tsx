"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { SheetFilter } from "../sheet";
import { FinalizeDialog } from "./finalize-dialog";

function Meter({
  label,
  value,
  total,
  fill,
}: {
  label: string;
  value: number;
  total: number;
  fill: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="w-[130px]">
      <div className="flex items-baseline justify-between font-semibold text-[11.5px] text-muted-foreground uppercase tracking-[0.06em]">
        <span>{label}</span>
        <span className="text-foreground">
          {value}/{total}
        </span>
      </div>
      <div className="mt-1 h-[5px] rounded-full bg-muted">
        <div
          className={cn("h-[5px] rounded-full", fill)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const STATUS_PILLS: { value: SheetFilter["status"]; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "returning", label: "Rückkehrer" },
  { value: "new", label: "Neu" },
];

export function SeedingToolbar({
  finalized,
  readOnly,
  divisionCount,
  size,
  configError,
  onConfigChange,
  placed,
  grouped,
  total,
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
  divisionCount: string;
  size: string;
  configError: string | null;
  onConfigChange: (divisionCount: string, size: string) => void;
  placed: number;
  grouped: number;
  total: number;
  ready: boolean;
  gateHint: string;
  onFinalize: () => Promise<{ ok: boolean; error?: string }>;
  onGenerateAll: () => void;
  generatingAll: boolean;
  filter: SheetFilter;
  onFilterChange: (filter: SheetFilter) => void;
}) {
  const spieltage = Number(size) > 1 ? Number(size) - 1 : 0;

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
          <div className="h-[11px] w-[22px] -skew-x-[18deg] bg-brand-orange" />
          <h1 className="whitespace-nowrap text-[28px] text-brand-blue leading-none dark:text-white">
            Divisionen einteilen
          </h1>
          <span className="pt-0.5 font-semibold text-muted-foreground text-xs uppercase tracking-[0.12em]">
            Saison 1
          </span>
        </div>
        <div className="flex-1" />
        <Meter
          label="Platziert"
          value={placed}
          total={total}
          fill="bg-brand-orange"
        />
        <Meter
          label="In Gruppen"
          value={grouped}
          total={total}
          fill="bg-brand-blue dark:bg-white/80"
        />
        {finalized ? (
          <div className="flex items-center gap-2 rounded-lg border border-brand-orange/40 bg-brand-orange/5 px-3 py-1.5 font-semibold text-[13.5px]">
            <div className="h-2 w-4 -skew-x-[18deg] bg-brand-orange" />
            Finalisiert — endgültig
          </div>
        ) : readOnly ? null : (
          <FinalizeDialog
            ready={ready}
            gateHint={gateHint}
            onConfirm={onFinalize}
          />
        )}
      </div>

      {finalized ? (
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
