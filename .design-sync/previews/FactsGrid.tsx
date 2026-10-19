import { FactsGrid } from "buli-hub";
import type { Fact } from "@/features/regelwerk/content/types";

/* "Auf einen Blick" at the top of the Regelwerk: the six facts players look
 * up without reading the document. Exactly one tile is emphasised, the season
 * start every other date hangs off. Values are Saison 9's. */

const FACTS: Fact[] = [
  { label: "Anmeldeschluss", value: "30.08.2026", kind: "date" },
  { label: "Saisonstart", value: "07.09.2026", kind: "date" },
  { label: "Dauer", value: "10-12 Wochen", kind: "large" },
  { label: "Format", value: "Aktuelle Regulation\nBo3 · OTS", kind: "text" },
  { label: "Spielplan", value: "Single Round Robin", kind: "text" },
  { label: "Gruppengröße", value: "max. 10 Spieler", kind: "text" },
];

export function AufEinenBlick() {
  return (
    <div className="max-w-3xl">
      <FactsGrid facts={FACTS} emphasisIndex={1} />
    </div>
  );
}

/* At phone width the grid stays two across. */
export function Schmal() {
  return (
    <div className="max-w-sm">
      <FactsGrid facts={FACTS} emphasisIndex={1} />
    </div>
  );
}
