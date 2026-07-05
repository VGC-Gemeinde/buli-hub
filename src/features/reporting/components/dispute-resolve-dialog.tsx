"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { cn } from "@/lib/utils";
import { resolveDispute } from "../dispute-actions";

type Resolution = "upheld" | "corrected";

const OPTIONS: { value: Resolution; title: string; body: string }[] = [
  {
    value: "upheld",
    title: "Ergebnis bestätigen",
    body: "Das gemeldete Ergebnis bleibt bestehen.",
  },
  {
    value: "corrected",
    title: "Als korrigiert markieren",
    body: "Das Ergebnis wurde angepasst.",
  },
];

// Staff decide an open dispute: uphold the result or mark it corrected (after
// editing via the result editor). An optional note records the reasoning. The
// quoted dispute is shown in a destructive-tinted box for context (§4.4).
export function DisputeResolveDialog({
  matchId,
  reason,
  openedByName,
}: {
  matchId: string;
  reason?: string | null;
  openedByName?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [resolution, setResolution] = useState<Resolution>("upheld");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    const result = await resolveDispute({ matchId, resolution, note });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setNote("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" onClick={() => setOpen(true)}>
        Entscheiden
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anfechtung entscheiden</DialogTitle>
          <DialogDescription>
            Bestätige das gemeldete Ergebnis oder markiere es als korrigiert,
            nachdem du es bearbeitet hast.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {reason ? (
            <div className="flex flex-col gap-1 rounded-lg border border-destructive/35 bg-destructive/[0.06] px-4 py-3">
              <span className="font-semibold text-[12px] text-destructive uppercase tracking-[0.1em]">
                Anfechtung von {openedByName ?? "—"}
              </span>
              <p className="text-[13.5px] text-muted-foreground">„{reason}"</p>
            </div>
          ) : null}

          <RadioGroup
            className="grid gap-2"
            value={resolution}
            onValueChange={(v) => setResolution(v as Resolution)}
          >
            {OPTIONS.map((option) => (
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
                  <span className="font-semibold text-sm">{option.title}</span>
                  <span className="text-[13px] text-muted-foreground">
                    {option.body}
                  </span>
                </span>
              </label>
            ))}
          </RadioGroup>

          <div className="grid gap-2">
            <Label>Notiz (optional)</Label>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Wie wurde entschieden?"
            />
          </div>

          {error ? <p className="text-destructive text-sm">{error}</p> : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Abbrechen
            </Button>
          </DialogClose>
          <Button type="button" disabled={pending} onClick={submit}>
            {pending ? "Wird gespeichert…" : "Entscheidung speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
