import { FieldError, Input, Label } from "buli-hub";

/* The message under an invalid form control: it takes the slot of the muted
 * hint, so the field changes colour without jumping. Ported from the dev/ui
 * gallery's "Formularfehler" specimen and the registration form. */

export function AnmeldeFelder() {
  return (
    <div className="flex max-w-sm flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="ds-division">Division</Label>
        <Input
          id="ds-division"
          defaultValue="3b"
          aria-invalid
          aria-describedby="ds-division-error"
        />
        <FieldError
          id="ds-division-error"
          message="Bitte nur Ziffern eingeben, zum Beispiel 3"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ds-season">Letzte Saison</Label>
        <Input
          id="ds-season"
          defaultValue=""
          aria-invalid
          aria-describedby="ds-season-error"
        />
        <FieldError id="ds-season-error" message="Pflichtfeld" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ds-placement">Platzierung</Label>
        <Input
          id="ds-placement"
          defaultValue="0"
          aria-invalid
          aria-describedby="ds-placement-error"
        />
        <FieldError id="ds-placement-error" message="Mindestens 1" />
      </div>
    </div>
  );
}

export function HinweisUndFehler() {
  return (
    <div className="grid max-w-sm grid-cols-2 gap-6">
      <div className="grid gap-2">
        <Label htmlFor="ds-showdown-ok">Showdown-Name</Label>
        <Input id="ds-showdown-ok" defaultValue="blaubeerkuchen" />
        <p className="text-[13px] text-muted-foreground leading-snug">
          So wie er in Showdown erscheint.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ds-showdown-bad">Showdown-Name</Label>
        <Input
          id="ds-showdown-bad"
          defaultValue=""
          aria-invalid
          aria-describedby="ds-showdown-error"
        />
        <FieldError id="ds-showdown-error" message="Pflichtfeld" />
      </div>
    </div>
  );
}

export function LangeMeldung() {
  return (
    <div className="grid max-w-sm gap-2">
      <Label htmlFor="ds-paste">Teamsheet</Label>
      <Input
        id="ds-paste"
        defaultValue="https://pokepast.es/3f2a"
        aria-invalid
        aria-describedby="ds-paste-error"
      />
      <FieldError
        id="ds-paste-error"
        message="Der Paste ist kein vollständiges Open Teamsheet: Bei Amoonguss fehlt das Item."
      />
    </div>
  );
}
