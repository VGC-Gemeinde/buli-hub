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
import { Textarea } from "@/components/ui/textarea";
import { validateTeamsheet } from "../actions";
import type { AcceptedSheet } from "../field-state";

// Pasting a team straight out of Showdown. This is the route that always
// works: no third-party service in the way, and validation is instant because
// the text is already here. It is also where the rules get explained, since
// this is where someone lands when a link was rejected.

export function ImportDialog({
  open,
  onOpenChange,
  label,
  initialText,
  onAccept,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Whose team is being imported, for the dialog title.
  label: string;
  // Prefill, for editing a sheet that is already stored.
  initialText?: string;
  onAccept: (accepted: AcceptedSheet) => void;
}) {
  const [text, setText] = useState(initialText ?? "");
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  // Reopening on a different sheet must not show the previous one.
  useEffect(() => {
    if (open) {
      setText(initialText ?? "");
      setError(null);
      setDetails([]);
    }
  }, [open, initialText]);

  const submit = async () => {
    setPending(true);
    setError(null);
    setDetails([]);
    const result = await validateTeamsheet(text);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      setDetails(result.details ?? []);
      return;
    }
    onAccept({ source: result.source, ots: result.ots, icons: result.icons });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Team importieren</DialogTitle>
          <DialogDescription>
            {label}. In Showdown im Teambuilder auf dein Team klicken, dann auf
            "Import/Export" und den kompletten Text kopieren. Hier einfügen, den
            Rest machen wir.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={14}
          spellCheck={false}
          placeholder={
            "Garchomp @ Life Orb\nAbility: Rough Skin\nJolly Nature\n- Earthquake\n- Dragon Claw\n- Rock Slide\n- Protect\n\n…"
          }
          className="max-h-[42svh] resize-y font-mono text-[12.5px] leading-relaxed"
        />

        <p className="text-[12.5px] text-muted-foreground leading-relaxed">
          Gebraucht werden alle 6 Pokémon mit Fähigkeit, Wesen und Attacken. Die
          Werte kannst du drin lassen, wir entfernen sie und speichern sie
          nicht.
        </p>

        {error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3.5 py-3">
            <p className="font-semibold text-[13px] text-destructive">
              {error}
            </p>
            {details.length > 0 ? (
              <ul className="mt-1.5 flex flex-col gap-0.5 text-[12.5px] text-destructive/90">
                {details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={submit} disabled={pending || text.trim() === ""}>
            {pending ? "Wird geprüft" : "Team übernehmen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
