import { UsageCards } from "buli-hub";

/* The headline numbers at the top of /staff/nutzung, in the page's own order:
 * today's page loads, then people today, this week, this month. */

export function Kennzahlen() {
  return (
    <UsageCards
      cards={[
        { label: "Heute", value: 214, unit: "Aufrufe" },
        { label: "Heute", value: 68, unit: "Personen" },
        { label: "Diese Woche", value: 131, unit: "Personen" },
        { label: "Dieser Monat", value: 1204, unit: "Personen" },
      ]}
    />
  );
}

/* Saisonstart: the busiest stretch, four-digit figures. */
export function Saisonstart() {
  return (
    <UsageCards
      cards={[
        { label: "Heute", value: 2418, unit: "Aufrufe" },
        { label: "Heute", value: 187, unit: "Personen" },
        { label: "Diese Woche", value: 412, unit: "Personen" },
        { label: "Dieser Monat", value: 1906, unit: "Personen" },
      ]}
    />
  );
}

/* Shortly after midnight: nothing counted yet today. */
export function KurzNachMitternacht() {
  return (
    <UsageCards
      cards={[
        { label: "Heute", value: 0, unit: "Aufrufe" },
        { label: "Heute", value: 0, unit: "Personen" },
        { label: "Diese Woche", value: 131, unit: "Personen" },
        { label: "Dieser Monat", value: 1204, unit: "Personen" },
      ]}
    />
  );
}
