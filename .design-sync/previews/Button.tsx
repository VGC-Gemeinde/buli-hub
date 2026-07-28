import { Button } from "buli-hub";

/* Primary is pawmo-orange in BOTH light and dark (DESIGN.md §1) — the default
 * variant is the CTA, and falinks-blue stays structural. Labels are the app's
 * real German copy. */

export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button>Mit Discord anmelden</Button>
      <Button variant="outline">Abbrechen</Button>
      <Button variant="secondary">Spielplan ansehen</Button>
      <Button variant="ghost">Mehr anzeigen</Button>
      <Button variant="destructive">Anmeldung zurückziehen</Button>
      <Button variant="link">Zum Match</Button>
    </div>
  );
}

export function Sizes() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="xs">XS</Button>
      <Button size="sm">Klein</Button>
      <Button size="default">Ergebnis melden</Button>
      <Button size="lg">Jetzt anmelden</Button>
    </div>
  );
}

export function States() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button>Normal</Button>
      <Button disabled>Deaktiviert</Button>
      <Button variant="outline" disabled>
        Deaktiviert (outline)
      </Button>
    </div>
  );
}
