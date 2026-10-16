"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// The filter row (mockups/rankings.html). Every choice is a URL, built on the
// server; this only follows it. "Filter zurücksetzen" keeps its place while
// hidden, so setting a filter never moves anything (constitution 1.1.0).

export type FilterSelect = {
  id: string;
  label: string;
  value: string;
  set: boolean;
  options: { value: string; label: string; href: string }[];
};

export function StatsFilters({
  phase,
  selects,
  reset,
}: {
  // Only once the Nachsaison has begun.
  phase: { label: string; href: string; active: boolean }[] | null;
  selects: FilterSelect[];
  reset: { href: string; visible: boolean };
}) {
  const router = useRouter();
  return (
    <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap sm:gap-2.5">
      {phase ? (
        <fieldset className="col-span-2 flex w-max max-w-full gap-0.5 rounded-full border bg-muted/40 p-[3px]">
          <legend className="sr-only">Phase</legend>
          {phase.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              scroll={false}
              aria-current={item.active ? "true" : undefined}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] transition-colors",
                item.active
                  ? "bg-brand-orange font-semibold text-white"
                  : "font-medium text-muted-foreground hover:text-brand-blue dark:hover:text-white",
              )}
            >
              {item.label}
            </Link>
          ))}
        </fieldset>
      ) : null}
      {selects.map((select) => (
        <label key={select.id} className="relative min-w-0 sm:w-[190px]">
          <span className="sr-only">{select.label}</span>
          <select
            id={select.id}
            value={select.value}
            onChange={(event) => {
              const option = select.options.find(
                (o) => o.value === event.target.value,
              );
              if (option) {
                router.push(option.href, { scroll: false });
              }
            }}
            className={cn(
              "h-9 w-full cursor-pointer appearance-none rounded-lg border border-input bg-background pr-8 pl-3 text-[13.5px] focus-visible:outline-2 focus-visible:outline-ring",
              select.set
                ? "border-brand-orange font-semibold text-brand-blue dark:text-white"
                : "font-medium",
            )}
          >
            {select.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-3 size-[7px] -translate-y-[70%] rotate-45 border-muted-foreground border-r-[1.5px] border-b-[1.5px]"
          />
        </label>
      ))}
      <Link
        href={reset.href}
        scroll={false}
        aria-hidden={reset.visible ? undefined : true}
        tabIndex={reset.visible ? undefined : -1}
        className={cn(
          "col-span-2 w-max font-semibold text-[13px] text-brand-blue hover:underline hover:underline-offset-[3px] sm:ml-1 dark:text-white",
          !reset.visible && "invisible",
        )}
      >
        Filter zurücksetzen
      </Link>
    </div>
  );
}
