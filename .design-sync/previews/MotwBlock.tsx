import { MotwBlock } from "buli-hub";
import { MOTW_BLOCK } from "./_fixtures";

/* The Match-of-the-Week billboard on the public league overview (design/
 * MATCH-OF-THE-WEEK.md §2) — the league's one editorial moment per week and the
 * only dark panel on the page: navy fill, 3px orange top strip, rotated logo
 * watermark, `A · state · B` broadcast row with the players' current Platz.
 *
 * The variant axis is the centre state box, which keeps a fixed `h-[74px]
 * min-w-[190px]` footprint so none of these three renders relayouts the card:
 * running → covered result → covered result with a VOD button in the footer.
 *
 * Not renderable statically: the fourth state, „aufgedeckt" (the 46px score),
 * lives behind the component's own `useState` reveal click.
 */

const VOD = "https://www.youtube.com/watch?v=vgc-bundesliga-s1-st2";

/** Reported and covered — the default a visitor meets. The reveal button sits
 *  exactly where the score will appear, captioned „Spoiler-Schutz — erst das
 *  VOD ansehen"; the footer holds the dashed „VOD folgt" placeholder. */
export function Billboard() {
  return <MotwBlock motw={MOTW_BLOCK} />;
}

/** While the Spieltag runs: „Läuft diese Woche" pill + „Best of 3" caption,
 *  nothing to reveal yet. */
export function LaeuftDieseWoche() {
  return (
    <MotwBlock
      motw={{
        ...MOTW_BLOCK,
        match: {
          ...MOTW_BLOCK.match,
          reported: false,
          scoreA: null,
          scoreB: null,
          winnerId: null,
        },
      }}
    />
  );
}

/** VOD linked: the dashed placeholder becomes the orange „Auf YouTube ansehen"
 *  button in the same footprint — the result stays covered so the video is the
 *  first thing a visitor sees. */
export function MitVod() {
  return <MotwBlock motw={{ ...MOTW_BLOCK, youtubeUrl: VOD }} />;
}
