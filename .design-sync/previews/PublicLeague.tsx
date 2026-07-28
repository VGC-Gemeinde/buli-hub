import { PublicLeague } from "buli-hub";
import { overviewWithoutMotw, PUBLIC_OVERVIEW } from "./_fixtures";

/* The full public league page: MotW block, division switcher, standings table
 * and the current matchday's fixtures. `meId` highlights the viewer's own row
 * („DU"). Wide by nature — cfg.overrides gives it cardMode:"column" and a
 * viewport at the component's own max-width (1040px + gutters), below which the
 * MotW block's player names wrap mid-word. */

export function LaufendeSaison() {
  return (
    <PublicLeague
      overview={PUBLIC_OVERVIEW}
      meId="me"
      initialSpoilersOff={false}
    />
  );
}

export function OhneMatchOfTheWeek() {
  return (
    <PublicLeague
      overview={overviewWithoutMotw()}
      meId="me"
      initialSpoilersOff={false}
    />
  );
}
