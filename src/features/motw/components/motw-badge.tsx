import { cn } from "@/lib/utils";

// The compact pill marking the featured match wherever its result stays
// hidden (match rows, match page). The name is a fixed brand term — always
// the English "Match of the Week", never translated.
export function MotwBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full bg-brand-orange/14 px-2.5 py-[3px] font-semibold text-[11px] text-brand-blue uppercase leading-none tracking-[0.06em] dark:text-white",
        className,
      )}
    >
      Match of the Week
    </span>
  );
}
