"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Tick } from "@/components/tick";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RegelwerkPrompt } from "@/features/regelwerk/acceptance";
import { AcceptButton } from "@/features/regelwerk/components/accept-control";
import { Callout } from "@/features/regelwerk/components/callout";

// The two acceptance prompts, and the only place in the app where a player
// confirms after registration. The rules page stays a document — asking for
// agreement belongs where we are actually asking, not next to the text.
//
// The bodies are separate from the Dialog wrappers so the /dev/ui gallery and
// the rules page can reuse them — mounting the real gate dialog in the gallery
// would take it hostage, since it is deliberately non-dismissible.

// ~420px; DialogContent's default sm:max-w-sm is too narrow for this copy.
const WIDTH = "sm:max-w-[420px]";

const SESSION_KEY = "regelwerk-reminder-dismissed";

function Kicker({
  color,
  children,
}: {
  color: "orange" | "navy";
  children: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Tick size="s" color={color} />
      <span className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.12em]">
        {children}
      </span>
    </div>
  );
}

export function ReminderBody({
  seasonNumber,
  onAccepted,
  /** Off when the dialog was opened from the rules page itself. */
  showReadLink = true,
}: {
  seasonNumber: number;
  onAccepted?: () => void;
  showReadLink?: boolean;
}) {
  return (
    <>
      <DialogHeader>
        <Kicker color="orange">{`Saison ${seasonNumber} · Noch offen`}</Kicker>
        <DialogTitle>Regelwerk bestätigen</DialogTitle>
        <DialogDescription>
          Du bist für Saison {seasonNumber} angemeldet. Lies dir das Regelwerk
          durch und bestätige es, bevor die Saison losgeht.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        {showReadLink ? (
          <Button asChild variant="ghost">
            {/* New tab: reading the rules should not cost you the dialog, and
                the prompt is still there to confirm in when you come back. */}
            <Link href="/regelwerk" target="_blank" rel="noreferrer">
              Regelwerk lesen
            </Link>
          </Button>
        ) : null}
        <AcceptButton onAccepted={onAccepted} />
      </DialogFooter>
    </>
  );
}

export function GateBody({
  seasonNumber,
  onAccepted,
}: {
  seasonNumber: number;
  onAccepted?: () => void;
}) {
  return (
    <>
      <DialogHeader>
        {/* Navy, not orange: the brand rule puts navy on structural surfaces.
            The reminder is an invitation; this is not. */}
        <Kicker color="navy">{`Saison ${seasonNumber} · Erforderlich`}</Kicker>
        <DialogTitle>Regelwerk bestätigen</DialogTitle>
        <DialogDescription>
          Die Saison läuft. Bevor du Ergebnisse melden oder anfechten kannst,
          musst du das Regelwerk bestätigen.
        </DialogDescription>
      </DialogHeader>
      <Callout title="Bis dahin">
        Tabellen, Spielplan und Ergebnisse kannst du weiter ansehen. Nur
        Aktionen sind gesperrt.
      </Callout>
      <DialogFooter>
        <Button asChild variant="ghost">
          {/* Same in the gate, and more so: it cannot be dismissed, so
              navigating away in this tab would strand the player. */}
          <Link href="/regelwerk" target="_blank" rel="noreferrer">
            Regelwerk lesen
          </Link>
        </Button>
        <AcceptButton onAccepted={onAccepted} />
      </DialogFooter>
    </>
  );
}

/**
 * Registration open, season not started. Dismissible, and shown once per
 * browser session: a reminder that reappears on every page turn is an error
 * message, while one that never reappears is a missed deadline. Session
 * storage is exactly that lifetime — and the rules page carries a button to
 * open it again on purpose.
 */
function ReminderDialog({ seasonNumber }: { seasonNumber: number }) {
  const [open, setOpen] = useState(false);

  // Read after mount, never during render — sessionStorage does not exist on
  // the server, and the dialog must not differ between the two passes.
  useEffect(() => {
    if (window.sessionStorage.getItem(SESSION_KEY) === null) {
      setOpen(true);
    }
  }, []);

  function dismiss() {
    window.sessionStorage.setItem(SESSION_KEY, "1");
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          dismiss();
        }
      }}
    >
      <DialogContent className={WIDTH}>
        <ReminderBody seasonNumber={seasonNumber} onAccepted={dismiss} />
      </DialogContent>
    </Dialog>
  );
}

/**
 * Season running, still unaccepted. Non-dismissible — but it carries the
 * confirm button itself, so "the only way out" is one click rather than a trip
 * through the document.
 */
function GateDialog({ seasonNumber }: { seasonNumber: number }) {
  return (
    <Dialog open>
      <DialogContent
        className={WIDTH}
        showCloseButton={false}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <GateBody seasonNumber={seasonNumber} />
      </DialogContent>
    </Dialog>
  );
}

export function RegelwerkPromptDialog({
  prompt,
  seasonNumber,
}: {
  prompt: RegelwerkPrompt;
  seasonNumber: number;
}) {
  if (prompt === "reminder") {
    return <ReminderDialog seasonNumber={seasonNumber} />;
  }
  if (prompt === "gate") {
    return <GateDialog seasonNumber={seasonNumber} />;
  }
  return null;
}

/**
 * The rules page's entry point into the reminder (design divergence noted in
 * docs/plans/regelwerk.md): the document itself never carries an acceptance
 * control, but a player who arrives unaccepted needs a way to act on it
 * without hunting for the dashboard.
 */
export function ReminderTrigger({ seasonNumber }: { seasonNumber: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-lg border border-brand-orange bg-brand-orange/5 p-5">
      <div className="flex items-center gap-2.5">
        <Tick size="s" />
        <span className="font-semibold text-[13px]">
          Regelwerk noch nicht bestätigt
        </span>
      </div>
      <Button type="button" onClick={() => setOpen(true)}>
        Bestätigen
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={WIDTH}>
          <ReminderBody
            seasonNumber={seasonNumber}
            onAccepted={() => setOpen(false)}
            showReadLink={false}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
