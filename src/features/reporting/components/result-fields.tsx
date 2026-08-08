"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PLATFORM_LABELS } from "@/features/registration/registration";
import type { Identity } from "@/features/season/dashboard";
import { ImportDialog } from "@/features/teamsheets/components/import-dialog";
import {
  type TeamsheetValue,
  withAccepted,
} from "@/features/teamsheets/field-state";
import { cn } from "@/lib/utils";
import type { Platform } from "../report";
import { gameIndexes, type ResultDraft, setWinner } from "../result-draft";

// The fields of a normal result in a neutral perspective (player A vs player
// B), controlled from the outside. Shared by the standalone "Ergebnis
// bearbeiten" editor and the correction branch of the dispute decision, so a
// correction looks and validates the same wherever staff start it.
export function ResultFields({
  draft,
  onChange,
  playerA,
  playerB,
}: {
  draft: ResultDraft;
  onChange: (draft: ResultDraft) => void;
  playerA: Identity;
  playerB: Identity;
}) {
  const indexes = gameIndexes(draft);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-2">
        <Label>Plattform</Label>
        <RadioGroup
          className="grid grid-cols-2 gap-2"
          value={draft.platform}
          onValueChange={(v) => onChange({ ...draft, platform: v as Platform })}
        >
          {(Object.keys(PLATFORM_LABELS) as Platform[]).map((value) => (
            // biome-ignore lint/a11y/noLabelWithoutControl: the RadioGroupItem is the control
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 px-3 has-data-[state=checked]:border-brand-orange has-data-[state=checked]:bg-brand-orange/6"
            >
              <RadioGroupItem value={value} />
              <span className="font-medium text-sm">
                {PLATFORM_LABELS[value]}
              </span>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="grid gap-2">
        <Label>Sieger je Spiel</Label>
        {indexes.map((i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <span className="w-14 shrink-0 font-semibold text-muted-foreground text-xs uppercase">
                Spiel {i + 1}
              </span>
              <div className="grid flex-1 grid-cols-2 gap-2">
                {[playerA, playerB].map((p) => (
                  <button
                    key={p.userId}
                    type="button"
                    onClick={() => onChange(setWinner(draft, i, p.userId))}
                    className={cn(
                      "h-9 truncate rounded-md border px-2 font-semibold text-sm",
                      draft.winners[i] === p.userId
                        ? "border-brand-orange bg-brand-orange/12 text-brand-blue dark:text-white"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            {draft.platform === "showdown" ? (
              <Input
                className="h-9 text-[13px]"
                value={draft.replays[i]}
                onChange={(e) => {
                  const replays = [...draft.replays];
                  replays[i] = e.target.value;
                  onChange({ ...draft, replays });
                }}
                placeholder="Replay-Link"
              />
            ) : null}
          </div>
        ))}
      </div>

      {draft.platform === "cartridge" ? (
        <div className="grid gap-2">
          <Label>Video (optional)</Label>
          <Input
            value={draft.video}
            onChange={(e) => onChange({ ...draft, video: e.target.value })}
            placeholder="Video-Link"
          />
        </div>
      ) : null}

      {/* Staff never get a link field. Correcting a sheet means editing the
          text we stored, whichever route the player originally used. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <StaffSheetField
          label={`Team ${playerA.name}`}
          value={draft.teamA}
          onChange={(teamA) => onChange({ ...draft, teamA })}
        />
        <StaffSheetField
          label={`Team ${playerB.name}`}
          value={draft.teamB}
          onChange={(teamB) => onChange({ ...draft, teamB })}
        />
      </div>
    </div>
  );
}

// A stored team sheet in the staff editor: a button that opens the import
// dialog with the current sheet prefilled. There is no link field, because a
// correction is always an edit of text — the route the player used is history.
function StaffSheetField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TeamsheetValue;
  onChange: (next: TeamsheetValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const accepted = value.accepted;

  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="justify-between font-normal"
      >
        <span className="flex min-w-0 items-center gap-2">
          {accepted ? (
            <span className="flex shrink-0 items-center gap-0.5">
              {accepted.icons.slice(0, 6).map((icon, index) => (
                // biome-ignore lint/performance/noImgElement: box icons are external bucket assets, not app images
                <img
                  key={`${icon.species}-${index}`}
                  src={icon.iconUrl}
                  alt=""
                  loading="lazy"
                  className="h-[22px] w-[30px] object-contain"
                  style={{
                    imageRendering: icon.pixelated ? "pixelated" : "auto",
                  }}
                />
              ))}
            </span>
          ) : (
            <span className="text-muted-foreground">Kein Teamsheet</span>
          )}
        </span>
        <span className="shrink-0 font-semibold text-[13px]">
          {accepted ? "Bearbeiten" : "Hinzufügen"}
        </span>
      </Button>

      <ImportDialog
        open={open}
        onOpenChange={setOpen}
        label={label}
        initialText={accepted?.ots}
        onAccept={(next) => onChange(withAccepted(value, next, true))}
      />
    </div>
  );
}
