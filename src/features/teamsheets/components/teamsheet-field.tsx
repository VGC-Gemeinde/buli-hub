"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { validateTeamsheet } from "../actions";
import {
  cleared,
  shouldValidateLink,
  type TeamsheetValue,
  withAccepted,
  withError,
  withLink,
} from "../field-state";
import { ImportDialog } from "./import-dialog";

// One player's team sheet in the report form: a link field with an import
// escape hatch beside it, or — once a team was imported — a confirmation strip
// with a way back.
//
// The link field validates on blur rather than on submit. It costs one request
// and it is the difference between finding out now that VRPaste is down, while
// switching to another route is a five-second detour, and finding out after
// filling in the whole form.

function MonIcons({ value }: { value: TeamsheetValue }) {
  if (!value.accepted) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center gap-0.5">
      {value.accepted.icons.map((icon, index) => (
        // biome-ignore lint/performance/noImgElement: box icons are external bucket assets, not app images
        <img
          // Species can repeat; the slot identifies the icon.
          key={`${icon.species}-${index}`}
          src={icon.iconUrl}
          alt={icon.species}
          title={icon.species}
          loading="lazy"
          className="h-[30px] w-[40px] object-contain"
          style={{ imageRendering: icon.pixelated ? "pixelated" : "auto" }}
        />
      ))}
    </div>
  );
}

function FieldError({ value }: { value: TeamsheetValue }) {
  if (!value.error) {
    return null;
  }
  return (
    <div className="text-[12.5px] text-destructive">
      <p className="font-semibold">{value.error}</p>
      {value.details.length > 0 ? (
        <ul className="mt-0.5 flex flex-col gap-0.5 text-destructive/90">
          {value.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function TeamsheetField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: TeamsheetValue;
  onChange: (next: TeamsheetValue) => void;
  disabled?: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [checking, setChecking] = useState(false);

  const checkLink = async () => {
    if (!shouldValidateLink(value)) {
      return;
    }
    setChecking(true);
    const result = await validateTeamsheet(value.link);
    setChecking(false);
    onChange(
      result.ok
        ? withAccepted(
            value,
            { source: result.source, ots: result.ots, icons: result.icons },
            false,
          )
        : withError(value, result.error, result.details ?? []),
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="whitespace-nowrap font-semibold text-[13px] text-brand-blue dark:text-white">
        {label}
      </span>

      {value.imported && value.accepted ? (
        <div className="flex flex-col gap-2 rounded-lg border border-brand-orange/40 bg-brand-orange/5 px-3.5 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-[13px] text-brand-blue dark:text-white">
              Über Showdown-Export
            </span>
            <button
              type="button"
              onClick={() => onChange(cleared())}
              disabled={disabled}
              className="font-semibold text-[12.5px] text-destructive underline underline-offset-[3px] hover:no-underline"
            >
              Entfernen
            </button>
          </div>
          <MonIcons value={value} />
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                className={cn(
                  "h-10.5 pr-9",
                  value.error && "border-destructive",
                )}
                value={value.link}
                onChange={(event) =>
                  onChange(withLink(value, event.target.value))
                }
                onBlur={checkLink}
                disabled={disabled || checking}
                placeholder="https://pokepast.es/… oder vrpastes.com/…"
                autoComplete="off"
                inputMode="url"
              />
              {value.accepted ? (
                <span className="-translate-y-1/2 absolute top-1/2 right-3 font-bold text-[oklch(0.55_0.15_150)] text-sm">
                  ✓
                </span>
              ) : null}
              {checking ? (
                <span className="-translate-y-1/2 absolute top-1/2 right-3 text-[11.5px] text-muted-foreground">
                  prüft
                </span>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10.5 shrink-0"
              onClick={() => setDialogOpen(true)}
              disabled={disabled}
            >
              Importieren
            </Button>
          </div>
          <MonIcons value={value} />
        </>
      )}

      <FieldError value={value} />

      <ImportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        label={label}
        initialText={value.imported ? value.accepted?.ots : undefined}
        onAccept={(accepted) => onChange(withAccepted(value, accepted, true))}
      />
    </div>
  );
}
