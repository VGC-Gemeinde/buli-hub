import { FilterChip } from "buli-hub";
import { useState } from "react";

/* A toggle chip in a filter row of the staff workspaces: orange when active.
 * Ported from the division filter of the MotW workspace (motw-manager.tsx),
 * with the "Alle" chip and the thin divider before the divisions. */

const TIERS = ["Division 1", "Division 2", "Division 3", "Division 4"];

function DivisionRow({ initial }: { initial: string[] }) {
  const [selected, setSelected] = useState(new Set(initial));
  const all = selected.size === TIERS.length;
  const toggle = (tier: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(tier)) {
        next.delete(tier);
      } else {
        next.add(tier);
      }
      return next;
    });
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <FilterChip
        active={all}
        title={all ? "Auswahl aufheben" : "Alle Divisionen auswählen"}
        onClick={() => setSelected(all ? new Set() : new Set(TIERS))}
      >
        Alle
      </FilterChip>
      <span aria-hidden className="mx-0.5 h-4 w-px bg-border" />
      {TIERS.map((tier) => (
        <FilterChip
          key={tier}
          active={selected.has(tier)}
          onClick={() => toggle(tier)}
        >
          {tier}
        </FilterChip>
      ))}
    </div>
  );
}

export function Divisionen() {
  return <DivisionRow initial={["Division 1", "Division 3"]} />;
}

export function DivisionenAlle() {
  return <DivisionRow initial={TIERS} />;
}

export function DivisionenKeine() {
  return <DivisionRow initial={[]} />;
}

export function Schalter() {
  const [on, setOn] = useState(true);
  return (
    <div className="flex items-center gap-2">
      <FilterChip
        active={on}
        onClick={() => setOn((v) => !v)}
        title="2 Matches ohne Capture Card auf beiden Seiten"
      >
        Nur aufnehmbar
      </FilterChip>
      <FilterChip active={false} onClick={() => {}}>
        Nur offene
      </FilterChip>
    </div>
  );
}
