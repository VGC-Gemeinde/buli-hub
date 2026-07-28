import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tick,
} from "buli-hub";
import { Info } from "lucide-react";

/* Radix portals the panel, so a closed popover renders nothing — `defaultOpen`
 * is the static stand-in for a click on the trigger. cfg.overrides gives this
 * component cardMode:"single" so the panel paints inside the card.
 *
 * PopoverContent ships with `p-0` on purpose (the DatePicker drops a full
 * Calendar into it), so every composition supplies its own padding.
 *
 * Single-mode cards show ONE export, and the harness enumerates exports in
 * esbuild's alphabetical order — not source order. Without a cfg
 * `primaryStory` the first name alphabetically wins, so the canonical cell is
 * named to sort first (Erklaerung < Rueckfrage < Spieltagswahl). */

export function Erklaerung() {
  return (
    <div className="flex justify-start pl-2">
      <Popover defaultOpen>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-medium text-sm data-[state=open]:bg-secondary"
          >
            <Info className="size-3.5 text-muted-foreground" />
            Wie wird gewertet?
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={6} className="w-[320px]">
          <div className="flex flex-col gap-2 px-4 py-3.5">
            <div className="flex items-center gap-2">
              <Tick size="s" />
              <span className="font-semibold text-[12.5px] uppercase tracking-[0.14em] text-muted-foreground">
                Wertung
              </span>
            </div>
            <p className="text-[13.5px] text-muted-foreground leading-relaxed">
              Ein Sieg zählt 3 Punkte, eine Niederlage 0. Bei Punktgleichstand
              entscheidet zuerst das direkte Duell, danach das Spielverhältnis.
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function Spieltagswahl() {
  const days = [
    ["Spieltag 1", "05.01. – 11.01.", "abgeschlossen"],
    ["Spieltag 2", "12.01. – 18.01.", "läuft"],
    ["Spieltag 3", "19.01. – 25.01.", "geplant"],
  ];

  return (
    <div className="flex justify-start pl-2">
      <Popover defaultOpen>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9 font-normal">
            Spieltag 2
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={6} className="w-[320px]">
          <div className="flex flex-col p-1">
            {days.map(([label, span, state]) => (
              <div
                key={label}
                className={`flex items-center justify-between rounded-md px-2.5 py-2 text-sm ${
                  state === "läuft" ? "bg-secondary" : ""
                }`}
              >
                <span className="flex flex-col">
                  <span className="font-medium">{label}</span>
                  <span className="text-[12.5px] text-muted-foreground">
                    {span}
                  </span>
                </span>
                <span className="text-[12.5px] text-muted-foreground">
                  {state}
                </span>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function Rueckfrage() {
  return (
    <div className="flex justify-start pl-2">
      <Popover defaultOpen>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9 font-normal">
            Anmeldung zurückziehen
          </Button>
        </PopoverTrigger>
        {/* Radix focuses the first control on open; suppressed so the card
            shows the resting state instead of a focus ring on „Abbrechen". */}
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-[320px]"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className="flex flex-col gap-3 px-4 py-3.5">
            <p className="font-semibold text-sm">
              Anmeldung wirklich zurückziehen?
            </p>
            <p className="text-[13.5px] text-muted-foreground leading-relaxed">
              Du wirst aus dem Teilnehmerfeld für Saison 1 entfernt. Solange die
              Anmeldung läuft, kannst du dich erneut eintragen.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm">
                Abbrechen
              </Button>
              <Button variant="destructive" size="sm">
                Zurückziehen
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
