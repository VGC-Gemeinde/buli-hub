import { StaffSteps } from "buli-hub";

/* The four steps of Relegation und Playoffs on their staff page: done ones
 * checked in navy, the next one orange, later ones muted. Read-only. Ported
 * from the dev/ui gallery (before creating · after publishing · completed). */

export function NachDemVeroeffentlichen() {
  return (
    <div className="max-w-3xl">
      <StaffSteps current={2} />
    </div>
  );
}

export function VorDemErstellen() {
  return (
    <div className="max-w-3xl">
      <StaffSteps current={0} />
    </div>
  );
}

export function ZumVeroeffentlichen() {
  return (
    <div className="max-w-3xl">
      <StaffSteps current={1} />
    </div>
  );
}

export function SaisonAbgeschlossen() {
  return (
    <div className="max-w-3xl">
      <StaffSteps current={4} />
    </div>
  );
}
