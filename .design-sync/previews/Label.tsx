import { Checkbox, Input, Label, Switch, Textarea } from "buli-hub";

/* Label is meaningless on its own — every cell shows it bound to a real
 * control via `htmlFor`. The app uses three shapes: above a field (settings /
 * registration), to the right of a switch (the spoiler switch in the public
 * overview), and with a muted qualifier inline ("(optional)", "(nur für den
 * Staff sichtbar)"). */

export function UeberDemFeld() {
  return (
    <div className="grid w-full max-w-[440px] gap-5">
      <div className="grid gap-2">
        <Label htmlFor="label-origin">Herkunft</Label>
        <Input
          id="label-origin"
          defaultValue="Nordrhein-Westfalen"
          autoComplete="off"
          className="h-[38px]"
        />
        <p className="text-[13px] text-muted-foreground leading-snug">
          Zeigen wir in Content wie YouTube-Videos oder Twitch-Streams.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="label-reason">Was stimmt nicht?</Label>
        <Textarea
          id="label-reason"
          rows={3}
          placeholder="Beschreibe, was am gemeldeten Ergebnis falsch ist."
        />
      </div>
    </div>
  );
}

export function NebenDerBedienung() {
  return (
    <div className="grid w-full max-w-[440px] gap-5">
      <div className="flex items-center gap-2">
        <Switch
          id="label-spoiler"
          defaultChecked
          className="data-checked:bg-brand-blue dark:data-checked:bg-white"
        />
        <Label
          htmlFor="label-spoiler"
          className="cursor-pointer whitespace-nowrap font-semibold text-[13.5px] text-brand-blue dark:text-white"
        >
          Spoiler-Schutz
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="label-proof" defaultChecked />
        <Label htmlFor="label-proof" className="cursor-pointer">
          Replay-Pflicht in dieser Division
        </Label>
      </div>
      {/* The Checkbox carries Tailwind's `peer` class, so a Label placed after
          it picks up `peer-disabled:` — the disabled control greys its own
          caption without any extra state. */}
      <div className="flex items-center gap-2">
        <Checkbox id="label-motw" disabled />
        <Label htmlFor="label-motw">Als Match of the Week vorschlagen</Label>
      </div>
    </div>
  );
}

export function MitZusatz() {
  return (
    <div className="grid w-full max-w-[440px] gap-5">
      <div className="grid gap-2">
        <Label htmlFor="label-achievements">
          Größte VGC-Erfolge{" "}
          <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="label-achievements"
          placeholder="Turniere, Platzierungen, Momente …"
          autoComplete="off"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="label-drop-reason">
          Grund{" "}
          <span className="font-normal text-muted-foreground">
            (nur für den Staff sichtbar)
          </span>
        </Label>
        <Input id="label-drop-reason" defaultValue="Zeitmangel" autoComplete="off" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="label-confirm">
          Gib{" "}
          <span className="font-semibold text-brand-blue dark:text-white">
            Saison 5
          </span>{" "}
          ein, um zu bestätigen
        </Label>
        <Input id="label-confirm" placeholder="Saison 5" autoComplete="off" />
      </div>
    </div>
  );
}
