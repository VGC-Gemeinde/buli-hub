import { StandingsTable } from "buli-hub";
import type { StandingsRow } from "@/features/reporting/standings";
import type { Zone } from "@/features/seeding/post-season";
import { AVATAR_URL, DIVISION_STANDINGS, STANDINGS } from "./_fixtures";

/* The central league table (DESIGN.md: zone rails). Platz + Spieler stay
 * frozen on the left; a zoned row gets a soft tint plus a 6px rail flush left,
 * the viewer's own row an orange rail when it is unzoned. The legend under the
 * table names only the zones actually present. */

function row(
  userId: string,
  name: string,
  rank: number,
  wins: number,
  losses: number,
  gamesWon: number,
  gamesLost: number,
  extra: Partial<StandingsRow> = {},
): StandingsRow {
  return {
    userId,
    name,
    avatarUrl: rank % 3 === 1 ? AVATAR_URL : null,
    wins,
    losses,
    points: wins * 3,
    gamesWon,
    gamesLost,
    rank,
    ...extra,
  };
}

/** Division 2 after the last Spieltag: every band of the post-season present. */
const FINAL_TABLE: StandingsRow[] = [
  row("d2-1", "Blaubeerkuchen", 1, 7, 0, 14, 3),
  row("d2-2", "annegret", 2, 5, 2, 11, 6),
  row("me", "Testerino", 3, 4, 3, 9, 8),
  row("d2-4", "Schnabelbär", 4, 4, 3, 9, 9),
  row("d2-5", "Fennexis", 5, 3, 4, 8, 9, {
    replacement: "Ersatz für Kilowattrel ab Spieltag 4",
  }),
  row("d2-6", "MegaMaxi", 6, 2, 5, 6, 11),
  row("d2-7", "Lukas aus Leipzig", 7, 2, 5, 5, 11),
  row("d2-8", "Pawmi", 8, 1, 6, 3, 12, { dropped: true }),
];

const FINAL_ZONES = new Map<string, Zone>([
  ["d2-1", "promote"],
  ["d2-2", "promotion_playoff"],
  ["d2-6", "demotion_playoff"],
  ["d2-7", "demote"],
  ["d2-8", "demote"],
]);

/** Division 1 Gesamttabelle: the top two go to the Playoffs. */
const DIVISION_ZONES = new Map<string, Zone>([
  ["d", "champion"],
  ["me", "champion"],
  ["c", "demotion_playoff"],
  ["g", "demote"],
]);

const DIVISION_LABELS = new Map(
  DIVISION_STANDINGS.map((r, i) => [r.userId, i % 2 === 0 ? "1a" : "1b"]),
);

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div className="w-full max-w-2xl">{children}</div>
);

export function Abschlusstabelle() {
  return (
    <Frame>
      <StandingsTable
        standings={FINAL_TABLE}
        meId="me"
        zones={FINAL_ZONES}
        favoriteIds={new Set(["d2-1", "d2-6"])}
      />
    </Frame>
  );
}

export function GesamttabelleDivision() {
  return (
    <Frame>
      <StandingsTable
        standings={DIVISION_STANDINGS}
        meId="me"
        zones={DIVISION_ZONES}
        groupLabels={DIVISION_LABELS}
        dense
        footnote="Auf- und Abstieg wird über die Gesamttabelle der Division entschieden."
      />
    </Frame>
  );
}

export function LaufendeGruppe() {
  return (
    <Frame>
      <StandingsTable standings={STANDINGS} meId="me" withheld={1} />
    </Frame>
  );
}
