// The site navigation (docs/plans/site-navigation.md). The header is the
// same on every page: the top-level sections, the one a page belongs to
// marked. A section with several pages adds a row under it; detail pages
// (a match, a profile, a teamsheet) mark their section and no row entry.

import type { Role } from "@/features/roles/roles";
import { staffNav } from "@/features/staff/nav";
import type { SeasonPhase } from "@/features/staff/season-phase";

export type Section = "liga" | "spieler" | "staff";

export type NavEntry = { href: string; label: string };
// A row is split into groups, drawn with a thin divider between them (the
// staff row groups week, season and hub; Liga is one group).
export type NavGroup = { key: string; entries: NavEntry[] };

// The row under a section. Null only for the Staff-Bereich without a staff
// role and for the Liga outside a running season (then the section does not
// exist in the header either).
export function sectionRow(
  section: Section,
  context: {
    phase: SeasonPhase;
    role: Role | null;
    // `/anmeldung` has something to show this player: the registration is
    // open, or they are registered for the latest season.
    registrationRelevant?: boolean;
  },
): NavGroup[] | null {
  switch (section) {
    case "liga":
      // The Liga section itself only exists while a season runs.
      return context.phase === "regular_season"
        ? [
            {
              key: "liga",
              entries: [
                { href: "/", label: "Übersicht" },
                { href: "/spielplan", label: "Spielplan" },
                { href: "/favoriten", label: "Favoriten" },
              ],
            },
          ]
        : null;
    case "staff":
      return context.role
        ? staffNav({ phase: context.phase, role: context.role }).map(
            (group) => ({ key: group.scope, entries: group.entries }),
          )
        : null;
    case "spieler":
      // Kept even with one entry: every section has a row, so the header's
      // height never changes inside a section (design/NAVIGATION.md §4).
      return [
        {
          key: "spieler",
          entries: [
            { href: "/spieler", label: "Übersicht" },
            ...(context.registrationRelevant
              ? [{ href: "/anmeldung", label: "Anmeldung" }]
              : []),
          ],
        },
      ];
  }
}

// Which row entry a path is: the longest matching href. A section's root
// ("/", "/staff") only matches itself, so a detail page marks nothing.
export function activeHref(
  groups: readonly NavGroup[],
  pathname: string,
): string | null {
  const roots = new Set(["/", "/staff", "/spieler"]);
  const matching = groups
    .flatMap((group) => group.entries.map((entry) => entry.href))
    .filter((href) =>
      roots.has(href)
        ? pathname === href
        : pathname === href || pathname.startsWith(`${href}/`),
    );
  return matching.sort((a, b) => b.length - a.length)[0] ?? null;
}

// A match page belongs to where the viewer comes from: a participant to their
// dashboard, staff looking at someone else's match to the Staff-Bereich,
// everyone else to the Liga.
export function matchPageSection(viewer: {
  isParticipant: boolean;
  isStaff: boolean;
}): Section {
  if (viewer.isParticipant) {
    return "spieler";
  }
  return viewer.isStaff ? "staff" : "liga";
}
