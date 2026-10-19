import { RecordingBanner } from "buli-hub";

/* The recording strip at the top of `/match/[matchId]`
 * (docs/plans/recording-holds.md): staff record this match for the Gemeinde
 * stream, so the result follows afterwards. The MotW banner's anatomy (badge,
 * Spieltag eyebrow, optional not-public chip, explanatory line) in navy
 * instead of orange, so the two never read as the same feature.
 *
 * Composed at the match page's column width (`max-w-[760px]`).
 */

/** What every viewer sees: the match is being recorded, the result follows
 *  once the stream is over. */
export function Banner() {
  return (
    <div className="max-w-[760px]">
      <RecordingBanner round={3} />
    </div>
  );
}

/** A participant without a stream photo: the result is visible to them
 *  (chip "Noch nicht öffentlich"), plus the one-line nudge to upload a
 *  picture in the profile. */
export function MitFotoHinweis() {
  return (
    <div className="max-w-[760px]">
      <RecordingBanner round={3} notPublic photoHint />
    </div>
  );
}

/** After the regular season the eyebrow names the week ("Woche 1") instead
 *  of a Spieltag. */
export function NachDerSaison() {
  return (
    <div className="max-w-[760px]">
      <RecordingBanner round={7} weekName="Woche 1" />
    </div>
  );
}

/** Staff or one of the two players looking at a held result: the chip says
 *  why they see it anyway. */
export function NichtOeffentlich() {
  return (
    <div className="max-w-[760px]">
      <RecordingBanner round={3} notPublic />
    </div>
  );
}
