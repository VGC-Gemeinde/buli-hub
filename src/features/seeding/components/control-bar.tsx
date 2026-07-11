"use client";

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
import { cn } from "@/lib/utils";
import type { ControlState } from "../control";

// The status pill in the title row showing who is driving. The page opens
// read-only for everyone; one person takes control to edit. The lock is a
// page-wide mode and the disabled controls communicate it locally, so a pill
// states it without costing a chrome row. Free/stale locks are taken with a
// light confirmation; a lock held by someone else needs an explicit takeover.
export function ControlPill({
  state,
  holderName,
  pending,
  onAcquire,
  onRelease,
}: {
  state: ControlState;
  holderName: string | null;
  pending: boolean;
  // `force` is set when overriding another person's live control.
  onAcquire: (force: boolean) => void;
  onRelease: () => void;
}) {
  if (state === "self") {
    return (
      <Pill
        tone="border-brand-orange/40 bg-brand-orange/5"
        dot="bg-brand-orange"
      >
        <span className="text-muted-foreground">
          Du steuerst die Einteilung
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={onRelease}
        >
          Freigeben
        </Button>
      </Pill>
    );
  }

  if (state === "held-by-other") {
    return (
      <Pill tone="border-amber-500/40 bg-amber-500/5" dot="bg-amber-500">
        <span className="text-muted-foreground">
          <span className="font-semibold text-foreground">
            {holderName ?? "Jemand anderes"}
          </span>{" "}
          steuert — du beobachtest
        </span>
        <ConfirmTakeover
          holderName={holderName}
          pending={pending}
          onConfirm={() => onAcquire(true)}
        />
      </Pill>
    );
  }

  // free | stale — nobody is actively driving.
  return (
    <Pill tone="bg-muted/40" dot="bg-muted-foreground/40">
      <span className="text-muted-foreground">
        Niemand steuert — du beobachtest
      </span>
      <ConfirmAcquire pending={pending} onConfirm={() => onAcquire(false)} />
    </Pill>
  );
}

function Pill({
  tone,
  dot,
  children,
}: {
  tone: string;
  dot: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full border py-[5px] pr-1.5 pl-3 text-[13px]",
        tone,
      )}
    >
      <span className={cn("size-2 shrink-0 rounded-full", dot)} />
      {children}
    </div>
  );
}

function ConfirmAcquire({
  pending,
  onConfirm,
}: {
  pending: boolean;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        Steuerung übernehmen
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Steuerung übernehmen?</DialogTitle>
          <DialogDescription>
            Solange du steuerst, kann niemand sonst die Einteilung bearbeiten.
            Üblicherweise übernimmt die Person, die ihren Bildschirm teilt.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Abbrechen
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            Übernehmen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmTakeover({
  holderName,
  pending,
  onConfirm,
}: {
  holderName: string | null;
  pending: boolean;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  const who = holderName ?? "Jemand anderes";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        Übernehmen
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Steuerung übernehmen?</DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-foreground">{who}</span> steuert
            die Einteilung gerade. Wenn du übernimmst, verliert diese Person die
            Kontrolle und kann nicht mehr bearbeiten.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Abbrechen
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            Trotzdem übernehmen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
