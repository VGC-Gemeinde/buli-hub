import { Label, Slider } from "buli-hub";

/* The app has exactly one slider: the registration form's VGC self-rating
 * (0–10, step 1) with the current value read back in falinks-blue above the
 * track. On its own the control is a 4px line, so every cell keeps the label
 * row and the scale caption around it. Always pass `defaultValue` — without
 * it the component falls back to `[min, max]` and renders TWO thumbs. */

export function Selbsteinschaetzung() {
  return (
    <div className="grid w-full max-w-[440px] gap-2">
      <div className="flex items-baseline justify-between">
        <Label htmlFor="skill">Wie schätzt du dein VGC-Niveau ein?</Label>
        <span className="font-semibold text-brand-blue text-sm dark:text-white">
          7/10
        </span>
      </div>
      <Slider id="skill" min={0} max={10} step={1} defaultValue={[7]} />
      <p className="text-[13px] text-muted-foreground leading-snug">
        0 = blutiger Anfänger · 5 = konstanter 4-4-Spieler auf Regionals · 10 =
        VGC-Weltmeister
      </p>
    </div>
  );
}

export function Werte() {
  return (
    <div className="grid w-full max-w-[440px] gap-5">
      {[
        { value: 0, caption: "Blutiger Anfänger" },
        { value: 5, caption: "Konstanter 4-4-Spieler auf Regionals" },
        { value: 10, caption: "VGC-Weltmeister" },
      ].map((row) => (
        <div key={row.value} className="grid gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm">{row.caption}</span>
            <span className="font-semibold text-brand-blue text-sm dark:text-white">
              {row.value}/10
            </span>
          </div>
          <Slider min={0} max={10} step={1} defaultValue={[row.value]} />
        </div>
      ))}
    </div>
  );
}

export function Deaktiviert() {
  return (
    <div className="grid w-full max-w-[440px] gap-2">
      <div className="flex items-baseline justify-between">
        <Label htmlFor="skill-locked">
          VGC-Niveau{" "}
          <span className="font-normal text-muted-foreground">
            (Beobachter-Modus)
          </span>
        </Label>
        <span className="font-semibold text-muted-foreground text-sm">
          4/10
        </span>
      </div>
      <Slider
        id="skill-locked"
        min={0}
        max={10}
        step={1}
        defaultValue={[4]}
        disabled
      />
      <p className="text-[13px] text-muted-foreground leading-snug">
        Die Selbsteinschätzung lässt sich nach dem Anmeldeschluss nicht mehr
        ändern.
      </p>
    </div>
  );
}
