"use client";

import { Eye, Lock, Radio } from "lucide-react";
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

// The strip above the seeding toolbar showing who is driving. The page opens
// read-only for everyone; one person takes control to edit. Free/stale locks
// are taken with a light confirmation; a lock held by someone else needs an
// explicit takeover.
export function ControlBar({
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
      <Bar
        tone="active"
        icon={<Radio className="size-4" />}
        text="Du steuerst die Einteilung."
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={onRelease}
          >
            Freigeben
          </Button>
        }
      />
    );
  }

  if (state === "held-by-other") {
    return (
      <Bar
        tone="busy"
        icon={<Lock className="size-4" />}
        text={
          <>
            <span className="font-semibold">
              {holderName ?? "Jemand anderes"}
            </span>{" "}
            steuert die Einteilung gerade — du beobachtest.
          </>
        }
        action={
          <ConfirmTakeover
            holderName={holderName}
            pending={pending}
            onConfirm={() => onAcquire(true)}
          />
        }
      />
    );
  }

  // free | stale — nobody is actively driving.
  return (
    <Bar
      tone="idle"
      icon={<Eye className="size-4" />}
      text="Du beobachtest. Niemand steuert die Einteilung gerade."
      action={
        <ConfirmAcquire pending={pending} onConfirm={() => onAcquire(false)} />
      }
    />
  );
}

function Bar({
  tone,
  icon,
  text,
  action,
}: {
  tone: "active" | "busy" | "idle";
  icon: React.ReactNode;
  text: React.ReactNode;
  action: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2.5 border-b px-7 py-2 text-[13.5px]",
        tone === "active" && "border-brand-orange/40 bg-brand-orange/5",
        tone === "busy" && "border-amber-500/40 bg-amber-500/5",
        tone === "idle" && "bg-muted/40",
      )}
    >
      <span
        className={cn(
          tone === "active" && "text-brand-orange",
          tone === "busy" && "text-amber-600 dark:text-amber-500",
          tone === "idle" && "text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span className="flex-1">{text}</span>
      {action}
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
