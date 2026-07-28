import { MotwMatchBanner } from "buli-hub";

/* The Match-of-the-Week strip at the top of `/match/[matchId]` (design/
 * MATCH-OF-THE-WEEK.md §4.1): orange-tinted `rounded-xl` bar carrying the MOTW
 * badge, the Spieltag eyebrow and — once the recording is up — the YouTube CTA
 * pushed right with `ml-auto`. Server-rendered and shown to every viewer; the
 * spoiler reveal itself lives inline in `ReportSummary`, not here.
 *
 * Deliberately has NO placeholder when the link is missing: the overview
 * billboard owns the „VOD folgt" slot, so this bar simply stays quiet.
 *
 * Wrapped at the real match page's column width (`max-w-3xl` ≈ the page's
 * 760px) so the `ml-auto` button lands where it does in production.
 */

const VOD = "https://www.youtube.com/watch?v=vgc-bundesliga-s1-st2";

/** Right after the pick, before the recording is uploaded: badge + Spieltag
 *  only. The bar is a marker, not an action. */
export function Banner() {
  return (
    <div className="mx-auto max-w-3xl">
      <MotwMatchBanner round={2} youtubeUrl={null} />
    </div>
  );
}

/** VOD linked: the orange `size="sm"` button with white label joins on the
 *  right — the one call to action on the match page above the result. */
export function MitVod() {
  return (
    <div className="mx-auto max-w-3xl">
      <MotwMatchBanner round={2} youtubeUrl={VOD} />
    </div>
  );
}
