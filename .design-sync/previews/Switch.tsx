import { Label, Switch } from "buli-hub";

/* Two real shapes: the profile settings row (label + 13px description on the
 * left, switch right, separated by a `border-t`) and the public overview's
 * spoiler switch, which keeps the default 32×18 track but recolours the
 * checked state to falinks-blue.
 *
 * NOTE: settings-form.tsx resizes its switch to 40×22 with an inline
 * `h-[22px] w-[40px] … translate-x-[18px]!` override. That override LOSES to
 * the component's own `data-[size=default]:w-[32px]` (a data-attribute
 * variant outranks a plain utility), so the 18px thumb ends up outside the
 * 32px track. The cells below use the unmodified component instead — see the
 * learnings file. */

export function Einstellungszeile() {
  return (
    <div className="grid w-full max-w-[440px] gap-5">
      <div className="flex items-center justify-between gap-4 border-t pt-5">
        <div className="grid gap-1">
          <Label htmlFor="sw-capture">Capture Card</Label>
          <p className="text-[13px] text-muted-foreground leading-snug">
            Du besitzt eine Capture Card, um Gameplay aufzunehmen.
          </p>
        </div>
        <Switch id="sw-capture" defaultChecked />
      </div>
      <div className="flex items-center justify-between gap-4 border-t pt-5">
        <div className="grid gap-1">
          <Label htmlFor="sw-notify">Erinnerung per Discord-DM</Label>
          <p className="text-[13px] text-muted-foreground leading-snug">
            Wir schreiben dir, wenn ein Spieltag zu Ende geht und dein Ergebnis
            noch fehlt.
          </p>
        </div>
        <Switch id="sw-notify" />
      </div>
    </div>
  );
}

export function SpoilerSchutz() {
  return (
    <div className="grid w-full max-w-[440px] gap-5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-[28px] text-brand-blue leading-none dark:text-white">
          Division 1a
        </span>
        <div className="flex items-center gap-2">
          <Switch
            id="sw-spoiler-on"
            defaultChecked
            className="data-checked:bg-brand-blue dark:data-checked:bg-white"
          />
          <Label
            htmlFor="sw-spoiler-on"
            className="cursor-pointer whitespace-nowrap font-semibold text-[13.5px] text-brand-blue dark:text-white"
          >
            Spoiler-Schutz
          </Label>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="sw-spoiler-off"
          className="data-checked:bg-brand-blue dark:data-checked:bg-white"
        />
        <Label
          htmlFor="sw-spoiler-off"
          className="cursor-pointer whitespace-nowrap font-semibold text-[13.5px] text-muted-foreground"
        >
          Spoiler-Schutz aus — alle Ergebnisse sichtbar
        </Label>
      </div>
    </div>
  );
}

export function Zustaende() {
  return (
    <div className="grid w-full max-w-[440px] gap-4">
      <div className="flex items-center gap-2">
        <Switch id="sw-on" defaultChecked />
        <Label htmlFor="sw-on">Standard · an</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="sw-off" />
        <Label htmlFor="sw-off">Standard · aus</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="sw-sm-on" size="sm" defaultChecked />
        <Label htmlFor="sw-sm-on">Klein · an</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="sw-sm-off" size="sm" />
        <Label htmlFor="sw-sm-off">Klein · aus</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="sw-disabled" defaultChecked disabled />
        <Label htmlFor="sw-disabled">Deaktiviert (Saison abgeschlossen)</Label>
      </div>
    </div>
  );
}
