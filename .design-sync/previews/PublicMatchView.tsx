import { PublicMatchView } from "buli-hub";
import { AVATAR_URL, asIdentity, STANDINGS } from "./_fixtures";

/* The whole `/match/[matchId]` page as a neutral visitor sees it before a
 * result exists (GO-LIVE-POLISH §4.4): back link, Spieltag · Division · Saison
 * eyebrow, the `A vs. B` headline, the pairing card with a centred "Offen" chip
 * and "Best of 3", the "Ergebnis wird nach der Meldung hier angezeigt." line,
 * and an informational EmptyStateCard instead of a bare sentence.
 *
 * Result-less for this viewer by definition — the reported branch is
 * `ReportSummary`. Two axes: the pairing (how the 40px headline and the
 * `truncate`d card names behave for short vs. long Discord names, avatar image
 * vs. initials fallback) and `state`: open, or played but under embargo (the
 * MotW before its VOD, a match held for a stream recording), where the chip
 * turns brand-tinted "Gespielt" and the copy says when the result comes.
 *
 * Composed at the match page's real column width (`max-w-3xl` ≈ its 760px);
 * `sm:` and up renders the desktop `A · Offen · B` row, the mobile stack is the
 * `sm:hidden` variant of the same card. Cell names sort so the canonical open
 * match comes first.
 */

/** The canonical open match: a ranked pairing on the running Spieltag, one
 *  player with an avatar and one on the initials fallback. */
export function OffenesMatch() {
  return (
    <div className="mx-auto max-w-3xl">
      <PublicMatchView
        round={2}
        groupName="Division 1a"
        seasonLabel="Saison 1"
        playerA={asIdentity(STANDINGS[0])}
        playerB={asIdentity(STANDINGS[1])}
      />
    </div>
  );
}

/** A long Discord name: the headline wraps to a second line (it is never
 *  truncated — the pairing is the page's title) while the pairing card truncates
 *  inside its grid column, so the "Offen" chip stays exactly on centre. */
export function PaarungMitLangenNamen() {
  return (
    <div className="mx-auto max-w-3xl">
      <PublicMatchView
        round={4}
        groupName="Division 2b"
        seasonLabel="Saison 1"
        playerA={{
          userId: "4",
          name: "Yannick mit sehr langem Namen",
          avatarUrl: null,
        }}
        playerB={{
          userId: "3",
          name: "Blaubeerkuchen",
          avatarUrl: AVATAR_URL,
        }}
      />
    </div>
  );
}

/** Match of the Week before its VOD: played, but the result is withheld from
 *  the public, so the chip says "Gespielt" and the card points at the VOD. */
export function ZurueckgehaltenBisVod() {
  return (
    <div className="mx-auto max-w-3xl">
      <PublicMatchView
        round={2}
        groupName="Division 1a"
        seasonLabel="Saison 1"
        playerA={asIdentity(STANDINGS[0])}
        playerB={asIdentity(STANDINGS[1])}
        state="played_motw"
      />
    </div>
  );
}

/** Held for a Gemeinde stream recording: same page, the copy waits for staff
 *  to release the result after the stream. */
export function ZurueckgehaltenFuerStream() {
  return (
    <div className="mx-auto max-w-3xl">
      <PublicMatchView
        round={3}
        groupName="Division 1b"
        seasonLabel="Saison 1"
        playerA={{ userId: "d", name: "Grafaiai", avatarUrl: null }}
        playerB={{ userId: "e", name: "Kilowattrel", avatarUrl: null }}
        state="played_recording"
      />
    </div>
  );
}
