"use client";

import { Fragment, type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  type DivisionForValidation,
  divisionModeAvailable,
  effectiveMovement,
  type PostSeasonIssue,
  type RelevantTable,
  validatePostSeason,
} from "../post-season";
import type { DivisionWithGroupSizes } from "../queries";
import { divisionName } from "../seeding";

export type PostSeasonSaveResult =
  | { ok: true; issues: PostSeasonIssue[] }
  | { ok: false; error: string };

// The per-division config the dialog submits to `savePostSeason`.
export type PostSeasonConfigInput = {
  divisionId: string;
  relevantTable: RelevantTable;
  guaranteedPromotions: number;
  guaranteedDemotions: number;
  promotionPlayoffSlots: number;
  demotionPlayoffSlots: number;
};

type Row = {
  divisionId: string;
  tier: number;
  groupSizes: number[];
  relevantTable: RelevantTable;
  guaranteedPromotions: number;
  guaranteedDemotions: number;
  promotionPlayoffSlots: number;
  demotionPlayoffSlots: number;
};

function toRows(divisions: DivisionWithGroupSizes[]): Row[] {
  return [...divisions]
    .sort((a, b) => a.tier - b.tier)
    .map((d) => ({
      divisionId: d.id,
      tier: d.tier,
      groupSizes: d.groupSizes,
      relevantTable: d.relevantTable,
      guaranteedPromotions: d.guaranteedPromotions,
      guaranteedDemotions: d.guaranteedDemotions,
      promotionPlayoffSlots: d.promotionPlayoffSlots,
      demotionPlayoffSlots: d.demotionPlayoffSlots,
    }));
}

function forValidation(row: Row): DivisionForValidation {
  return {
    tier: row.tier,
    groupSizes: row.groupSizes,
    relevantTable: row.relevantTable,
    guaranteedPromotions: row.guaranteedPromotions,
    guaranteedDemotions: row.guaranteedDemotions,
    promotionPlayoffSlots: row.promotionPlayoffSlots,
    demotionPlayoffSlots: row.demotionPlayoffSlots,
  };
}

function messageForIssue(issue: PostSeasonIssue): string {
  switch (issue.kind) {
    case "balance":
      return `Division ${issue.upperTier} & ${issue.lowerTier}: Abstiege und Aufstiege stimmen nicht überein.`;
    case "capacity":
      return `Division ${issue.tier}: mehr Auf-/Abstiegsplätze als die Gruppengröße erlaubt.`;
    case "boundary":
      return `Division ${issue.tier}: an dieser Grenze ist kein Auf- bzw. Abstieg möglich.`;
    case "division_mode_invalid":
      return `Division ${issue.tier}: die Gesamttabelle braucht mindestens zwei gleich große Gruppen.`;
    case "missing_promotion_path":
      return `Division ${issue.tier}: kein Aufstiegsweg — mindestens ein Platz oder Playoff-Slot nötig.`;
    case "missing_demotion_path":
      return `Division ${issue.tier}: kein Abstiegsweg — mindestens ein Platz oder Playoff-Slot nötig.`;
  }
}

