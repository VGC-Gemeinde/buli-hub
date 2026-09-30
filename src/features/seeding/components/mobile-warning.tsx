"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

// The seeding workspace is `min-w-[1520px]` by design (it scrolls sideways
// inside its frame on a narrower window): seeding is a live staff meeting
// driven from one large, shared screen. On a small viewport we say so
// plainly rather than let someone fight an unusable layout. Non-blocking; the
// acknowledgement is remembered for the browser session so navigation within
// seeding does not re-nag.
//
// A plain fixed overlay rather than the shared Dialog: a `fixed inset-0` flex
// container pins to the viewport and centres on the visible screen whatever
// the wide workspace behind it does.
const BREAKPOINT = "(max-width: 1023px)";
const ACK_KEY = "seeding-mobile-ack";

export function MobileWarning() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(ACK_KEY) === "1") {
      return;
    }
    if (window.matchMedia(BREAKPOINT).matches) {
      setOpen(true);
    }
  }, []);

  const acknowledge = useCallback(() => {
    sessionStorage.setItem(ACK_KEY, "1");
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        acknowledge();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, acknowledge]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 supports-backdrop-filter:backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="seeding-mobile-title"
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl bg-popover p-5 text-popover-foreground text-sm ring-1 ring-foreground/10"
      >
        <div className="flex flex-col gap-2">
          <h2
            id="seeding-mobile-title"
            className="font-heading font-medium text-base leading-none"
          >
            Für große Bildschirme gemacht
          </h2>
          <p className="text-muted-foreground text-sm">
            Die Divisionseinteilung ist für große Bildschirme ausgelegt und wird
            üblicherweise von einer Person geteilt (Discord-Stream), während das
            Team gemeinsam bespricht. Auf diesem Gerät ist die Seite nur
            eingeschränkt nutzbar.
          </p>
        </div>
        <div className="flex justify-end">
          <Button type="button" onClick={acknowledge}>
            Verstanden
          </Button>
        </div>
      </div>
    </div>
  );
}
