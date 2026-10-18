import { NextAppRouter, SectionNav } from "buli-hub";

/* A section's row, the second tier of the site header (design/NAVIGATION.md
 * §3.3): full width, bg-muted continuing the main bar's active tab, a thin
 * divider between groups, the current page carrying the 3px orange bar. The
 * groups are the real `sectionRow()` output per section, written out here.
 * The current entry comes from the pathname, so each cell sets its own. */

const STAFF = [
  { key: "overview", entries: [{ href: "/staff", label: "Übersicht" }] },
  {
    key: "week",
    entries: [
      { href: "/staff/woche", label: "Woche" },
      { href: "/staff/aufnahmen", label: "Aufnahmen" },
    ],
  },
  {
    key: "season",
    entries: [
      { href: "/staff/teilnehmer", label: "Teilnehmer" },
      { href: "/staff/seeding", label: "Divisionen" },
      { href: "/staff/spielplan", label: "Spielplan" },
      { href: "/staff/relegation-playoffs", label: "Relegation und Playoffs" },
      { href: "/staff/motw", label: "Match of the Week" },
    ],
  },
  {
    key: "hub",
    entries: [
      { href: "/staff/banliste", label: "Banliste" },
      { href: "/staff/nutzung", label: "Nutzung" },
    ],
  },
];

const LIGA = [
  {
    key: "liga",
    entries: [
      { href: "/", label: "Übersicht" },
      { href: "/spielplan", label: "Spielplan" },
      { href: "/favoriten", label: "Favoriten" },
      { href: "/statistiken", label: "Statistiken" },
    ],
  },
];

const LIGA_PUBLISHED = [
  {
    key: "liga",
    entries: [
      { href: "/", label: "Übersicht" },
      { href: "/playoffs", label: "Playoffs" },
      { href: "/relegation", label: "Relegation" },
      { href: "/spielplan", label: "Spielplan" },
      { href: "/favoriten", label: "Favoriten" },
      { href: "/statistiken", label: "Statistiken" },
    ],
  },
];

const SPIELER = [
  {
    key: "spieler",
    entries: [
      { href: "/spieler", label: "Übersicht" },
      { href: "/anmeldung", label: "Anmeldung" },
    ],
  },
];

export function Bereichszeile() {
  return (
    <NextAppRouter pathname="/staff/woche">
      <SectionNav groups={STAFF} />
    </NextAppRouter>
  );
}

export function LigaMitPlayoffs() {
  return (
    <NextAppRouter pathname="/statistiken/pokemon">
      <SectionNav groups={LIGA_PUBLISHED} />
    </NextAppRouter>
  );
}

export function OhneMarkierung() {
  return (
    <NextAppRouter pathname="/matches/0f3c">
      <SectionNav groups={LIGA} />
    </NextAppRouter>
  );
}

export function Spieler() {
  return (
    <NextAppRouter pathname="/anmeldung">
      <SectionNav groups={SPIELER} />
    </NextAppRouter>
  );
}

export function Telefonbreite() {
  return (
    <NextAppRouter pathname="/staff/motw">
      <div className="max-w-sm">
        <SectionNav groups={STAFF} />
      </div>
    </NextAppRouter>
  );
}
