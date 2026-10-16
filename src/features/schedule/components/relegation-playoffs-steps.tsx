import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAFF_STEPS } from "../relegation-playoffs-steps";

// The four steps of Relegation und Playoffs on their staff page: done ones
// checked, the next one in orange, later ones muted. Read-only; the panel
// below the steps is where the next one is taken.
export function StaffSteps({ current }: { current: number }) {
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {STAFF_STEPS.map((label, index) => {
        const done = index < current;
        const next = index === current;
        return (
          <li
            key={label}
            aria-current={next ? "step" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg border px-3 py-2.5",
              next && "border-brand-orange/60 bg-brand-orange/[0.07]",
            )}
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full font-bold text-[12px] tabular-nums",
                done
                  ? "bg-brand-blue text-white dark:bg-white dark:text-brand-blue"
                  : next
                    ? "bg-brand-orange text-white"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {done ? <Check aria-hidden className="size-3.5" /> : index + 1}
            </span>
            <span
              className={cn(
                "font-semibold text-[13px] leading-tight",
                done || next
                  ? "text-brand-blue dark:text-white"
                  : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