// Per-division promotion/demotion rules. Counts are per group in sub-division
// mode, per division in Gesamttabelle mode. Live-validates as staff type; saving
// persists and (when valid) marks the step done so the seeding can be finalized.
export function PostSeasonDialog({
  divisions,
  readOnly,
  configured,
  onSave,
}: {
  divisions: DivisionWithGroupSizes[];
  readOnly: boolean;
  configured: boolean;
  onSave: (configs: PostSeasonConfigInput[]) => Promise<PostSeasonSaveResult>;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>(() => toRows(divisions));
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Re-seed from the server whenever the dialog opens, so it never shows stale
  // edits after a refresh.
  useEffect(() => {
    if (open) {
      setRows(toRows(divisions));
      setSaveError(null);
    }
  }, [open, divisions]);

  const issues = validatePostSeason(rows.map(forValidation));
  const valid = issues.length === 0;
  const noGroups = rows.some((r) => r.groupSizes.length === 0);

  function patch(divisionId: string, next: Partial<Row>) {
    setRows((prev) =>
      prev.map((r) => (r.divisionId === divisionId ? { ...r, ...next } : r)),
    );
  }

  async function submit() {
    setPending(true);
    setSaveError(null);
    const result = await onSave(
      rows.map((r) => ({
        divisionId: r.divisionId,
        relevantTable: r.relevantTable,
        guaranteedPromotions: r.guaranteedPromotions,
        guaranteedDemotions: r.guaranteedDemotions,
        promotionPlayoffSlots: r.promotionPlayoffSlots,
        demotionPlayoffSlots: r.demotionPlayoffSlots,
      })),
    );
    setPending(false);
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    // Server agrees it's valid → the step is done, close and let the parent
    // refresh. Otherwise keep the dialog open so staff can fix what's flagged.
    if (result.issues.length === 0) {
      setOpen(false);
    }
  }

  const topTier = rows[0]?.tier;
  const lowestTier = rows[rows.length - 1]?.tier;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div title="Auf- und Abstiegsregeln festlegen">
          <Button type="button" variant="outline">
            <span
              className={cn(
                "mr-2 inline-block size-2 rounded-full",
                configured ? "bg-brand-orange" : "bg-muted-foreground/40",
              )}
            />
            Auf- & Abstieg
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent
        className="grid max-h-[88vh] grid-rows-[auto_minmax(0,1fr)_auto]"
        style={{ width: "min(1180px, 94vw)", maxWidth: "min(1180px, 94vw)" }}
      >
        <DialogHeader className="gap-1.5 pr-8">
          <DialogTitle className="text-brand-blue text-xl uppercase tracking-[0.02em] dark:text-white">
            Auf- und Abstieg festlegen
          </DialogTitle>
          <DialogDescription>
            Pro Division: garantierte Auf-/Abstiege und Playoff-Plätze. Zahlen
            gelten pro Gruppe — außer bei aktivierter Gesamttabelle, dann pro
            Division.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-col gap-3">
          {noGroups ? (
            <p className="shrink-0 rounded-lg border border-brand-orange/40 bg-brand-orange/5 px-4 py-2.5 text-sm">
              Bitte zuerst die Gruppen generieren — ohne Gruppen lassen sich
              keine gültigen Regeln festlegen.
            </p>
          ) : null}

          {/* No column gap: cells butt together so each row's top border is one
              continuous, aligned line. Vertical padding is uniform across cells. */}
          <div className="min-h-0 flex-1 overflow-auto rounded-lg border">
            <div className="grid min-w-[900px] grid-cols-[minmax(200px,1.3fr)_5rem_5rem_5rem_5rem_minmax(90px,auto)_minmax(220px,auto)]">
              <HeaderCell className="pr-3 pl-4">Division</HeaderCell>
              <HeaderCell center>Aufstieg</HeaderCell>
              <HeaderCell center>Auf-Playoff</HeaderCell>
              <HeaderCell center>Ab-Playoff</HeaderCell>
              <HeaderCell center>Abstieg</HeaderCell>
              <HeaderCell className="px-3">Bilanz</HeaderCell>
              <HeaderCell className="pr-4 pl-3">Tabelle</HeaderCell>
              {rows.map((row) => {
                const isTop = row.tier === topTier;
                const isLowest = row.tier === lowestTier;
                const totals = effectiveMovement(forValidation(row));
                return (
                  <Fragment key={row.divisionId}>
                    <div className="flex flex-col justify-center border-t py-2.5 pr-3 pl-4">
                      <div className="font-semibold text-sm">
                        {divisionName(row.tier)}
                      </div>
                      <div className="text-[12px] text-muted-foreground">
                        {row.groupSizes.length} Gruppen ·{" "}
                        {row.groupSizes.join("/") || "—"}
                      </div>
                    </div>
                    <NumberCell
                      value={row.guaranteedPromotions}
                      disabled={readOnly || isTop}
                      onChange={(guaranteedPromotions) =>
                        patch(row.divisionId, { guaranteedPromotions })
                      }
                    />
                    <NumberCell
                      value={row.promotionPlayoffSlots}
                      disabled={readOnly || isTop}
                      onChange={(promotionPlayoffSlots) =>
                        patch(row.divisionId, { promotionPlayoffSlots })
                      }
                    />
                    <NumberCell
                      value={row.demotionPlayoffSlots}
                      disabled={readOnly || isLowest}
                      onChange={(demotionPlayoffSlots) =>
                        patch(row.divisionId, { demotionPlayoffSlots })
                      }
                    />
                    <NumberCell
                      value={row.guaranteedDemotions}
                      disabled={readOnly || isLowest}
                      onChange={(guaranteedDemotions) =>
                        patch(row.divisionId, { guaranteedDemotions })
                      }
                    />
                    <div className="flex items-center border-t px-3 py-2.5 text-[12.5px] text-muted-foreground tabular-nums">
                      ↑ {totals.promotions} · ↓ {totals.demotions}
                    </div>
                    <div className="flex items-center border-t py-2.5 pr-4 pl-3">
                      <TableToggle
                        value={row.relevantTable}
                        globalAvailable={divisionModeAvailable(row.groupSizes)}
                        disabled={readOnly}
                        onChange={(relevantTable) =>
                          patch(row.divisionId, { relevantTable })
                        }
                      />
                    </div>
                  </Fragment>
                );
              })}
            </div>
          </div>

          <ValidationBox
            issues={issues}
            saveError={saveError}
            suppressed={noGroups}
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Schließen
            </Button>
          </DialogClose>
          {readOnly ? null : (
            <Button type="button" disabled={pending || !valid} onClick={submit}>
              {pending ? "Wird gespeichert…" : "Speichern"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// A column header for the divisions grid.
function HeaderCell({
  children,
  center,
  className,
}: {
  children: ReactNode;
  center?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pt-3.5 pb-2 font-semibold text-[10.5px] text-muted-foreground uppercase leading-tight tracking-[0.06em]",
        center && "text-center",
        className,
      )}
    >
      {children}
    </div>
  );
}

// A single number input sitting in a grid column (label lives in the header).
function NumberCell({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-center border-t px-3 py-2.5">
      <Input
        type="number"
        min={0}
        max={99}
        value={String(value)}
        disabled={disabled}
        onChange={(e) =>
          onChange(Math.max(0, Math.floor(Number(e.target.value) || 0)))
        }
        className="h-7 w-14 text-center disabled:opacity-40"
      />
    </div>
  );
}

// Bounded, scrollable validation panel so a long list of problems never pushes
// the footer off-screen. While groups are missing (`suppressed`) the rules can't
// be evaluated meaningfully, so we stay quiet — the „generate groups first"
// notice above already says what to do — and show nothing but a save error.
function ValidationBox({
  issues,
  saveError,
  suppressed,
}: {
  issues: PostSeasonIssue[];
  saveError: string | null;
  suppressed?: boolean;
}) {
  if (suppressed && !saveError) {
    return null;
  }
  if (suppressed) {
    return (
      <p className="shrink-0 font-semibold text-destructive text-sm">
        {saveError}
      </p>
    );
  }
  if (issues.length === 0 && !saveError) {
    return (
      <p className="shrink-0 text-[13px] text-muted-foreground">
        Gültig — die Einteilung kann anschließend finalisiert werden.
      </p>
    );
  }
  return (
    <div className="max-h-[132px] shrink-0 overflow-auto rounded-lg border border-destructive/35 bg-destructive/5 px-4 py-2.5">
      {saveError ? (
        <p className="mb-1 font-semibold text-destructive text-sm">
          {saveError}
        </p>
      ) : null}
      <ul className="flex flex-col gap-1">
        {issues.map((issue) => (
          <li
            key={`${issue.kind}-${"tier" in issue ? issue.tier : `${issue.upperTier}-${issue.lowerTier}`}`}
            className="text-destructive text-[13px]"
          >
            {messageForIssue(issue)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TableToggle({
  value,
  globalAvailable,
  disabled,
  onChange,
}: {
  value: RelevantTable;
  globalAvailable: boolean;
  disabled: boolean;
  onChange: (value: RelevantTable) => void;
}) {
  const seg = (table: RelevantTable, label: string, off: boolean) => (
    <button
      type="button"
      disabled={disabled || off}
      title={
        off
          ? "Nur bei mindestens zwei gleich großen Gruppen verfügbar"
          : undefined
      }
      onClick={() => onChange(table)}
      className={cn(
        "h-[26px] rounded-full px-3 font-medium text-[12.5px]",
        value === table
          ? "bg-brand-blue text-white dark:bg-white dark:text-brand-blue"
          : "border text-muted-foreground",
        off && "cursor-not-allowed opacity-40",
      )}
    >
      {label}
    </button>
  );
  return (
    <div className="flex items-center gap-1.5">
      {seg("sub_division", "Gruppentabelle", false)}
      {seg("division", "Gesamttabelle", !globalAvailable)}
    </div>
  );
}
