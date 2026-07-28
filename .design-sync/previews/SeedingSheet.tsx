import { SeedingSheet } from "buli-hub";
import type { SeedingPlayer } from "@/features/seeding/placement";
import { assembleSheetRows, UNPLACED_SECTION } from "@/features/seeding/sheet";

/* The seeding sheet: the staff table the whole Divisions-Einteilung happens in.
 * One flat, ordered row list (`assembleSheetRows`) built from four row kinds —
 * the „Nicht platziert" pool, a navy division separator per division, a group
 * separator per sub-division (plus „Ohne Gruppe" for stragglers or an empty
 * hint), and the player rows themselves. Ten columns carry every placement
 * signal at once: status, platform, last season, caveat, self-assessment bar,
 * achievements, and the Division/Gruppe selects.
 *
 * The sheet is `flex-1` inside a page scroll frame, so each cell supplies a
 * parent with a definite height — with an auto-height parent `min-h-0 flex-1`
 * collapses the body to zero and the card renders empty.
 *
 * Not statically renderable: drag & drop. Rows carry `draggable` and every
 * separator is a drop zone (`RING` on separators, `BOTTOM_LINE` on player
 * rows), but the highlight only exists while a pointer drag is in flight —
 * there is no prop for it. Multi-select is shown instead, since dragging a
 * selected row carries the whole selection.
 *
 * Fixtures ported from the dev/ui gallery („Seeding: Sheet"), with stable ids —
 * the gallery's `seedPlayer` uses `crypto.randomUUID()`, which would change the
 * render hash on every capture. */

const DIVISIONS = [
  { id: "d1", tier: 1 },
  { id: "d2", tier: 2 },
  { id: "d3", tier: 3 },
];
const SUBS = [
  { id: "s1a", divisionId: "d1", position: 0 },
  { id: "s1b", divisionId: "d1", position: 1 },
  { id: "s2a", divisionId: "d2", position: 0 },
  { id: "s2b", divisionId: "d2", position: 1 },
];

const AVATAR = "https://cdn.discordapp.com/embed/avatars/1.png";

function player(
  userId: string,
  displayName: string,
  overrides: Partial<SeedingPlayer> = {},
): SeedingPlayer {
  return {
    userId,
    displayName,
    username: displayName.toLowerCase().replace(/\s+/g, ""),
    avatarUrl: null,
    status: "new",
    platform: "showdown",
    participatedBefore: false,
    skillSelfRating: 5,
    prevSeason: null,
    prevName: null,
    prevDivision: null,
    prevPlacement: null,
    greatestAchievements: null,
    divisionId: null,
    subDivisionId: null,
    ...overrides,
  };
}

/* A returning player: the registration answers come from their own memory of
 * last season, which is what the „Selbst angegeben" caveat chip flags. */
function returning(
  userId: string,
  displayName: string,
  prevDivision: number,
  prevPlacement: number,
  overrides: Partial<SeedingPlayer> = {},
): SeedingPlayer {
  return player(userId, displayName, {
    status: "returning",
    participatedBefore: true,
    skillSelfRating: null,
    prevSeason: "Saison 8",
    prevName: displayName,
    prevDivision,
    prevPlacement,
    ...overrides,
  });
}

/* Mid-meeting: four registrations still in the pool, Division 1 grouped except
 * for one straggler, Division 2 grouped. „Nicht platziert" is ordered
 * Rückkehrer first, then by self-assessment descending (`orderForPlacement`). */
const PLAYERS: SeedingPlayer[] = [
  returning("u01", "AltHase", 1, 2, {
    platform: "cartridge",
    greatestAchievements: "Top 16 Regional Dortmund",
  }),
  returning("u02", "Blaubeerkuchen", 2, 5),
  player("u03", "Neuling47", { skillSelfRating: 8 }),
  player("u04", "Yannick mit sehr langem Namen", {
    platform: "cartridge",
    skillSelfRating: 6,
    greatestAchievements: "Platz 3 bei der Herbst-Bo3",
  }),

  player("u05", "Kuro", {
    divisionId: "d1",
    subDivisionId: "s1a",
    skillSelfRating: 9,
    greatestAchievements: "Regional Top 8 Stuttgart",
  }),
  returning("u06", "Testerino", 1, 1, {
    divisionId: "d1",
    subDivisionId: "s1a",
    avatarUrl: AVATAR,
    platform: "cartridge",
    greatestAchievements: "Meister Saison 8",
  }),
  returning("u07", "Falinks", 1, 4, {
    divisionId: "d1",
    subDivisionId: "s1a",
  }),
  player("u08", "annegret", {
    divisionId: "d1",
    subDivisionId: "s1b",
    skillSelfRating: 7,
  }),
  returning("u09", "Wooloo", 1, 7, {
    divisionId: "d1",
    subDivisionId: "s1b",
    avatarUrl: AVATAR,
    platform: "cartridge",
  }),
  player("u10", "Grafaiai", { divisionId: "d1", skillSelfRating: 5 }),

  player("u11", "Pawmi", {
    divisionId: "d2",
    subDivisionId: "s2a",
    skillSelfRating: 4,
  }),
  returning("u12", "Kilowattrel", 2, 3, {
    divisionId: "d2",
    subDivisionId: "s2a",
    platform: "cartridge",
  }),
  player("u13", "Maushold", {
    divisionId: "d2",
    subDivisionId: "s2b",
    skillSelfRating: 3,
  }),
  returning("u14", "Tinkatink", 2, 8, {
    divisionId: "d2",
    subDivisionId: "s2b",
  }),
];

