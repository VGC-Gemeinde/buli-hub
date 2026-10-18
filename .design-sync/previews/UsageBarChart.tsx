import { UsageBarChart, UsageLegend } from "buli-hub";
import type { UsageBar } from "@/features/usage/components/usage-bar-chart";

/* The two charts of /staff/nutzung. Counting began on 22.09.2026, so the days
 * before it are hatched at full height: not zero, unknown. Values are fixed
 * (a weekly rhythm peaking on Sunday, the report deadline), never random. */

const WEEKDAY_BASE = [182, 151, 164, 139, 128, 171, 263]; // Mo..So

// 16.09.2026 (a Wednesday) to 15.10.2026.
const DAYS: UsageBar[] = Array.from({ length: 30 }, (_, i) => {
  const day = 16 + i;
  const inSeptember = day <= 30;
  const label = inSeptember
    ? `${String(day).padStart(2, "0")}.09.`
    : `${String(day - 30).padStart(2, "0")}.10.`;
  const weekday = (2 + i) % 7;
  const counted = i >= 6;
  const value = counted ? WEEKDAY_BASE[weekday] + ((i * 37) % 41) : 0;
  return { label, value, counted };
});

// Today until 21:00; the night hours are genuinely quiet, the evening busy.
const HOURLY = [
  4, 2, 1, 0, 0, 0, 1, 3, 6, 5, 7, 9, 12, 10, 8, 9, 13, 17, 22, 27, 31, 24, 0,
  0,
];
const HOURS: UsageBar[] = HOURLY.map((value, hour) => ({
  label: `${String(hour).padStart(2, "0")}:00`,
  value,
  counted: true,
}));

export function AufrufeJeTag() {
  return (
    <div className="flex flex-col gap-4">
      <UsageBarChart bars={DAYS} unit="Aufrufe" labelEvery={5} />
      <UsageLegend />
    </div>
  );
}

/* Hours with no page load draw as a flat grey stub, not as nothing. */
export function HeuteJeStunde() {
  return (
    <div className="flex flex-col gap-4">
      <UsageBarChart bars={HOURS} unit="Aufrufe" labelEvery={3} />
      <UsageLegend />
    </div>
  );
}

/* The first visit to the page before anything was counted. */
export function NochNichtsGezaehlt() {
  return (
    <UsageBarChart
      bars={DAYS.map((bar) => ({ ...bar, value: 0, counted: false }))}
      unit="Aufrufe"
      labelEvery={5}
    />
  );
}
