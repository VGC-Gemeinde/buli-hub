"use client";

import Link from "next/link";
import { Tick } from "@/components/tick";
import type { Section } from "@/features/navigation/sections";
import { cn } from "@/lib/utils";

// A label that always takes the width of its bold form, so the tab moving to
// another entry never shifts its neighbours.
function Label({ text }: { text: string }) {
  return (
    <span className="grid">
      <span className="col-start-1 row-start-1">{text}</span>
      <span
        aria-hidden
        className="invisible col-start-1 row-start-1 font-semibold"
      >
        {text}
      </span>
    </span>
  );
}

// The main bar's navigation (design/NAVIGATION.md §3.2). The same entries on
// every page: "Liga" (only while a season runs), "Spieler-Dashboard",
// "Staff-Bereich" (staff only). The page's `section` is a tab: a `bg-muted`
// shape with rounded top corners behind the entry, running straight into the
// section row of the same colour below, plus the orange tick. Below `sm` the
// labels take their short forms so the bar stays one line.
export function HeaderNav({
  isStaff,
  seasonRunning,
  section,
}: {
  isStaff: boolean;
  seasonRunning: boolean;
  section?: Section;
}) {
  const entries: {
    href: string;
    label: string;
    short: string;
    section: Section;
  }[] = [
    ...(seasonRunning
      ? [{ href: "/", label: "Liga", short: "Liga", section: "liga" as const }]
      : []),
    {
      href: "/spieler",
      label: "Spieler-Dashboard",
      short: "Spieler",
      section: "spieler",
    },
    ...(isStaff
      ? [
          {
            href: "/staff",
            label: "Staff-Bereich",
            short: "Staff",
            section: "staff" as const,
          },
        ]
      : []),
  ];

  return (
    <nav aria-label="Hauptnavigation" className="flex h-full items-stretch">
      {entries.map((entry) => {
        const active = entry.section === section;
        return (
          <Link
            key={entry.href}
            href={entry.href}
            // "true", not "page": the page itself is marked in the row.
            aria-current={active ? "true" : undefined}
            className={cn(
              "relative flex items-center whitespace-nowrap px-[11px] text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2 sm:px-[18px]",
              active
                ? "font-semibold text-brand-blue dark:text-white"
                : "font-medium text-muted-foreground hover:text-brand-blue dark:hover:text-white",
            )}
          >
            {active ? (
              <span
                aria-hidden
                className="absolute inset-0 rounded-t-md bg-muted"
              />
            ) : null}
            <span className="relative flex items-center gap-[7px] sm:gap-2">
              <Tick size="s" color={active ? "orange" : "neutral"} />
              <span className="sm:hidden">
                <Label text={entry.short} />
              </span>
              <span className="hidden sm:block">
                <Label text={entry.label} />
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
