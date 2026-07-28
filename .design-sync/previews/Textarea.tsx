import { Label, Textarea } from "buli-hub";

/* Two real homes in the app: the dispute dialog („Was stimmt nicht?", rows=4)
 * and the registration form's optional achievements field. The control is
 * `field-sizing-content`, so a filled cell grows past `min-h-16` on its own. */

export function Anfechtungsgrund() {
  return (
    <div className="grid w-full max-w-[440px] gap-2">
      <Label htmlFor="ta-dispute">Was stimmt nicht?</Label>
      <Textarea
        id="ta-dispute"
        rows={4}
        placeholder="Beschreibe, was am gemeldeten Ergebnis falsch ist."
      />
      <p className="text-[13px] text-muted-foreground leading-snug">
        Ein Staff-Mitglied prüft die Meldung. Das Ergebnis zählt vorerst weiter,
        bis der Fall entschieden ist.
      </p>
    </div>
  );
}

export function Ausgefuellt() {
  return (
    <div className="grid w-full max-w-[440px] gap-2">
      <Label htmlFor="ta-achievements">
        Größte VGC-Erfolge{" "}
        <span className="text-muted-foreground">(optional)</span>
      </Label>
      <Textarea
        id="ta-achievements"
        rows={4}
        defaultValue={
          "Top 8 bei den Regionals in Dortmund 2025, davor zweimal Day 2 auf der International in London.\n\nSeit Saison 3 in der VGC Gemeinde, letzte Saison Platz 3 in Division 1a."
        }
      />
      <p className="text-[13px] text-muted-foreground leading-snug">
        Hilft uns beim Seeding und bei Liga-Content — Turniere, Platzierungen,
        Momente, auf die du stolz bist.
      </p>
    </div>
  );
}

export function Zustaende() {
  return (
    <div className="grid w-full max-w-[440px] gap-5">
      <div className="grid gap-2">
        <Label htmlFor="ta-disabled">Notiz zum Fall</Label>
        <Textarea
          id="ta-disabled"
          rows={3}
          defaultValue="Der Fall wurde bereits entschieden — die Notiz ist gesperrt."
          disabled
          readOnly
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ta-invalid">Begründung für den Freewin</Label>
        <Textarea
          id="ta-invalid"
          rows={3}
          defaultValue="Gegner meldet sich nicht"
          aria-invalid
        />
        <p className="text-destructive text-sm">
          Bitte beschreibe ausführlicher, was ihr versucht habt — mindestens 50
          Zeichen.
        </p>
      </div>
    </div>
  );
}
