import { cn } from "@/lib/utils";

// Skewed brand tick (DESIGN.md §2.2). Three sanctioned sizes, always
// skewX(-18deg):
//   S 14×7  — micro labels 12–13px uppercase (status lines, kickers, nav)
//   M 18×9  — section headers (h2), panel titles
//   L 22×11 — page titles (h1), landing credit
// Color: orange (default, "active"), neutral (bg-border, informational),
// navy (staff / officiating).
type TickSize = "s" | "m" | "l";
type TickColor = "orange" | "neutral" | "navy";

const sizeClasses: Record<TickSize, string> = {
  s: "h-[7px] w-[14px]",
  m: "h-[9px] w-[18px]",
  l: "h-[11px] w-[22px]",
};

const colorClasses: Record<TickColor, string> = {
  orange: "bg-brand-orange",
  // The border token is 12% white in dark mode, next to nothing on the dark
  // navy and lost entirely on `bg-muted` (8% white, the header's section
  // row). A step lighter there, so an unselected tick still reads as one.
  neutral: "bg-border dark:bg-white/30",
  navy: "bg-brand-blue dark:bg-white",
};

export function Tick({
  size = "m",
  color = "orange",
  className,
}: {
  size?: TickSize;
  color?: TickColor;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block shrink-0 -skew-x-[18deg]",
        sizeClasses[size],
        colorClasses[color],
        className,
      )}
    />
  );
}
