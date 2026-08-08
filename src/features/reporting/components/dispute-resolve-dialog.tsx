"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { Identity } from "@/features/season/dashboard";
import { cn } from "@/lib/utils";
import type { DisputeDecisionKind } from "../dispute";
import { decideDispute } from "../dispute-actions";
import type { MatchOutcome } from "../report";
import {
  draftToReport,
  emptyDraft,
  isDraftComplete,
  type NormalEditorInitial,
  type ResultDraft,
} from "../result-draft";
import { ResultFields } from "./result-fields";

type Option = {
  value: DisputeDecisionKind;
  title: string;
  body: string;
  submit: string;
  destructive?: boolean;
};

// Every path staff can take on a disputed match. They all live here on purpose:
// the decision and the result change are one step, so a correction can never
// end up filed as "bestätigt" and vice versa.
function options(pendingFreeWin: boolean): Option[] {
  return [
    {
      value: "uphold",
      title: "Ergebnis bestätigen",
      body: pendingFreeWin
        ? "Das gemeldete Ergebnis bleibt bestehen. Der Freewin wird bestätigt und gewertet."
        : "Das gemeldete Ergebnis bleibt unverändert bestehen.",
      submit: "Ergebnis bestätigen",
    },
    {
      value: "edit",
      title: "Ergebnis korrigieren",
      body: "Spiele, Plattform, Replays und Teams anpassen. Direkt hier.",
      submit: "Korrektur speichern",
    },
    {
      value: "free_win",
      title: "Freewin vergeben",
      body: "Ein Spieler bekommt den Sieg. Ersetzt das gemeldete Ergebnis.",
      submit: "Freewin vergeben",
    },
    {
      value: "double_loss",
      title: "Doppelniederlage vergeben",
      body: "Beide Spieler verlieren, niemand bekommt den Sieg.",
      submit: "Doppelniederlage vergeben",
    },
    {
      value: "reset",
      title: "Ergebnis zurücksetzen",
      body: "Das Ergebnis wird gelöscht, die Spieler melden neu.",
      submit: "Ergebnis zurücksetzen",
      destructive: true,
    },
  ];
}

function resultLabel(
  outcome: MatchOutcome,
  winnerName: string | null,
  pendingFreeWin: boolean,
): string {
  if (outcome === "double_loss") {
    return "Doppelniederlage";
  }
  if (outcome === "free_win") {
    return `Freewin für ${winnerName ?? "—"}${pendingFreeWin ? " · noch nicht bestätigt" : ""}`;
  }
  return `Sieg für ${winnerName ?? "—"}`;
}