/* Earlier in the same meeting: nothing is grouped yet and Division 1 still
 * shows its projected group count („→ 2 Gruppen bei Größe 8"). */
const UNGROUPED: SeedingPlayer[] = PLAYERS.map((p) => ({
  ...p,
  subDivisionId: null,
  divisionId: p.divisionId === null ? null : "d1",
}));

/* The finalized record: everybody sits in a group, the pool is empty. */
const PLACED: SeedingPlayer[] = PLAYERS.map((p, i) =>
  p.divisionId === null
    ? {
        ...p,
        divisionId: i < 2 ? "d1" : "d2",
        subDivisionId: i < 2 ? "s1b" : "s2b",
      }
    : { ...p, subDivisionId: p.subDivisionId ?? "s1b" },
);

const rows = (
  players: SeedingPlayer[],
  divisions: { id: string; tier: number }[],
  subDivisions: { id: string; divisionId: string; position: number }[],
  collapsedIds?: Set<string>,
) =>
  assembleSheetRows({
    players,
    divisions,
    subDivisions,
    size: 8,
    filter: { query: "", status: "all" },
    collapsedIds,
  });

const noop = () => {};

/* The controlling staff member's view: checkboxes, per-row Division/Gruppe
 * selects and the „Gruppen generieren" / „Neu generieren" action on each
 * division separator. Two rows are selected — dragging either one moves both. */
export function Sheet() {
  return (
    <div className="flex h-screen flex-col overflow-hidden rounded-lg border">
      <SeedingSheet
        rows={rows(PLAYERS, DIVISIONS.slice(0, 2), SUBS)}
        divisions={DIVISIONS.slice(0, 2)}
        subDivisions={SUBS}
        selection={new Set(["u05", "u07"])}
        readOnly={false}
        finalized={false}
        generatingDivisionId={null}
        onGenerate={noop}
        onToggleSelect={noop}
        onToggleCollapse={noop}
        onAssignDivision={noop}
        onMoveGroup={noop}
        onPlace={noop}
      />
    </div>
  );
}

/* Everyone else in the meeting watches: no checkboxes, no generate action, the
 * selects dimmed but still readable. Groups have not been generated yet, so the
 * division lists its players flat. */
export function Beobachter() {
  return (
    <div className="flex h-screen flex-col overflow-hidden rounded-lg border">
      <SeedingSheet
        rows={rows(UNGROUPED, DIVISIONS.slice(0, 2), [])}
        divisions={DIVISIONS.slice(0, 2)}
        subDivisions={[]}
        selection={new Set()}
        readOnly
        finalized={false}
        generatingDivisionId={null}
        onGenerate={noop}
        onToggleSelect={noop}
        onToggleCollapse={noop}
        onAssignDivision={noop}
        onMoveGroup={noop}
        onPlace={noop}
      />
    </div>
  );
}

/* Finalized — a terminal record rather than an editor: Division and Gruppe
 * render as plain text and the pool is empty. */
export function Finalisiert() {
  return (
    <div className="flex h-screen flex-col overflow-hidden rounded-lg border">
      <SeedingSheet
        rows={rows(PLACED, DIVISIONS.slice(0, 2), SUBS)}
        divisions={DIVISIONS.slice(0, 2)}
        subDivisions={SUBS}
        selection={new Set()}
        readOnly
        finalized
        generatingDivisionId={null}
        onGenerate={noop}
        onToggleSelect={noop}
        onToggleCollapse={noop}
        onAssignDivision={noop}
        onMoveGroup={noop}
        onPlace={noop}
      />
    </div>
  );
}

/* Long meetings fold sections away: the pool and Gruppe 1a are collapsed,
 * Division 2 entirely, and the still-empty Division 3 shows its hint. The
 * separators stay put with a rotated chevron; the counts keep reflecting the
 * full data. */
export function Eingeklappt() {
  return (
    <div className="flex h-screen flex-col overflow-hidden rounded-lg border">
      <SeedingSheet
        rows={rows(
          PLAYERS,
          DIVISIONS,
          SUBS,
          new Set([UNPLACED_SECTION, "s1a", "d2"]),
        )}
        divisions={DIVISIONS}
        subDivisions={SUBS}
        selection={new Set()}
        readOnly={false}
        finalized={false}
        generatingDivisionId={null}
        onGenerate={noop}
        onToggleSelect={noop}
        onToggleCollapse={noop}
        onAssignDivision={noop}
        onMoveGroup={noop}
        onPlace={noop}
      />
    </div>
  );
}
