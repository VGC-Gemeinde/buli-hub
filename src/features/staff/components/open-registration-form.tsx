"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OpenRegistrationDialog } from "./open-registration-dialog";

// The not_started action: pick an end date, then confirm in the dialog. The
// date lives here (not in the dialog) so the confirmation step is purely a
// safety gate. The dialog never opens with an empty or past date.
export function OpenRegistrationForm() {
  const [closesAtLocal, setClosesAtLocal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function tryOpen() {
    if (!closesAtLocal) {
      setError("Bitte ein Enddatum wählen");
      return;
    }
    if (new Date(closesAtLocal).getTime() <= Date.now()) {
      setError("Das Enddatum muss in der Zukunft liegen");
      return;
    }
    setError(null);
    setDialogOpen(true);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-3">
        <div className="grid gap-2">
          <Label htmlFor="closes-at">Anmeldeschluss</Label>
          <Input
            id="closes-at"
            type="datetime-local"
            className="h-8 w-[200px]"
            value={closesAtLocal}
            onChange={(event) => setClosesAtLocal(event.target.value)}
          />
        </div>
        <Button type="button" onClick={tryOpen}>
          Anmeldung öffnen
        </Button>
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <OpenRegistrationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        closesAtLocal={closesAtLocal}
      />
    </div>
  );
}