// Staff decide an open dispute in one flow: pick the decision, fill in what it
// needs, explain it. Nothing is written before the last button.
export function DisputeResolveDialog({
  matchId,
  playerA,
  playerB,
  reason,
  openedByName,
  outcome,
  winnerName,
  pendingFreeWin = false,
  editorInitial,
}: {
  matchId: string;
  playerA: Identity;
  playerB: Identity;
  reason?: string | null;
  openedByName?: string | null;
  // The result that is currently counted, for context and for what
  // "bestätigen" means here.
  outcome: MatchOutcome;
  winnerName?: string | null;
  pendingFreeWin?: boolean;
  // Prefill for the correction branch, when the current result is a normal one.
  editorInitial?: NormalEditorInitial | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [kind, setKind] = useState<DisputeDecisionKind | null>(null);
  const [draft, setDraft] = useState<ResultDraft>(() =>
    emptyDraft(editorInitial),
  );
  const [winnerId, setWinnerId] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = options(pendingFreeWin);
  const chosen = list.find((option) => option.value === kind) ?? null;
  const freeWinName =
    winnerId === playerA.userId
      ? playerA.name
      : winnerId === playerB.userId
        ? playerB.name
        : null;

  // What the chosen decision still needs. The mandatory note is not listed
  // here, its own field says so.
  const blocker =
    kind === "edit" && !isDraftComplete(draft)
      ? "Das korrigierte Ergebnis ist noch nicht vollständig."
      : kind === "free_win" && winnerId === ""
        ? "Wähle, wer den Freewin bekommt."
        : null;
  const ready = kind !== null && blocker === null && note.trim() !== "";

  function reset() {
    setStep(1);
    setKind(null);
    setDraft(emptyDraft(editorInitial));
    setWinnerId("");
    setNote("");
    setError(null);
  }

  function change(open: boolean) {
    setOpen(open);
    if (!open) {
      reset();
    }
  }

  async function submit() {
    if (!kind || !ready) {
      return;
    }
    setPending(true);
    setError(null);
    const decision =
      kind === "edit"
        ? { kind, report: draftToReport(draft) }
        : kind === "free_win"
          ? { kind, winnerId }
          : { kind };
    const result = await decideDispute({ matchId, decision, note });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    change(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      <Button type="button" onClick={() => setOpen(true)}>
        Entscheiden
      </Button>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Anfechtung entscheiden</DialogTitle>
          <DialogDescription>
            {playerA.name} vs. {playerB.name}. Deine Entscheidung setzt das
            Ergebnis und schließt die Anfechtung in einem Schritt.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1 rounded-lg border border-destructive/35 bg-destructive/[0.06] px-4 py-3">
              <span className="font-semibold text-[12px] text-destructive uppercase tracking-[0.1em]">
                Anfechtung von {openedByName ?? "—"}
              </span>
              {reason ? (
                <p className="text-[13.5px] text-muted-foreground">
                  "{reason}"
                </p>
              ) : null}
            </div>
            <p className="px-1 text-[12.5px] text-muted-foreground">
              Aktuell gewertet:{" "}
              <span className="font-medium text-foreground">
                {resultLabel(outcome, winnerName ?? null, pendingFreeWin)}
              </span>
            </p>
          </div>

          {step === 1 ? (
            <div className="grid gap-2">
              <StepLabel step={1} text="Wie entscheidest du?" />
              <RadioGroup
                className="grid gap-2"
                value={kind ?? ""}
                onValueChange={(v) => setKind(v as DisputeDecisionKind)}
              >
                {list.map((option) => (
                  // biome-ignore lint/a11y/noLabelWithoutControl: the RadioGroupItem is the control
                  <label
                    key={option.value}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-3",
                      "has-data-[state=checked]:border-brand-orange has-data-[state=checked]:bg-brand-orange/6",
                    )}
                  >
                    <RadioGroupItem value={option.value} className="mt-0.5" />
                    <span className="flex flex-col gap-0.5">
                      <span
                        className={cn(
                          "font-semibold text-sm",
                          option.destructive && "text-destructive",
                        )}
                      >
                        {option.title}
                      </span>
                      <span className="text-[13px] text-muted-foreground">
                        {option.body}
                      </span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.1em]">
                    Entscheidung
                  </p>
                  <p className="truncate font-semibold text-sm">
                    {chosen?.title}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(1)}
                >
                  Ändern
                </Button>
              </div>

              <div className="grid gap-2.5">
                <StepLabel
                  step={2}
                  text={
                    kind === "edit"
                      ? "Korrigiertes Ergebnis"
                      : kind === "free_win"
                        ? "Wer bekommt den Freewin?"
                        : "Das passiert"
                  }
                />

                {kind === "edit" ? (
                  <ResultFields
                    draft={draft}
                    onChange={setDraft}
                    playerA={playerA}
                    playerB={playerB}
                  />
                ) : null}

                {kind === "free_win" ? (
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {[playerA, playerB].map((p) => (
                      <button
                        key={p.userId}
                        type="button"
                        onClick={() => setWinnerId(p.userId)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg p-3 text-left",
                          winnerId === p.userId
                            ? "border-2 border-brand-orange"
                            : "border bg-background",
                        )}
                      >
                        <Avatar className="size-[30px]">
                          {p.avatarUrl ? (
                            <AvatarImage src={p.avatarUrl} alt="" />
                          ) : null}
                          <AvatarFallback className="text-[11px]">
                            {p.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1 truncate font-medium text-sm">
                          {p.name}
                        </span>
                        {winnerId === p.userId ? (
                          <span className="font-bold text-brand-orange">✓</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}

                {chosen && kind !== "edit" && kind !== "free_win" ? (
                  <p
                    className={cn(
                      "rounded-lg border px-4 py-3 text-[13px]",
                      chosen.destructive
                        ? "border-destructive/35 bg-destructive/[0.06] text-destructive"
                        : "bg-muted/40 text-muted-foreground",
                    )}
                  >
                    {chosen.body}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dispute-note">Erkläre deine Entscheidung</Label>
                <Textarea
                  id="dispute-note"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="z. B. Die Replays zeigen Spiel 2 klar für Kai. Ergebnis entsprechend korrigiert."
                />
                <p className="text-[12.5px] text-muted-foreground">
                  Pflichtfeld. Beide Spieler sehen die Begründung auf der
                  Match-Seite.
                </p>
              </div>
            </>
          )}

          {step === 2 && blocker ? (
            <p className="text-[12.5px] text-muted-foreground">{blocker}</p>
          ) : null}
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
        </div>

        <DialogFooter>
          {step === 1 ? (
            <>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Abbrechen
                </Button>
              </DialogClose>
              <Button
                type="button"
                disabled={kind === null}
                onClick={() => setStep(2)}
              >
                Weiter
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
              >
                Zurück
              </Button>
              <Button
                type="button"
                disabled={pending || !ready}
                onClick={submit}
              >
                {pending
                  ? "Wird gespeichert…"
                  : kind === "free_win" && freeWinName
                    ? `Freewin an ${freeWinName} vergeben`
                    : (chosen?.submit ?? "Speichern")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepLabel({ step, text }: { step: 1 | 2; text: string }) {
  return (
    <p className="flex items-center gap-2 font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.1em]">
      <span className="flex size-[18px] items-center justify-center rounded-full bg-brand-blue/12 text-[11px] text-brand-blue dark:bg-white/12 dark:text-white">
        {step}
      </span>
      {text}
    </p>
  );
}
