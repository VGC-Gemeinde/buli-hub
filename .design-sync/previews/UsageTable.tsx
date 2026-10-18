import { UsageTable } from "buli-hub";
import type { UsageTableRow } from "@/features/usage/components/usage-table";

/* The period tables of /staff/nutzung, newest first. Counting began on
 * 22.09.2026: a period from before shows the empty-value placeholder instead of
 * a zero that would claim nobody came. */

const DAY_ROWS: [string, string, number, number][] = [
  ["2026-10-15", "Do., 15.10.2026", 214, 68],
  ["2026-10-14", "Mi., 14.10.2026", 187, 61],
  ["2026-10-13", "Di., 13.10.2026", 163, 57],
  ["2026-10-12", "Mo., 12.10.2026", 205, 74],
  ["2026-10-11", "So., 11.10.2026", 296, 93],
  ["2026-10-10", "Sa., 10.10.2026", 178, 62],
  ["2026-10-09", "Fr., 09.10.2026", 141, 49],
];

export function LetzteTage() {
  return (
    <UsageTable
      periodHeading="Tag"
      rows={DAY_ROWS.map(([id, label, visits, uniques]) => ({
        id,
        label,
        visits,
        uniques,
        counted: true,
      }))}
    />
  );
}

const MONTHS: UsageTableRow[] = [
  {
    id: "2026-10",
    label: "Oktober 2026",
    visits: 2911,
    uniques: 1204,
    counted: true,
  },
  {
    id: "2026-09",
    label: "September 2026",
    visits: 1688,
    uniques: 742,
    counted: true,
  },
  {
    id: "2026-08",
    label: "August 2026",
    visits: 0,
    uniques: 0,
    counted: false,
  },
];

export function Monate() {
  return <UsageTable periodHeading="Monat" rows={MONTHS} />;
}

/* KW 38 ended before counting began. */
const WEEKS: UsageTableRow[] = [
  {
    id: "2026-W42",
    label: "KW 42 · 2026",
    visits: 769,
    uniques: 131,
    counted: true,
  },
  {
    id: "2026-W41",
    label: "KW 41 · 2026",
    visits: 1342,
    uniques: 162,
    counted: true,
  },
  {
    id: "2026-W40",
    label: "KW 40 · 2026",
    visits: 1287,
    uniques: 158,
    counted: true,
  },
  {
    id: "2026-W39",
    label: "KW 39 · 2026",
    visits: 1061,
    uniques: 149,
    counted: true,
  },
  {
    id: "2026-W38",
    label: "KW 38 · 2026",
    visits: 0,
    uniques: 0,
    counted: false,
  },
];

export function Wochen() {
  return <UsageTable periodHeading="Woche" rows={WEEKS} />;
}
