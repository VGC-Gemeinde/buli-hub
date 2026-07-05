import { cn } from "@/lib/utils";

// The MotW pill (design/MATCH-OF-THE-WEEK.md §1.1): match rows, the match-page
// banner, and the staff manager share this one anatomy — skewed tick, tinted
// fill, orange-brown text. Compact "MOTW" where space is tight (match rows),
// the full name where it fits; `children` overrides the label for sibling
// pills (the manager's "Gewählt"). The name is a fixed brand term — always the
// English "Match of the Week", never translated. Pass `title` when the pill
// replaces a score, so hovering explains what is hidden.
export function MotwBadge({
  label = "compact",
  title,
  className,
  children,
}: {
  label?: "compact" | "full";
  title?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-brand-orange/50 bg-brand-orange/12 px-2.5 py-[3px] font-bold text-[#9a4b00] text-[10.5px] uppercase leading-none tracking-[0.08em] dark:text-brand-orange",
        className,
      )}
    >
      <span aria-hidden className="h-1.5 w-3 -skew-x-[18deg] bg-brand-orange" />
      {children ?? (label === "compact" ? "MOTW" : "Match of the Week")}
    </span>
  );
}
