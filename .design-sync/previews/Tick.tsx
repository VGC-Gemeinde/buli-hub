import { Tick } from "buli-hub";

/* The skewed tick is the brand's signature mark (DESIGN.md §4). It is never
 * decoration on its own — it flanks an uppercase label — so every cell shows it
 * in that role rather than as three floating bars. */

export function Sizes() {
  return (
    <div className="flex flex-col gap-5">
      {(
        [
          ["l", "VGC Bundesliga", "text-[22px]"],
          ["m", "Divisionstabelle", "text-[15px]"],
          ["s", "Ausgerichtet von der VGC Gemeinde", "text-[13px]"],
        ] as const
      ).map(([size, label, cls]) => (
        <div className="flex items-center gap-3" key={size}>
          <Tick size={size} />
          <span
            className={`${cls} font-semibold uppercase tracking-[0.16em] text-muted-foreground`}
          >
            {label}
          </span>
          <Tick size={size} />
        </div>
      ))}
    </div>
  );
}

export function Colors() {
  return (
    <div className="flex flex-col gap-4">
      {(
        [
          ["orange", "Aktiv — Spieltag läuft"],
          ["neutral", "Informativ — noch kein Ergebnis"],
          ["navy", "Staff — nur intern sichtbar"],
        ] as const
      ).map(([color, label]) => (
        <div className="flex items-center gap-3" key={color}>
          <Tick color={color} />
          <span className="text-[13px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
