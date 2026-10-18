import { DropBanner, PublicMatchView } from "buli-hub";
import { asIdentity, STANDINGS } from "./_fixtures";

/* The match-page strip for a drop-decided match. It takes four required props
 * and builds its sentence from them — with no props the copy reads
 * "undefined wurde gedroppt", so always pass both names and the flags.
 *
 * Pawmi is the fixtures' dropped player (`STANDINGS`, `dropped: true`); a
 * single drop always counts as a 2:0 free win for the opponent, both drops as
 * a double loss. */

/** The common case: one player dropped, the opponent gets the free win. */
export function Freewin() {
  return (
    <div className="max-w-xl">
      <DropBanner
        playerAName="Pawmi"
        playerBName="Testerino"
        aDropped
        bDropped={false}
      />
    </div>
  );
}

/** Both participants dropped — nobody is awarded the win. */
export function Doppelniederlage() {
  return (
    <div className="max-w-xl">
      <DropBanner playerAName="Pawmi" playerBName="Falinks" aDropped bDropped />
    </div>
  );
}

/** In place on the match page: the banner sits at the top of the page column,
 *  above everything else. A drop-decided match is not reportable, so for a
 *  neutral visitor the open pairing page follows it. */
export function AufDerMatchseite() {
  return (
    <div className="mx-auto max-w-3xl">
      <DropBanner
        playerAName="Pawmi"
        playerBName="Testerino"
        aDropped
        bDropped={false}
      />
      <PublicMatchView
        round={3}
        groupName="Division 1a"
        seasonLabel="Saison 1"
        playerA={{ userId: "c", name: "Pawmi", avatarUrl: null }}
        playerB={asIdentity(STANDINGS[0])}
      />
    </div>
  );
}
