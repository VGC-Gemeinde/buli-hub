"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PlayerPicker } from "@/components/player-picker";
import { Tick } from "@/components/tick";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PlayerAvatar } from "@/features/season/components/player-avatar";
import type { Identity } from "@/features/season/dashboard";
import { formatGermanDayRange } from "@/lib/german-time";
import { offerReplacement } from "../actions";
import type { ReplacementCandidate } from "../queries";

// What the staff views hand the offer controls: who can be offered a slot
// and from which matchday. Empty `entryChoices` = the season is over.
export type ReplacementOfferOptions = {
  candidates: ReplacementCandidate[];
  entryChoices: {
    round: number;
    running: boolean;
    startsOn: string;
    endsOn: string;
  }[];
};

function losses(count: number): string {
  if (count === 0) {
    return "ohne Niederlage";
  }
  return count === 1 ? "mit 1 Niederlage" : `mit ${count} Niederlagen`;
}

// "Ersatz einsetzen": staff pick who takes over a dropped player's slot and
// from which matchday. Nothing changes until that player accepts on their
// dashboard, and the offer can be withdrawn until then, so no type-to-confirm
// (docs/plans/player-replacement.md).
//
// Wide on desktop: the searchable player list takes the left column, the
// decision (slot, entry round, what the replacement starts with, submit) the
// right one. On a phone the two stack, with title and action bar pinned and
// only the middle scrolling, like the feedback dialog.
export function OfferReplacementDialog({
  replaced,
  groupName,
  options,
  missedByRound = {},
  triggerSize = "sm",
}: {
  replaced: Identity;
  groupName: string;
  options: ReplacementOfferOptions;
  // Losses the replacement would start with, per offered entry round.
  missedByRound?: Record<number, number>;
  triggerSize?: "default" | "sm";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [round, setRound] = useState<string>(
    String(options.entryChoices[0]?.round ?? ""),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected =
    options.candidates.find((c) => c.userId === candidateId) ?? null;
  const seasonOver = options.entryChoices.length === 0;

  function reset() {
    setCandidateId(null);
    setRound(String(options.entryChoices[0]?.round ?? ""));
    setError(null);
  }

  async function submit() {
    if (!selected || round === "") {
      return;
    }
    setPending(true);
    setError(null);
    const result = await offerReplacement({
      replacedUserId: replaced.userId,
      candidateUserId: selected.userId,
      entryRound: Number(round),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset();
        }
      }}
    >
      <Button
        type="button"
        size={triggerSize}
        variant="outline"
        disabled={seasonOver}
        title={seasonOver ? "Die Saison hat keinen Spieltag mehr" : undefined}
        onClick={() => setOpen(true)}
      >
        Ersatz einsetzen
      </Button>
      <DialogContent className="flex flex-col gap-0 overflow-y-hidden p-0 sm:max-w-[880px]">
        <DialogHeader className="shrink-0 gap-1.5 border-b px-6 pt-5 pr-12 pb-4">
          <DialogTitle className="text-[22px] uppercase tracking-[0.02em]">
            Ersatz für {replaced.name}
          </DialogTitle>
          <DialogDescription className="text-[13.5px] leading-relaxed">
            Wähle, wer den Platz übernimmt und ab wann. Es gilt erst, wenn der
            Spieler im Spieler-Dashboard zusagt. Bis dahin kannst du das Angebot
            zurückziehen.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[minmax(0,1fr)_340px] md:overflow-y-hidden">
          {/* Left: who. */}
          <div className="flex min-w-0 flex-col gap-3 px-6 py-5 md:min-h-0">
            <div className="flex items-center gap-2.5">
              <Tick size="s" />
              <span className="font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.12em]">
                Spieler
              </span>
            </div>
            <PlayerPicker
              players={options.candidates}
              selectedId={candidateId}
              onSelect={setCandidateId}
              emptyText="Niemand gefunden. Der Spieler muss sich einmal im Buli-Hub angemeldet haben und darf nicht schon mitspielen oder gesperrt sein."
              listClassName="h-[280px] md:h-[400px]"
            />
          </div>

          {/* Right: the decision. */}
          <div className="flex min-w-0 flex-col gap-5 border-t bg-muted/30 px-6 py-5 md:overflow-y-auto md:border-t-0 md:border-l">
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.12em]">
                Platz
              </span>
              <div className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2.5">
                <PlayerAvatar identity={replaced} size="size-8" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-semibold text-[14.5px]">
                    {replaced.name}
                  </span>
                  <span className="text-[12.5px] text-muted-foreground">
                    {groupName} · gedroppt
                  </span>
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.12em]">
                Einstieg
              </span>
              <RadioGroup
                className="grid gap-2"
                value={round}
                onValueChange={setRound}
              >
                {options.entryChoices.map((choice) => (
                  // biome-ignore lint/a11y/noLabelWithoutControl: the RadioGroupItem is the control
                  <label
                    key={choice.round}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-3 has-data-[state=checked]:border-brand-orange has-data-[state=checked]:bg-brand-orange/5"
                  >
                    <RadioGroupItem
                      value={String(choice.round)}
                      className="mt-0.5"
                    />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-semibold text-sm">
                        Spieltag {choice.round}
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          · {choice.running ? "läuft" : "nächster"}
                        </span>
                      </span>
                      <span className="text-[12.5px] text-muted-foreground">
                        {formatGermanDayRange(choice.startsOn, choice.endsOn)}
                      </span>
                      {missedByRound[choice.round] !== undefined ? (
                        <span className="text-[12.5px] text-muted-foreground">
                          Startet {losses(missedByRound[choice.round])}
                        </span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <ul className="flex flex-col gap-1.5 text-[12.5px] text-muted-foreground leading-relaxed">
              <li>
                Der Ersatz übernimmt den Spielplan ab dem Einstieg. Die
                Spieltage davor zählen für den Platz als Niederlage.
              </li>
              <li>
                {replaced.name} verschwindet aus der Tabelle und steigt ab.
              </li>
              {options.entryChoices.some((c) => c.running) ? (
                <li>
                  Sagt der Spieler erst nach dem Ende des gewählten Spieltags
                  zu, steigt er am dann laufenden ein.
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-t px-6 py-4">
          <span className="flex min-w-0 flex-1 items-center gap-2.5 text-sm">
            {selected ? (
              <>
                <PlayerAvatar identity={selected} size="size-6" />
                <span className="min-w-0 truncate">
                  <span className="font-semibold">{selected.name}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    übernimmt ab Spieltag {round}
                  </span>
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">
                Noch kein Spieler gewählt
              </span>
            )}
          </span>
          {error ? (
            <p className="basis-full text-destructive text-sm sm:order-first">
              {error}
            </p>
          ) : null}
          <Button
            type="button"
            size="lg"
            className="w-full sm:w-auto"
            disabled={!selected || round === "" || pending}
            onClick={submit}
          >
            {pending ? "Wird angeboten…" : "Platz anbieten"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
