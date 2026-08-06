"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PLATFORM_LABELS } from "@/features/registration/registration";
import type { Identity } from "@/features/season/dashboard";
import { cn } from "@/lib/utils";
import type { Platform } from "../report";
import { gameIndexes, type ResultDraft, setWinner } from "../result-draft";

// The fields of a normal result in a neutral perspective (player A vs player
// B), controlled from the outside. Shared by the standalone „Ergebnis
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

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Team {playerA.name}</Label>
          <Input
            value={draft.teamA}
            onChange={(e) => onChange({ ...draft, teamA: e.target.value })}
            placeholder="https://pokepast.es/…"
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Team {playerB.name}</Label>
          <Input
            value={draft.teamB}
            onChange={(e) => onChange({ ...draft, teamB: e.target.value })}
            placeholder="https://pokepast.es/…"
          />
        </div>
      </div>
    </div>
  );
}
