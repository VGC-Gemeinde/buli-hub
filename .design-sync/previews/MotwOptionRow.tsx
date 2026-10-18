import { MotwOptionRow } from "buli-hub";
import type { ReactNode } from "react";
import type { MotwOption, MotwPlayer } from "@/features/motw/motw";

/* One pickable matchup in the MotW picker (`/staff/motw`): group label, the
 * two `MotwSide`s around "vs.", and a fixed trailing column with at most one
 * marker ("nicht aufnehmbar" / "Capture Card unklar" / "gemeldet") plus the
 * action. The whole row takes the click; the trailing label is the real
 * button and lights up orange on hover. A nominated or confirmed row is inert
 * and wears its state instead.
 *
 * Stacked like the workspace list (`flex-col gap-1.5`). The sm+ grid has a
 * fixed 88px + 280px frame, so it wants the staff page's column width.
 */

const STREAM_PHOTO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 690">' +
      '<rect width="420" height="690" fill="#021f66"/>' +
      '<circle cx="210" cy="250" r="90" fill="#ff7b00"/>' +
      '<rect x="60" y="380" width="300" height="240" rx="40" fill="#ff7b00"/>' +
      "</svg>",
  );

function player(
  name: string,
  rank: number | null,
  wins: number,
  losses: number,
  hasCaptureCard: boolean,
  dropped = false,
  profileEdited = true,
): MotwPlayer {
  return {
    userId: `motw-${name}`,
    name,
    avatarUrl: null,
    streamPhotoUrl: hasCaptureCard ? STREAM_PHOTO : null,
    rank,
    wins,
    losses,
    hasCaptureCard,
    profileEdited,
    dropped,
  };
}

function option(
  index: number,
  groupName: string,
  playerA: MotwOption["playerA"],
  playerB: MotwOption["playerB"],
  reported = false,
): MotwOption {
  return {
    matchId: `wm4-${index}`,
    round: 4,
    tier: Number(groupName.replace("Division ", "").charAt(0)) || 1,
    groupName,
    playerA,
    playerB,
    reported,
  };
}

const OPTIONS: MotwOption[] = [
  option(
    0,
    "Division 1a",
    player("Wooloo", 1, 4, 0, true),
    player("Falinks", 2, 3, 1, true),
    true,
  ),
  option(
    1,
    "Division 1a",
    player("Pawmi", 3, 2, 2, true),
    player("Tinkatink", 8, 0, 4, false),
  ),
  option(
    2,
    "Division 1b",
    player("Yannick mit sehr langem Namen", 4, 2, 2, false),
    player("Nico", 5, 2, 2, false, false, false),
  ),
  option(
    3,
    "Division 2a",
    player("Luca", null, 0, 0, false),
    player("Finn", 6, 1, 3, false, true),
  ),
];

const noop = () => {};

function List({ children }: { children: ReactNode }) {
  return <div className="flex max-w-[1040px] flex-col gap-1.5">{children}</div>;
}

/** Collecting candidates for the running Spieltag: no Hauptmatch yet, so each
 *  row offers "Als Hauptmatch". Shows all three markers: already reported,
 *  capture card unknown (Nico never saved a profile), and nobody can record. */
export function Auswahl() {
  return (
    <List>
      {OPTIONS.map((o) => (
        <MotwOptionRow
          key={o.matchId}
          option={o}
          state={null}
          actionLabel="Als Hauptmatch"
          pending={false}
          disabled={false}
          onPick={noop}
        />
      ))}
    </List>
  );
}

/** Rows already picked are inert and wear their state: navy for the
 *  Hauptmatch and a backup, orange for the confirmed Match of the Week. A
 *  free row then offers "Als Backup". */
export function Gewaehlt() {
  return (
    <List>
      <MotwOptionRow
        option={OPTIONS[0]}
        state="confirmed"
        actionLabel="Bestätigen"
        pending={false}
        disabled={false}
        onPick={noop}
      />
      <MotwOptionRow
        option={OPTIONS[1]}
        state="primary"
        actionLabel="Als Backup"
        pending={false}
        disabled={false}
        onPick={noop}
      />
      <MotwOptionRow
        option={OPTIONS[2]}
        state="backup"
        actionLabel="Als Backup"
        pending={false}
        disabled={false}
        onPick={noop}
      />
      <MotwOptionRow
        option={OPTIONS[3]}
        state={null}
        actionLabel="Als Backup"
        pending={false}
        disabled={false}
        onPick={noop}
      />
    </List>
  );
}

/** While a pick is saving: the clicked row says "Einen Moment…", every other
 *  free row dims and stops taking clicks. */
export function Speichert() {
  return (
    <List>
      <MotwOptionRow
        option={OPTIONS[0]}
        state={null}
        actionLabel="Bestätigen"
        pending
        disabled
        onPick={noop}
      />
      <MotwOptionRow
        option={OPTIONS[1]}
        state={null}
        actionLabel="Bestätigen"
        pending={false}
        disabled
        onPick={noop}
      />
    </List>
  );
}

/** After the regular season: a Relegation and a playoff final whose
 *  sides are still open (dashed circle, candidates as the name). The group
 *  column wraps the stage over its boundary or round. */
export function NachDerSaison() {
  return (
    <List>
      <MotwOptionRow
        option={option(
          10,
          "Relegation · Division 1 und 2",
          player("Pawmi", 8, 1, 6, true),
          {
            open: true,
            label: "Division 2b · Platz 1",
            candidates: [
              player("Luca", 1, 5, 1, true),
              player("Maushold", 1, 5, 1, true),
            ],
          },
        )}
        state={null}
        actionLabel="Als Hauptmatch"
        pending={false}
        disabled={false}
        onPick={noop}
      />
      <MotwOptionRow
        option={option(
          11,
          "Playoffs · Finale",
          player("Wooloo", 1, 6, 1, true),
          { open: true, label: "Sieger HF 2", candidates: [] },
        )}
        state={null}
        actionLabel="Als Hauptmatch"
        pending={false}
        disabled={false}
        onPick={noop}
      />
    </List>
  );
}
