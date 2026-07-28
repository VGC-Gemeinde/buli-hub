import { RadioGroup, RadioGroupItem } from "buli-hub";

/* The app never shows a naked radio row: the item sits inside a clickable
 * bordered card whose border and tint switch to brand-orange via
 * `has-data-[state=checked]:` — see the registration form's platform picker
 * and the report form's „Wo habt ihr gespielt?" block. `defaultValue` makes
 * the selected state render statically. */

export function Plattformwahl() {
  return (
    <div className="grid w-full max-w-[560px] gap-2">
      <span className="font-medium text-sm">Präferierte Plattform</span>
      <RadioGroup className="grid grid-cols-2 gap-2" defaultValue="showdown">
        {[
          { value: "showdown", label: "Pokémon Showdown" },
          { value: "cartridge", label: "Cartridge (Pokémon Champions)" },
        ].map((option) => (
          // biome-ignore lint/a11y/noLabelWithoutControl: the RadioGroupItem is the control
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 px-3.5 has-data-[state=checked]:border-brand-orange has-data-[state=checked]:bg-brand-orange/5"
          >
            <RadioGroupItem value={option.value} />
            <span className="font-medium text-sm">{option.label}</span>
          </label>
        ))}
      </RadioGroup>
      <p className="text-[13px] text-muted-foreground leading-snug">
        Beim Seeding versuchen wir, dich mit Spielern derselben Präferenz in
        eine Division einzuteilen.
      </p>
    </div>
  );
}

export function MitBeschreibung() {
  return (
    <div className="grid w-full max-w-[440px] gap-3">
      <span className="font-semibold text-brand-blue text-sm dark:text-white">
        Wo habt ihr gespielt?
      </span>
      <RadioGroup className="grid grid-cols-1 gap-3" defaultValue="cartridge">
        {[
          {
            value: "showdown",
            title: "Pokémon Showdown",
            note: "Für jedes Spiel wird ein Replay-Link gebraucht.",
          },
          {
            value: "cartridge",
            title: "Cartridge",
            note: "Auf der Konsole gespielt — Video-Link erforderlich.",
          },
        ].map((option) => (
          // biome-ignore lint/a11y/noLabelWithoutControl: the RadioGroupItem is the control
          <label
            key={option.value}
            className="flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 px-4 text-left has-data-[state=checked]:border-brand-orange has-data-[state=checked]:bg-brand-orange/6"
          >
            <RadioGroupItem value={option.value} className="mt-0.5" />
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold text-brand-blue text-sm dark:text-white">
                {option.title}
              </span>
              <span className="text-[12.5px] text-muted-foreground leading-snug">
                {option.note}
              </span>
            </span>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}

export function Schlicht() {
  return (
    <div className="grid w-full max-w-[440px] gap-5">
      <div className="grid gap-2">
        <span className="font-medium text-sm">
          Hast du schon einmal teilgenommen?
        </span>
        <RadioGroup defaultValue="ja">
          {[
            { value: "ja", label: "Ja, ich bin Rückkehrer" },
            { value: "nein", label: "Nein, ich bin neu dabei" },
          ].map((option) => (
            // biome-ignore lint/a11y/noLabelWithoutControl: the RadioGroupItem is the control
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2.5"
            >
              <RadioGroupItem value={option.value} />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </RadioGroup>
      </div>
      <div className="grid gap-2">
        <span className="font-medium text-sm">
          Sichtbarkeit{" "}
          <span className="font-normal text-muted-foreground">
            (nur vom Staff änderbar)
          </span>
        </span>
        <RadioGroup defaultValue="oeffentlich" disabled>
          {[
            { value: "oeffentlich", label: "Öffentlich" },
            { value: "intern", label: "Nur für den Staff" },
          ].map((option) => (
            // biome-ignore lint/a11y/noLabelWithoutControl: the RadioGroupItem is the control
            <label
              key={option.value}
              className="flex items-center gap-2.5 opacity-60"
            >
              <RadioGroupItem value={option.value} />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}
