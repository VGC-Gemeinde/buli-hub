"use client";

import { Fragment, useEffect, useState } from "react";
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
import { cn } from "@/lib/utils";
import {
  type DivisionForValidation,
  divisionModeAvailable,
  effectiveMovement,
  type PostSeasonIssue,
  type RelevantTable,
  validatePostSeason,
  type Zone,
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

// A preview place can also be "overbooked" — claimed by both a promotion and a
// demotion band because the counts exceed capacity (the capacity error, shown).
type PreviewCell = Zone | "overbooked";

const ZONE_NAME: Record<Zone, string> = {
  promote: "Direkter Aufstieg",
  promotion_playoff: "Aufstiegs-Playoff",
  demotion_playoff: "Abstiegs-Playoff",
  demote: "Direkter Abstieg",
  none: "Klassenerhalt",
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

function toInput(row: Row): PostSeasonConfigInput {
  return {
    divisionId: row.divisionId,
    relevantTable: row.relevantTable,
    guaranteedPromotions: row.guaranteedPromotions,
    guaranteedDemotions: row.guaranteedDemotions,
    promotionPlayoffSlots: row.promotionPlayoffSlots,
    demotionPlayoffSlots: row.demotionPlayoffSlots,
  };
}

// Stable string of the editable config, to detect unsaved changes.
function fingerprint(rows: Row[]): string {
  return JSON.stringify(rows.map(toInput));
}

// The zone capacity of a division's relevant table: whole division in Gesamt
// mode, smallest group in Gruppen mode (the per-group counts apply to every one).
function capacityOf(row: Row): number {
  if (row.relevantTable === "division") {
    return row.groupSizes.reduce((sum, s) => sum + s, 0);
  }
  return row.groupSizes.length === 0 ? 0 : Math.min(...row.groupSizes);
}

// Per-place zone for the preview strip, marking over-capacity overlap.
function previewZones(row: Row, capacity: number): PreviewCell[] {
  const promoEnd = row.guaranteedPromotions + row.promotionPlayoffSlots;
  const demoteStart = capacity - row.guaranteedDemotions;
  const demoPlayoffStart = demoteStart - row.demotionPlayoffSlots;
  return Array.from({ length: capacity }, (_, i): PreviewCell => {
    const inPromote = i < row.guaranteedPromotions;
    const inPromoPlayoff = !inPromote && i < promoEnd;
    const inDemote = i >= demoteStart;
    const inDemoPlayoff = !inDemote && i >= demoPlayoffStart;
    if ((inPromote || inPromoPlayoff) && (inDemote || inDemoPlayoff)) {
      return "overbooked";
    }
    if (inPromote) return "promote";
    if (inPromoPlayoff) return "promotion_playoff";
    if (inDemote) return "demote";
    if (inDemoPlayoff) return "demotion_playoff";
    return "none";
  });
}

function metaText(row: Row): string {
  const n = row.groupSizes.length;
  if (n === 0) return "noch keine Gruppen";
  const equal = row.groupSizes.every((s) => s === row.groupSizes[0]);
  return equal
    ? `${n} Gruppen · je ${row.groupSizes[0]} Spieler`
    : `${n} Gruppen · ${row.groupSizes.join(" / ")} Spieler`;
}

// The balance issue spelled out with both numbers; other issues use their text.
function describeIssue(issue: PostSeasonIssue, rows: Row[]): string {
  if (issue.kind === "balance") {
    const upper = rows.find((r) => r.tier === issue.upperTier);
    const lower = rows.find((r) => r.tier === issue.lowerTier);
    const d = upper ? effectiveMovement(forValidation(upper)).demotions : 0;
    const p = lower ? effectiveMovement(forValidation(lower)).promotions : 0;
    return `Division ${issue.upperTier} & ${issue.lowerTier}: ${d} Abstiege stehen ${p} Aufstiegen gegenüber — die Zahlen müssen sich decken.`;
  }
  switch (issue.kind) {
    case "capacity":
      return `Division ${issue.tier}: mehr Auf-/Abstiegsplätze als die Tabelle Plätze hat.`;
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

// Per-division promotion/demotion rules as a ladder of division cards with a
// balance seam between neighbours. Counts are per group in Gruppen mode, per
// division in Gesamttabelle mode. Live-validates; saving persists and (when
// valid) marks the step done so the seeding can be finalized.
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
  const [savedRows, setSavedRows] = useState<Row[]>(() => toRows(divisions));
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Re-seed from the server whenever the dialog opens, so it never shows stale
  // edits after a refresh.
  useEffect(() => {
    if (open) {
      const fresh = toRows(divisions);
      setRows(fresh);
      setSavedRows(fresh);
      setSaveError(null);
    }
  }, [open, divisions]);

  const issues = validatePostSeason(rows.map(forValidation));
  const valid = issues.length === 0;
  const noGroups = rows.some((r) => r.groupSizes.length === 0);
  const dirty = fingerprint(rows) !== fingerprint(savedRows);

  function patch(divisionId: string, next: Partial<Row>) {
    setRows((prev) =>
      prev.map((r) => (r.divisionId === divisionId ? { ...r, ...next } : r)),
    );
  }

  async function submit() {
    setPending(true);
    setSaveError(null);
    const result = await onSave(rows.map(toInput));
    setPending(false);
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    // Keep the dialog open in a „saved" state; staff close it themselves.
    setSavedRows(rows);
  }

  const showSaved = !dirty && valid && !saveError;

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
        style={{ width: "min(1060px, 94vw)", maxWidth: "min(1060px, 94vw)" }}
      >
        <DialogHeader className="gap-1.5 pr-8">
          <DialogTitle className="text-brand-blue text-xl uppercase tracking-[0.02em] dark:text-white">
            Auf- und Abstieg festlegen
          </DialogTitle>
          <DialogDescription>
            Lege pro Division fest, wie viele Spieler fest auf- und absteigen,
            wie viele Playoff-Plätze es gibt und über welche Tabelle entschieden
            wird. Abstiege und Aufstiege benachbarter Divisionen müssen sich
            decken — erst dann kann die Einteilung finalisiert werden.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-col gap-2 overflow-auto rounded-lg bg-muted/40 p-3">
          {noGroups ? (
            <p className="rounded-lg border border-brand-orange/40 bg-brand-orange/5 px-4 py-2.5 text-sm">
              Bitte zuerst die Gruppen generieren — ohne Gruppen lassen sich
              keine gültigen Regeln festlegen.
            </p>
          ) : null}

          {rows.map((row, i) => (
            <Fragment key={row.divisionId}>
              <DivisionCard
                row={row}
                isTop={i === 0}
                isLowest={i === rows.length - 1}
                readOnly={readOnly}
                onPatch={(next) => patch(row.divisionId, next)}
              />
              {i < rows.length - 1 ? (
                <SeamRow upper={row} lower={rows[i + 1]} />
              ) : null}
            </Fragment>
          ))}
        </div>

        <DialogFooter className="sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            {noGroups ? null : valid ? (
              <p className="flex items-center gap-2 text-sm">
                <span className="flex size-[18px] items-center justify-center rounded-full bg-zone-promote text-[11px] text-white">
                  ✓
                </span>
                Regeln gültig — nach dem Speichern kann die Einteilung
                finalisiert werden.
              </p>
            ) : (
              <ul className="max-h-16 overflow-auto">
                {issues.map((issue) => (
                  <li
                    key={`${issue.kind}-${"tier" in issue ? issue.tier : `${issue.upperTier}-${issue.lowerTier}`}`}
                    className="text-[13px] text-destructive"
                  >
                    {describeIssue(issue, rows)}
                  </li>
                ))}
              </ul>
            )}
            {saveError ? (
              <p className="text-[13px] text-destructive">{saveError}</p>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            {valid && dirty ? (
              <span className="text-[12.5px] text-muted-foreground">
                Ungespeicherte Änderungen
              </span>
            ) : null}
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Schließen
              </Button>
            </DialogClose>
            {readOnly ? null : showSaved ? (
              <Button
                type="button"
                variant="outline"
                disabled
                className="border-zone-promote/40 text-zone-promote"
              >
                Gespeichert ✓
              </Button>
            ) : (
              <Button
                type="button"
                disabled={pending || !valid}
                onClick={submit}
              >
                {pending ? "Wird gespeichert…" : "Speichern"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DivisionCard({
  row,
  isTop,
  isLowest,
  readOnly,
  onPatch,
}: {
  row: Row;
  isTop: boolean;
  isLowest: boolean;
  readOnly: boolean;
  onPatch: (next: Partial<Row>) => void;
}) {
  const groups = row.groupSizes.length;
  const perDivision = row.relevantTable === "division";
  const capacity = capacityOf(row);
  const preview = previewZones(row, capacity);
  const span =
    row.guaranteedPromotions +
    row.promotionPlayoffSlots +
    row.demotionPlayoffSlots +
    row.guaranteedDemotions;
  const leftover = capacity - span;

  // The effective-total note under a stepper (or the boundary reason).
  const note = (value: number, disabledReason: string | null) => {
    if (disabledReason) return disabledReason;
    if (perDivision) return "gilt für die ganze Division";
    return `× ${groups} Gruppen = ${value * groups} gesamt`;
  };

  return (
    <div className="rounded-xl border bg-card shadow-2xs">
      <div className="flex items-center gap-3 px-5 py-3">
        <div className="h-2.5 w-5 -skew-x-[18deg] bg-brand-blue dark:bg-white" />
        <span className="font-heading text-brand-blue text-xl uppercase tracking-[0.04em] dark:text-white">
          {divisionName(row.tier)}
        </span>
        <span className="text-[12.5px] text-muted-foreground">
          {metaText(row)}
        </span>
        <div className="flex-1" />
        <span className="font-semibold text-[11px] text-muted-foreground uppercase tracking-[0.06em]">
          Maßgebliche Tabelle
        </span>
        <TableToggle
          value={row.relevantTable}
          globalAvailable={divisionModeAvailable(row.groupSizes)}
          disabled={readOnly}
          onChange={(relevantTable) => onPatch({ relevantTable })}
        />
      </div>

      <div className="flex flex-col gap-3 border-t px-5 py-4">
        <div className="font-semibold text-[11.5px] text-muted-foreground uppercase tracking-[0.06em]">
          Zonen-Vorschau ·{" "}
          {perDivision
            ? `ganze Division (${capacity} Plätze)`
            : `pro Gruppe (${capacity} Plätze)`}
        </div>

        <ZonePreview preview={preview} />

        <div className="flex items-start gap-4">
          <Cluster
            zoneClass="bg-zone-promote"
            label="Direkter Aufstieg"
            value={row.guaranteedPromotions}
            disabled={readOnly || isTop}
            note={note(
              row.guaranteedPromotions,
              isTop ? "Oberste Division — kein Aufstieg" : null,
            )}
            onChange={(guaranteedPromotions) =>
              onPatch({ guaranteedPromotions })
            }
          />
          <Cluster
            zoneClass="bg-zone-playoff"
            label="Aufstiegs-Playoff"
            value={row.promotionPlayoffSlots}
            disabled={readOnly || isTop}
            note={note(
              row.promotionPlayoffSlots,
              isTop ? "Oberste Division — kein Aufstieg" : null,
            )}
            onChange={(promotionPlayoffSlots) =>
              onPatch({ promotionPlayoffSlots })
            }
          />
          <div className="flex flex-1 items-center justify-center px-2 pt-6 text-center">
            {leftover >= 0 ? (
              <span className="text-[12px] text-muted-foreground">
                {leftover} Plätze Klassenerhalt
              </span>
            ) : (
              <span className="font-bold text-[12px] text-zone-demote">
                Überbelegt um {-leftover} — Zahlen verringern
              </span>
            )}
          </div>
          <Cluster
            zoneClass="bg-zone-playoff"
            label="Abstiegs-Playoff"
            value={row.demotionPlayoffSlots}
            disabled={readOnly || isLowest}
            note={note(
              row.demotionPlayoffSlots,
              isLowest ? "Unterste Division — kein Abstieg" : null,
            )}
            onChange={(demotionPlayoffSlots) =>
              onPatch({ demotionPlayoffSlots })
            }
          />
          <Cluster
            zoneClass="bg-zone-demote"
            label="Direkter Abstieg"
            value={row.guaranteedDemotions}
            disabled={readOnly || isLowest}
            note={note(
              row.guaranteedDemotions,
              isLowest ? "Unterste Division — kein Abstieg" : null,
            )}
            onChange={(guaranteedDemotions) => onPatch({ guaranteedDemotions })}
          />
        </div>
      </div>
    </div>
  );
}

const SQUARE_FILL: Record<PreviewCell, string> = {
  promote: "border-transparent bg-zone-promote text-white",
  promotion_playoff: "border-transparent bg-zone-playoff text-brand-blue",
  demotion_playoff: "border-transparent bg-zone-playoff text-brand-blue",
  demote: "border-transparent bg-zone-demote text-white",
  none: "bg-muted text-muted-foreground",
  overbooked: "border-transparent text-white",
};

// The over-capacity stripe — the capacity error made visible.
const OVERBOOKED_STRIPES =
  "repeating-linear-gradient(45deg, var(--zone-demote) 0 4px, var(--zone-playoff) 4px 8px)";

function ZonePreview({ preview }: { preview: PreviewCell[] }) {
  if (preview.length === 0) return null;
  const width = preview.length <= 10 ? 34 : preview.length <= 16 ? 28 : 22;
  return (
    <div className="flex flex-wrap gap-1.5">
      {preview.map((cell, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-order place squares
          key={i}
          title={`Platz ${i + 1} — ${cell === "overbooked" ? "Überbelegt" : ZONE_NAME[cell]}`}
          style={
            cell === "overbooked"
              ? { width, backgroundImage: OVERBOOKED_STRIPES }
              : { width }
          }
          className={cn(
            "flex h-[30px] items-center justify-center rounded-[7px] border text-[11.5px] font-semibold tabular-nums",
            SQUARE_FILL[cell],
          )}
        >
          {i + 1}
        </div>
      ))}
    </div>
  );
}

function Cluster({
  zoneClass,
  label,
  value,
  disabled,
  note,
  onChange,
}: {
  zoneClass: string;
  label: string;
  value: number;
  disabled: boolean;
  note: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex w-[148px] flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className={cn("size-2.5 rounded-[3px]", zoneClass)} />
        <span className="font-semibold text-[11px] text-muted-foreground uppercase tracking-[0.06em]">
          {label}
        </span>
      </div>
      <Stepper value={value} disabled={disabled} onChange={onChange} />
      <span className="text-[11.5px] text-muted-foreground">{note}</span>
    </div>
  );
}

function Stepper({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border",
        disabled && "opacity-50",
      )}
    >
      <button
        type="button"
        disabled={disabled || value <= 0}
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex h-7 w-[30px] items-center justify-center text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
      >
        −
      </button>
      <span className="w-[38px] border-x py-1 text-center font-semibold text-sm tabular-nums">
        {value}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(value + 1)}
        className="flex h-7 w-[30px] items-center justify-center text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

function SeamRow({ upper, lower }: { upper: Row; lower: Row }) {
  const demotions = effectiveMovement(forValidation(upper)).demotions;
  const promotions = effectiveMovement(forValidation(lower)).promotions;
  const balanced = demotions === promotions;
  const diff = Math.abs(demotions - promotions);

  const breakdown = (row: Row, perGroupCount: number) =>
    row.relevantTable === "division"
      ? "Division gesamt"
      : `${perGroupCount} je Gruppe × ${row.groupSizes.length} Gruppen`;

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-8 py-2">
      <div className="text-right text-[12px] text-muted-foreground">
        <span className="mr-1.5 font-bold text-zone-demote">↓ {demotions}</span>
        steigen ab ({breakdown(upper, upper.guaranteedDemotions)})
      </div>
      <span
        className={cn(
          "rounded-full border px-3 py-1 font-bold text-[11.5px] uppercase tracking-[0.04em]",
          balanced
            ? "border-zone-promote/40 bg-zone-promote/5 text-zone-promote"
            : "border-zone-demote/40 bg-zone-demote/5 text-zone-demote",
        )}
      >
        {balanced ? "✓ Ausgeglichen" : `✕ Differenz ${diff}`}
      </span>
      <div className="text-[12px] text-muted-foreground">
        <span className="mr-1.5 font-bold text-zone-promote">
          ↑ {promotions}
        </span>
        steigen auf ({breakdown(lower, lower.guaranteedPromotions)})
      </div>
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
        "h-[26px] rounded-full px-3 font-semibold text-[12.5px]",
        value === table
          ? "bg-brand-blue text-white dark:bg-white dark:text-brand-blue"
          : "text-muted-foreground",
        off && "cursor-not-allowed opacity-40",
      )}
    >
      {label}
    </button>
  );
  return (
    <div className="flex items-center rounded-full border p-[3px]">
      {seg("sub_division", "Gruppentabelle", false)}
      {seg("division", "Gesamttabelle", !globalAvailable)}
    </div>
  );
}
