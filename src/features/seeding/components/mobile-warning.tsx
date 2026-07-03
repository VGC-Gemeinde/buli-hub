"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// The seeding page is `min-w-[1520px]` by design: seeding is a live staff
// meeting driven from one large, shared screen. On a small viewport we say so
// plainly rather than let someone fight an unusable layout. Non-blocking; the
// acknowledgement is remembered for the browser session so navigation within
// seeding does not re-nag.
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

  function acknowledge() {
    sessionStorage.setItem(ACK_KEY, "1");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && acknowledge()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Für große Bildschirme gemacht</DialogTitle>
          <DialogDescription>
            Die Divisionseinteilung ist für große Bildschirme ausgelegt und wird
            üblicherweise von einer Person geteilt (Discord-Stream), während das
            Team gemeinsam bespricht. Auf diesem Gerät ist die Seite nur
            eingeschränkt nutzbar.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" onClick={acknowledge}>
            Verstanden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
