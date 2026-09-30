import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { hoverCard } from "@/lib/emphasis";
import { cn } from "@/lib/utils";

// A number on the staff dashboard (docs/plans/staff-dashboard.md): the normal
// state of things, counted instead of listed. Links to the page with the
// full list. `alert` turns it red while the count is not zero, only for
// numbers that are also a todo above, so the two never disagree. A tile with
// `href` is a link to that list.
export function StatTile({
  value,
  label,
  sub,
  href,
  alert = false,
}: {
  value: number | string;
  label: string;
  // A small second line, e.g. "von 36".
  sub?: string;
  href?: string;
  alert?: boolean;
}) {
  const zero = value === 0;
  const isAlert = alert && !zero;
  const body = (
    <>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-bold font-heading text-[26px] leading-none tabular-nums",
            isAlert
              ? "text-destructive"
              : zero
                ? "text-muted-foreground/60"
                : "text-brand-blue dark:text-white",
          )}
        >
          {value}
        </span>
        {sub ? (
          <span className="font-medium text-[13px] text-muted-foreground tabular-nums">
            {sub}
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          "mt-1 font-semibold text-[11.5px] uppercase tracking-[0.08em]",
          isAlert ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {label}
      </div>
    </>
  );
  const className = cn(
    "relative block rounded-lg border px-4 py-3",
    isAlert && "border-destructive/40 bg-destructive/5",
  );
  if (!href) {
    return <div className={className}>{body}</div>;
  }
  // A linked tile says so before it is touched (the arrow in the corner) and
  // answers the hover clearly in both modes: a full orange border, a faint
  // orange wash and an orange arrow. Red tiles keep their red, in a stronger
  // shade on hover.
  return (
    <Link
      href={href}
      className={cn(
        className,
        "group transition-colors focus-visible:outline-2 focus-visible:outline-ring",
        isAlert
          ? "hover:border-destructive hover:bg-destructive/10"
          : hoverCard,
      )}
    >
      <ArrowUpRight
        aria-hidden
        className={cn(
          "absolute top-2.5 right-2.5 size-4 transition-colors",
          isAlert
            ? "text-destructive/50 group-hover:text-destructive"
            : "text-muted-foreground/50 group-hover:text-brand-orange",
        )}
      />
      {body}
    </Link>
  );
}
