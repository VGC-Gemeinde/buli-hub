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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  matchesConfirmationPhrase,
  SEASON_NAME,
} from "@/features/staff/registration-window";
import { publishSeeding } from "../actions";

export function PublishPanel({
  total,
  grouped,
  ready,
}: {
  total: number;
  grouped: number;
  ready: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setConfirmation("");
      setError(null);
    }
    setOpen(next);
  }

  async function submit() {
    setPending(true);
    setError(null);
    const result = await publishSeeding();
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    handleOpenChange(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-sm">
        {grouped} von {total} Spielern in Gruppen.
      </p>
      {ready ? null : (
        <p className="text-[13px] text-muted-foreground leading-snug">
          Alle Spieler müssen einer Gruppe zugeordnet sein, bevor du
          veröffentlichen kannst.
        </p>
      )}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <div>
            <Button type="button" disabled={!ready}>
              Einteilung veröffentlichen
            </Button>
          </div>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Einteilung veröffentlichen?</DialogTitle>
            <DialogDescription>
              Die Einteilung für{" "}
              <span className="font-semibold text-foreground">
                {SEASON_NAME}
              </span>{" "}
              wird veröffentlicht und kann danach nicht mehr geändert werden.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="publish-confirmation">
              Gib{" "}
              <span className="font-semibold text-brand-blue dark:text-white">
                {SEASON_NAME}
              </span>{" "}
              ein, um zu bestätigen
            </Label>
            <Input
              id="publish-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={SEASON_NAME}
              autoComplete="off"
            />
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Abbrechen
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={!matchesConfirmationPhrase(confirmation) || pending}
              onClick={submit}
            >
              {pending ? "Wird veröffentlicht…" : "Veröffentlichen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
