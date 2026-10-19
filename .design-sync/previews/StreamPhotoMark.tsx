import { StreamPhotoMark } from "buli-hub";

/* Whether a player has a picture for the stream, in the staff workspaces
 * (MotW picker, Aufnahmen; docs/plans/stream-photos.md). A shape to scan down
 * a list, not a colour: an orange-edged thumbnail in the overlay's 420:690
 * proportions means there is one (click opens it at stream size), the
 * crossed-out image icon means staff still have to ask.
 *
 * The sample photo is an inline SVG in the brand colours, the same stand-in
 * the app's own `/dev/ui` gallery uses.
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

const PLAYERS: { name: string; photo: string | null }[] = [
  { name: "Wooloo", photo: STREAM_PHOTO },
  { name: "Falinks", photo: null },
  { name: "Blaubeerkuchen", photo: STREAM_PHOTO },
  { name: "annegret", photo: null },
];

/** In a staff list: one mark per player, scanned down the column. */
export function ImStaffListe() {
  return (
    <div className="flex max-w-xs flex-col divide-y rounded-lg border">
      {PLAYERS.map((p) => (
        <div
          key={p.name}
          className="flex items-center justify-between gap-3 px-3 py-2"
        >
          <span className="font-semibold text-[15px]">{p.name}</span>
          <StreamPhotoMark photoUrl={p.photo} name={p.name} />
        </div>
      ))}
    </div>
  );
}

/** A photo on file: the thumbnail is a button that opens the picture. */
export function MitFoto() {
  return (
    <div className="flex items-center gap-2">
      <span className="font-semibold text-[15px]">Wooloo</span>
      <StreamPhotoMark photoUrl={STREAM_PHOTO} name="Wooloo" />
    </div>
  );
}

/** No photo yet: the muted crossed-out image icon. */
export function OhneFoto() {
  return (
    <div className="flex items-center gap-2">
      <span className="font-semibold text-[15px]">Falinks</span>
      <StreamPhotoMark photoUrl={null} name="Falinks" />
    </div>
  );
}
