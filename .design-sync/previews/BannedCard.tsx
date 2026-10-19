import { BannedCard } from "buli-hub";

/* What a banned player sees where the registration would be (/anmeldung,
 * /spieler). Informational: there is nothing to do here, and the reason stays
 * with staff, so the card only says that and whom to ask. */

export function AnmeldungGesperrt() {
  return (
    <div className="w-full max-w-xl">
      <BannedCard />
    </div>
  );
}

export function SchmaleAnsicht() {
  return (
    <div className="w-80">
      <BannedCard />
    </div>
  );
}
