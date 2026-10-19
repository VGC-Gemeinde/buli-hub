import { MotwMatchBanner, StreamPhotoHint } from "buli-hub";

/* The one nudge the stream-photo feature allows
 * (docs/plans/stream-photos.md): a line in the banner of a featured or
 * recorded match, shown only to its two players while they have no stream
 * photo. No card, no todo, no reminder; it links to `/profil`.
 */

/** The line on its own, at the match page's column width. */
export function Hinweis() {
  return (
    <div className="max-w-[760px]">
      <StreamPhotoHint />
    </div>
  );
}

/** Its real home: the last line of the Match-of-the-Week banner a
 *  participant sees before the VOD is up. */
export function ImMotwBanner() {
  return (
    <div className="max-w-[760px]">
      <MotwMatchBanner round={2} youtubeUrl={null} notPublic photoHint />
    </div>
  );
}
