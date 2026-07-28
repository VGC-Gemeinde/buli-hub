import { PublicMatchView } from "buli-hub";
import { asIdentity, AVATAR_URL, STANDINGS } from "./_fixtures";

/* The whole `/match/[matchId]` page as a neutral visitor sees it before a
 * result exists (GO-LIVE-POLISH §4.4): back link, Spieltag · Division · Saison
 * eyebrow, the `A vs. B` headline, the pairing card with a centred „Offen" chip
 * and „Best of 3", the „Ergebnis wird nach der Meldung hier angezeigt." line,
 * and an informational EmptyStateCard instead of a bare sentence.
 *
 * Result-less by definition — there is no reported branch here, that is
 * `ReportSummary`. So the variant axis is the pairing: how the 40px headline and
 * the `truncate`d card names behave for short vs. long Discord names, and the
 * avatar image vs. initials fallback.
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
 *  inside its grid column, so the „Offen" chip stays exactly on centre. */
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
