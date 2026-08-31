import { formatCount } from "./usage-cards";

// Period table: label, page loads, people. A period from before counting
// began shows the empty-value placeholder instead of a misleading zero.

export type UsageTableRow = {
  id: string;
  label: string;
  visits: number;
  uniques: number;
  counted: boolean;
};

/** The established empty-value glyph (see `playerName()` and `ddMM`). */
const NO_DATA = "—";

export function UsageTable({
  rows,
  periodHeading,
}: {
  rows: readonly UsageTableRow[];
  periodHeading: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="border-b text-left text-[12px] text-muted-foreground">
            <th className="px-4 py-2.5 font-semibold uppercase tracking-[0.12em]">
              {periodHeading}
            </th>
            <th className="px-4 py-2.5 text-right font-semibold uppercase tracking-[0.12em]">
              Aufrufe
            </th>
            <th className="px-4 py-2.5 text-right font-semibold uppercase tracking-[0.12em]">
              Personen
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b last:border-b-0">
              <td className="px-4 py-2">{row.label}</td>
              <td
                className={`px-4 py-2 text-right ${row.counted ? "" : "text-muted-foreground"}`}
              >
                {row.counted ? formatCount(row.visits) : NO_DATA}
              </td>
              <td
                className={`px-4 py-2 text-right ${row.counted ? "" : "text-muted-foreground"}`}
              >
                {row.counted ? formatCount(row.uniques) : NO_DATA}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
