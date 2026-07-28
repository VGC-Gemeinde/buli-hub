import { Badge, Checkbox, Label } from "buli-hub";

/* A bare checkbox is a 16px square and says nothing, so every cell gives it
 * the context it has in the app: the seeding sheet's row selection
 * (`features/seeding/components/sheet-rows.tsx`, `size-[15px]`, selected rows
 * tinted brand-orange) and label/description settings rows. */

const SHEET_ROWS = [
  { name: "Testerino", group: "Division 1a", selected: true },
  { name: "annegret", group: "Division 1a", selected: true },
  { name: "Blaubeerkuchen", group: "Division 1b", selected: false },
  {
    name: "Yannick mit sehr langem Namen",
    group: "Division 2a",
    selected: false,
  },
];

export function SeedingAuswahl() {
  return (
    <div className="w-full max-w-[440px] overflow-hidden rounded-lg border">
      <div className="flex items-center gap-3 border-b bg-muted/40 px-4 py-2">
        <Checkbox
          id="sheet-all"
          checked="indeterminate"
          className="size-[15px]"
        />
        <Label
          htmlFor="sheet-all"
          className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.12em]"
        >
          2 von 4 ausgewählt
        </Label>
      </div>
      {SHEET_ROWS.map((row) => (
        <div
          key={row.name}
          className={
            row.selected
              ? "flex items-center gap-3 border-b border-border/60 bg-brand-orange/5 px-4 py-2.5"
              : "flex items-center gap-3 border-b border-border/60 px-4 py-2.5"
          }
        >
          <Checkbox
            id={`sheet-${row.name}`}
            checked={row.selected}
            className="size-[15px]"
          />
          <Label
            htmlFor={`sheet-${row.name}`}
            className="min-w-0 flex-1 cursor-pointer font-medium text-sm"
          >
            <span className="truncate">{row.name}</span>
          </Label>
          <Badge variant="outline">{row.group}</Badge>
        </div>
      ))}
    </div>
  );
}

export function Einstellungszeilen() {
  return (
    <div className="grid w-full max-w-[440px] gap-4">
      <div className="flex items-start gap-3">
        <Checkbox id="opt-proof" defaultChecked className="mt-0.5" />
        <div className="grid gap-1">
          <Label htmlFor="opt-proof" className="cursor-pointer">
            Replay-Pflicht
          </Label>
          <p className="text-[13px] text-muted-foreground leading-snug">
            Für jedes Spiel dieser Division wird ein Replay-Link gebraucht.
          </p>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <Checkbox id="opt-capture" className="mt-0.5" />
        <div className="grid gap-1">
          <Label htmlFor="opt-capture" className="cursor-pointer">
            Capture Card
          </Label>
          <p className="text-[13px] text-muted-foreground leading-snug">
            Du besitzt eine Capture Card, um Gameplay aufzunehmen.
          </p>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <Checkbox id="opt-motw" disabled className="mt-0.5" />
        <div className="grid gap-1">
          <Label htmlFor="opt-motw">Als Match of the Week vorschlagen</Label>
          <p className="text-[13px] text-muted-foreground leading-snug">
            Erst wählbar, sobald beide Teamsheets hinterlegt sind.
          </p>
        </div>
      </div>
    </div>
  );
}

export function Zustaende() {
  return (
    <div className="grid w-full max-w-[440px] gap-4">
      <div className="flex items-center gap-2">
        <Checkbox id="cb-off" />
        <Label htmlFor="cb-off">Nicht ausgewählt</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="cb-on" defaultChecked />
        <Label htmlFor="cb-on">Ausgewählt</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="cb-mixed" checked="indeterminate" />
        <Label htmlFor="cb-mixed">Teilweise ausgewählt</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="cb-disabled" disabled />
        <Label htmlFor="cb-disabled">Deaktiviert (Beobachter-Modus)</Label>
      </div>
      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <Checkbox id="cb-invalid" aria-invalid />
          <Label htmlFor="cb-invalid">Regeln gelesen und akzeptiert</Label>
        </div>
        <p className="text-destructive text-sm">
          Ohne Zustimmung können wir dich nicht anmelden.
        </p>
      </div>
    </div>
  );
}
