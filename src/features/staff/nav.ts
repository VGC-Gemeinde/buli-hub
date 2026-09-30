// The Staff-Bereich row of the site navigation (docs/plans/staff-dashboard.md,
// docs/plans/site-navigation.md), grouped by what an entry is about. The week (this
// Spieltag's matches and recordings), the season (who plays, how it is
// divided, its schedule and Match of the Week), the hub (what outlives a
// season). Entries that mean nothing in the current phase stay out, so the
// bar only ever offers pages that have something to show.

import { type Role, roleAtLeast } from "@/features/roles/roles";
import type { SeasonPhase } from "./season-phase";

export type StaffNavEntry = { href: string; label: string };
export type StaffNavGroup = {
  scope: "overview" | "week" | "season" | "hub";
  entries: StaffNavEntry[];
};

export function staffNav(input: {
  phase: SeasonPhase;
  role: Role;
}): StaffNavGroup[] {
  const { phase } = input;
  // A schedule exists: there are weeks, matches and a Match of the Week.
  const scheduled = phase === "schedule_hidden" || phase === "regular_season";
  // Registration closed: the seeding (Divisionen) has something to show.
  const seedable = phase !== "not_started" && phase !== "registration_open";
  const groups: StaffNavGroup[] = [
    { scope: "overview", entries: [{ href: "/staff", label: "Übersicht" }] },
    {
      scope: "week",
      entries: scheduled
        ? [
            { href: "/staff/woche", label: "Woche" },
            { href: "/staff/aufnahmen", label: "Aufnahmen" },
          ]
        : [],
    },
    {
      scope: "season",
      entries: [
        ...(phase !== "not_started"
          ? [{ href: "/staff/teilnehmer", label: "Teilnehmer" }]
          : []),
        ...(seedable ? [{ href: "/staff/seeding", label: "Divisionen" }] : []),
        ...(scheduled
          ? [
              { href: "/staff/spielplan", label: "Spielplan" },
              { href: "/staff/motw", label: "Match of the Week" },
            ]
          : []),
      ],
    },
    {
      scope: "hub",
      entries: [
        { href: "/staff/banliste", label: "Banliste" },
        ...(roleAtLeast(input.role, "admin")
          ? [{ href: "/staff/nutzung", label: "Nutzung" }]
          : []),
      ],
    },
  ];
  return groups.filter((group) => group.entries.length > 0);
}
