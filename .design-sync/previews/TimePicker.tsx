import { Label, TimePicker } from "buli-hub";

/* Deliberately not a native `<input type="time">`: that renders in the
 * browser's locale (12-hour AM/PM on an English system) and looks nothing like
 * the DatePicker button next to it. Value is HH:mm, always shown 24-hour with
 * the „Uhr" suffix.
 *
 * Like the DatePicker, the popover list owns its `open` state and has no
 * `defaultOpen` — only the trigger renders statically. */

const noop = () => {};

/** The canonical resting state: a time is picked. */
export function Spielzeit() {
  return <TimePicker value="20:30" onChange={noop} />;
}

/** Nothing picked yet — muted „Uhrzeit" placeholder. */
export function OhneUhrzeit() {
  return <TimePicker value="" onChange={noop} />;
}

/** 23:59 is in the list precisely because it is the classic deadline. */
export function Meldeschluss() {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="meldeschluss">Meldeschluss (deutsche Zeit)</Label>
      <TimePicker
        id="meldeschluss"
        value="23:59"
        onChange={noop}
        className="w-[150px]"
      />
      <p className="text-[13px] text-muted-foreground">
        Halbstunden-Schritte rund um die Uhr, dazu 23:59 — das Ende des
        Spieltags.
      </p>
    </div>
  );
}
