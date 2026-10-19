import { MotwSide } from "buli-hub";
import type { ReactNode } from "react";
import type { MotwOpenSide, MotwPlayer } from "@/features/motw/motw";

/* One player side of a Match-of-the-Week matchup in the staff workspace
 * (`/staff/motw`, docs/plans/motw-candidates.md): avatar on the outside, name
 * meeting the centred "vs.", and the form line underneath (boxed placement,
 * record, capture-card mark, stream-photo mark). `side` mirrors the anatomy so
 * the placement chips sit nearest the middle on both halves.
 *
 * Composed in the pick panel's real matchup grid (`sm:grid-cols-[1fr_auto_1fr]`
 * capped at 640px), because a lone side reads as half a component.
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
  extra: Partial<MotwPlayer> = {},
): MotwPlayer {
  return {
    userId: `motw-${name}`,
    name,
    avatarUrl: null,
    streamPhotoUrl: STREAM_PHOTO,
    rank,
    wins,
    losses,
    hasCaptureCard: true,
    profileEdited: true,
    dropped: false,
    ...extra,
  };
}

const WOOLOO = player("Wooloo", 1, 4, 0, {
  avatarUrl: "https://cdn.discordapp.com/embed/avatars/1.png",
});
const FALINKS = player("Falinks", 2, 3, 1, { streamPhotoUrl: null });

function Matchup({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 sm:mx-auto sm:grid sm:w-full sm:max-w-[640px] sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-4">
      {children}
    </div>
  );
}

function Vs() {
  return (
    <span className="hidden text-[11.5px] text-muted-foreground/70 sm:block">
      vs.
    </span>
  );
}

/** The picker-row size: Platz 1 against Platz 2, both with a capture card;
 *  Wooloo has a stream photo (orange thumbnail), Falinks still owes one. */
export function Begegnung() {
  return (
    <Matchup>
      <MotwSide player={WOOLOO} side="left" />
      <Vs />
      <MotwSide player={FALINKS} side="right" />
    </Matchup>
  );
}

/** `size="lg"`: the confirmed pick panel's treatment, condensed uppercase
 *  navy names like the public billboard, linked to the player profiles. */
export function GrossesFormat() {
  return (
    <Matchup>
      <MotwSide player={WOOLOO} side="left" size="lg" linkName />
      <span className="font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.1em]">
        vs.
      </span>
      <MotwSide player={FALINKS} side="right" size="lg" linkName />
    </Matchup>
  );
}

const OPEN_SIDE: MotwOpenSide = {
  open: true,
  label: "Division 2b · Platz 1",
  candidates: [player("Luca", 1, 3, 1), player("Maushold", 1, 3, 1)],
};

/** A Relegation side before the pairings are published: dashed circle instead
 *  of an avatar, the candidates as the name and the seat underneath. */
export function OffeneSeite() {
  return (
    <Matchup>
      <MotwSide player={player("Pawmi", 8, 1, 6)} side="left" />
      <Vs />
      <MotwSide player={OPEN_SIDE} side="right" />
    </Matchup>
  );
}

/** The edge cases the picker has to survive: no placement yet ("—"), a
 *  dropped player (struck through), no capture card (crossed-out camera)
 *  and a profile never saved (question mark, capture card unknown). */
export function Sonderfaelle() {
  return (
    <div className="flex flex-col gap-5">
      <Matchup>
        <MotwSide
          player={player("Luca", null, 0, 0, { streamPhotoUrl: null })}
          side="left"
        />
        <Vs />
        <MotwSide
          player={player("Finn", 6, 1, 3, { dropped: true })}
          side="right"
        />
      </Matchup>
      <Matchup>
        <MotwSide
          player={player("Yannick mit sehr langem Namen", 4, 2, 2, {
            hasCaptureCard: false,
            streamPhotoUrl: null,
          })}
          side="left"
        />
        <Vs />
        <MotwSide
          player={player("Nico", 5, 2, 2, {
            hasCaptureCard: false,
            profileEdited: false,
            streamPhotoUrl: null,
          })}
          side="right"
        />
      </Matchup>
    </div>
  );
}
