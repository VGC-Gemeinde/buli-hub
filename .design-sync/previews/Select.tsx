import {
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "buli-hub";

/* Radix renders the listbox in a portal, so a closed Select shows nothing but
 * its trigger — `defaultOpen` is the static equivalent of a click. The config
 * gives this component `cardMode:"single"` (viewport 520x420), so the FIRST
 * export below is the one the product card shows; keep the open composition
 * first. The item list is the profile settings form's „Herkunft" field
 * (`features/profile/regions.ts`), shortened so the open list fits the card.
 *
 * `position="popper"` instead of the app's default `item-aligned`: item-aligned
 * centres the listbox OVER the trigger, which in a static card hides the very
 * trigger the card is documenting. Popper drops it below, so trigger, label
 * and open list are all visible at once. */

export function HerkunftOffen() {
  return (
    <div className="grid w-full max-w-[340px] gap-2">
      <Label htmlFor="select-origin">Herkunft</Label>
      <Select defaultOpen defaultValue="Bayern">
        <SelectTrigger
          id="select-origin"
          className="w-full data-[size=default]:h-[38px]"
        >
          <SelectValue placeholder="Bitte wählen" />
        </SelectTrigger>
        <SelectContent position="popper" align="start">
          <SelectItem value="__none__">Keine Angabe</SelectItem>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Bundesländer</SelectLabel>
            <SelectItem value="Bayern">Bayern</SelectItem>
            <SelectItem value="Berlin">Berlin</SelectItem>
            <SelectItem value="Hamburg">Hamburg</SelectItem>
            <SelectItem value="Nordrhein-Westfalen">
              Nordrhein-Westfalen
            </SelectItem>
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Weitere Länder</SelectLabel>
            <SelectItem value="Österreich">Österreich</SelectItem>
            <SelectItem value="Schweiz">Schweiz</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

export function TriggerZustaende() {
  return (
    <div className="grid w-full max-w-[340px] gap-4">
      <div className="grid gap-2">
        <Label htmlFor="select-empty">Spieler</Label>
        <Select>
          <SelectTrigger id="select-empty" className="w-full">
            <SelectValue placeholder="Spieler wählen …" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Testerino — Division 1a</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="select-filled">Staff-Mitglied</Label>
        <Select defaultValue="annegret">
          <SelectTrigger id="select-filled" className="w-full">
            <SelectValue placeholder="Staff-Mitglied wählen …" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="annegret">annegret</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="select-sm">Division</Label>
        <Select defaultValue="1a">
          <SelectTrigger id="select-sm" size="sm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1a">Division 1a</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="select-disabled">Herkunft</Label>
        <Select disabled defaultValue="Schweiz">
          <SelectTrigger id="select-disabled" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Schweiz">Schweiz</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
