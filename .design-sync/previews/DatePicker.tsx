import { DatePicker, Label } from "buli-hub";

/* Value is an ISO day string (YYYY-MM-DD); the label is always rendered
 * DD.MM.YYYY through the German date-fns locale, independent of the browser.
 *
 * The popover is NOT openable from props — the component owns its `open`
 * state (`useState(false)`) and exposes no `defaultOpen`. These cards
 * therefore show the trigger's states; the open panel is on the `Calendar`
 * card, which is exactly what the popover renders. */

const noop = () => {};

/** The canonical resting state: a day is picked. */
export function Spieltermin() {
  return <DatePicker value="2026-07-27" onChange={noop} />;
}

/** Nothing picked yet — muted „Datum wählen" placeholder. */
export function OhneAuswahl() {
  return <DatePicker value="" onChange={noop} />;
}

/** `formatStr` re-formats the label; the German locale supplies the names. */
export function LangesDatumsformat() {
  return (
    <DatePicker
      value="2026-07-27"
      onChange={noop}
      formatStr="EEEE, d. MMMM yyyy"
    />
  );
}

/** How staff meet it: two labelled fields bounding a Spieltag. */
export function ImSpieltagsFormular() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="spieltag-start">Spieltag beginnt</Label>
        <DatePicker
          id="spieltag-start"
          value="2026-07-20"
          onChange={noop}
          className="w-[190px]"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="spieltag-ende">Spieltag endet</Label>
        <DatePicker
          id="spieltag-ende"
          value="2026-07-26"
          onChange={noop}
          disabledBefore="2026-07-20"
          className="w-[190px]"
        />
        <p className="text-[13px] text-muted-foreground">
          Frühere Tage sind gesperrt — der Spieltag kann nicht vor seinem Start
          enden.
        </p>
      </div>
    </div>
  );
}
