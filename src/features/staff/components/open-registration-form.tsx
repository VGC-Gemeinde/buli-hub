"use client";

import { useState } from "react";
import { DateTimePicker } from "@/components/date-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MIN_SEASON_NUMBER } from "../registration-window";
import { OpenRegistrationDialog } from "./open-registration-dialog";

// The not_started action: pick the season number (set once, for the first
// season on the system — later seasons auto-increment) and an end date, then
// confirm in the dialog. Values live here so the confirmation step is a pure
// safety gate; the dialog never opens with invalid input.
export function OpenRegistrationForm() {
  const [seasonNumber, setSeasonNumber] = useState("");
  const [closesAtLocal, setClosesAtLocal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function tryOpen() {
    const n = Number(seasonNumber);
    if (!Number.isInteger(n) || n < MIN_SEASON_NUMBER) {
      setError("Bitte eine gültige Saisonnummer angeben");
      return;
    }
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
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-2">
          <Label htmlFor="season-number">Saisonnummer</Label>
          <Input
            id="season-number"
            type="number"
            min={MIN_SEASON_NUMBER}
            placeholder="z. B. 9"
            value={seasonNumber}
            onChange={(e) => setSeasonNumber(e.target.value)}
            className="w-28"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="closes-at">Anmeldeschluss</Label>
          <DateTimePicker
            id="closes-at"
            value={closesAtLocal}
            onChange={setClosesAtLocal}
          />
        </div>
        <Button type="button" onClick={tryOpen}>
          Anmeldung öffnen
        </Button>
      </div>
      <p className="text-[12.5px] text-muted-foreground">
        Die Nummer wird einmalig gesetzt — künftige Saisons zählen automatisch
        hoch.
      </p>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <OpenRegistrationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        seasonNumber={seasonNumber}
        closesAtLocal={closesAtLocal}
      />
    </div>
  );
}
