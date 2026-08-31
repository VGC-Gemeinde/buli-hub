import { formatCount } from "./usage-cards";

// A bar per bucket, scaled to the busiest one. Plain divs rather than a chart
// library: 24 or 30 bars need no client-side code. Buckets from before
// counting began are drawn hatched and full-height: they are not zero, they
// are unknown, and a flat zero bar would claim otherwise.

export type UsageBar = {
  label: string;
  value: number;
  counted: boolean;
};

const HATCH =
  "repeating-linear-gradient(45deg, transparent, transparent 3px, var(--border) 3px, var(--border) 5px)";

export function UsageBarChart({
  bars,
  unit,
  /** Every n-th label is written under the chart; 0 hides them all. */
  labelEvery = 0,
}: {
  bars: readonly UsageBar[];
  unit: string;
  labelEvery?: number;
}) {
  const max = Math.max(1, ...bars.map((bar) => bar.value));
  return (
    <div className="overflow-x-auto rounded-xl border">
      <div
        className="flex min-w-[480px] flex-col gap-1.5 px-4 pt-4 pb-3"
        style={{ width: "100%" }}
      >
        <div className="flex h-32 items-end gap-[3px]">
          {bars.map((bar) => {
            const title = bar.counted
              ? `${bar.label}: ${formatCount(bar.value)} ${unit}`
              : `${bar.label}: noch nicht gezählt`;
            const height = bar.counted ? (bar.value / max) * 100 : 100;
            return (
              <div
                key={bar.label}
                title={title}
                className="flex h-full min-w-[6px] flex-1 flex-col justify-end"
              >
                <div
                  className={
                    bar.counted
                      ? bar.value > 0
                        ? "rounded-t-[2px] bg-chart-1"
                        : "rounded-t-[2px] bg-border"
                      : "rounded-[2px]"
                  }
                  style={{
                    height: `${height}%`,
                    minHeight: "2px",
                    ...(bar.counted ? {} : { backgroundImage: HATCH }),
                  }}
                />
              </div>
            );
          })}
        </div>
        {labelEvery > 0 ? (
          <div className="flex gap-[3px]">
            {bars.map((bar, i) => (
              <div
                key={bar.label}
                className="min-w-[6px] flex-1 text-[11px] text-muted-foreground tabular-nums"
              >
                {i % labelEvery === 0 ? bar.label : ""}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function UsageLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px] text-muted-foreground">
      <span className="flex items-center gap-2">
        <span className="inline-block h-[7px] w-[18px] rounded-[2px] bg-chart-1" />
        gezählt
      </span>
      <span className="flex items-center gap-2">
        <span
          className="inline-block h-[7px] w-[18px] rounded-[2px]"
          style={{ backgroundImage: HATCH }}
        />
        vor Beginn der Zählung
      </span>
    </div>
  );
}
