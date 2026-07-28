import { DateTimePicker, Label } from "buli-hub";

/* DatePicker + TimePicker as one field, producing a datetime-local string
 * (YYYY-MM-DDTHH:mm). Both halves share the same outline-button anatomy and
 * German formatting; neither popover can be opened from props (no
 * `defaultOpen`), so the cards show the pair at rest. */

const noop = () => {};

/** The canonical state: a scheduled match, 20.07.2026 · 18:00 Uhr. */
export function Spieltermin() {
  return <DateTimePicker value="2026-07-20T18:00" onChange={noop} />;
}

/** Unset: „Datum wählen" plus the 18:00 default the component falls back to. */
export function OhneTermin() {
  return <DateTimePicker value="" onChange={noop} />;
}

/** Where staff actually meet it — the registration deadline field. */
export function Anmeldeschluss() {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="anmeldeschluss">Anmeldeschluss</Label>
      <DateTimePicker
        id="anmeldeschluss"
        value="2026-08-02T23:59"
        onChange={noop}
        disabledBefore="2026-07-27"
      />
      <p className="text-[13px] text-muted-foreground">
        Gilt in deutscher Zeit (Europe/Berlin) — für alle Spieler derselbe
        Zeitpunkt.
      </p>
    </div>
  );
}
