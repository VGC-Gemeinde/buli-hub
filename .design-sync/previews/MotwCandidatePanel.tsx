import { MotwCandidatePanel } from "buli-hub";
import type {
  MotwCandidate,
  MotwOption,
  MotwPlayer,
} from "@/features/motw/motw";

/* The Kandidaten panel of the MotW workspace (`/staff/motw`,
 * docs/plans/motw-candidates.md): the Spieltag's nominated matches, the
 * Hauptmatch staff plan to feature and the backups they record in case it
 * falls through. Navy, not orange: a candidate is a recording, and orange
 * stays reserved for the confirmed Match of the Week. Each candidate is a
 * small pick panel with its own action bar (Bestätigen / Zum Hauptmatch /
 * Entfernen).
 *
 * Composed at the staff page's column width (`max-w-[1040px]`).
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
    dropped: false,
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
    matchId: `wm5-${index}`,
    round: 5,
    tier: 1,
    groupName,
    playerA,
    playerB,
    reported,
  };
}

const TOP: MotwOption = option(
  0,
  "Division 1a",
  player("Wooloo", 1, 4, 0, true),
  player("Falinks", 2, 3, 1, true),
);
const SECOND: MotwOption = option(
  1,
  "Division 1b",
  player("Blaubeerkuchenbäckermeisterin Annegret", 1, 4, 0, false),
  player("Nico", 2, 3, 1, false, false),
);
const THIRD: MotwOption = option(
  2,
  "Division 2a",
  player("Pawmi", 1, 3, 1, true),
  player("Kilowattrel", 3, 3, 1, false),
  true,
);

const PLANNED: MotwCandidate[] = [
  { option: TOP, role: "primary", changedFrom: null },
  { option: SECOND, role: "backup", changedFrom: null },
  { option: THIRD, role: "backup", changedFrom: null },
];

const noop = () => {};

function Panel(props: {
  candidates: MotwCandidate[];
  editable?: boolean;
  confirmedMatchId?: string | null;
  pendingId?: string | null;
  addOpen?: boolean;
}) {
  return (
    <div className="max-w-[1040px]">
      <MotwCandidatePanel
        candidates={props.candidates}
        editable={props.editable ?? true}
        confirmedMatchId={props.confirmedMatchId ?? null}
        pendingId={props.pendingId ?? null}
        onConfirm={noop}
        onPromote={noop}
        onDrop={noop}
        onAcknowledge={noop}
        onAdd={noop}
        addOpen={props.addOpen ?? false}
      />
    </div>
  );
}

/** The week before it is played: a Hauptmatch (filled navy chip, navy edge)
 *  and two backups, each with its action bar. The backups offer
 *  "Zum Hauptmatch"; markers carry over from the picker. */
export function Auswahl() {
  return <Panel candidates={PLANNED} />;
}

/** A Relegation candidate whose line-up moved since it was nominated: the
 *  orange note offers to take over the new line-up. With a side still open
 *  there is no match page and nothing to confirm yet. */
export function BesetzungGeaendert() {
  return (
    <Panel
      candidates={[
        {
          option: option(
            7,
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
          ),
          role: "primary",
          changedFrom: "Pawmi gegen Luca oder Finn",
        },
      ]}
    />
  );
}

/** Confirmed already: the heading turns to "Weitere Kandidaten" for the
 *  backup left over, which stays held and is released under Aufnahmen. */
export function NachBestaetigung() {
  return (
    <Panel
      candidates={[{ option: SECOND, role: "backup", changedFrom: null }]}
      confirmedMatchId={TOP.matchId}
    />
  );
}

/** A past week that is no longer editable: no add button, no action bars. */
export function NurLesen() {
  return <Panel candidates={PLANNED.slice(0, 2)} editable={false} />;
}

/** While a confirmation is saving: the button reads "Wird bestätigt…" and
 *  every other action is disabled; the picker below is open. */
export function WirdBestaetigt() {
  return (
    <Panel candidates={PLANNED.slice(0, 2)} pendingId={TOP.matchId} addOpen />
  );
}
