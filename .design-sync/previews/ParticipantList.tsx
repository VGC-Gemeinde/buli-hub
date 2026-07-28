import { ParticipantList } from "buli-hub";
import { AVATAR_URL, ROSTER } from "./_fixtures";

/* The Teilnehmerfeld block of the Spieler-Dashboard: who is registered for the
 * season, visible from the opening of the registration until the season starts.
 * Identity only — the registration answers stay between player and staff — and
 * strictly alphabetical, so the list never reads as a sign-up ranking. The
 * count in the section header comes from `players.length`; the empty state is
 * the component's own informational EmptyStateCard.
 * Ported from the dev/ui gallery („Dashboard: Teilnehmerfeld"). */

/* A full field: the grid is `auto-fill minmax(140px, 1fr)`, so it only shows
 * its own rhythm once there are enough names to wrap. Same shape as the shared
 * ROSTER fixture (id / name / optional avatarUrl). */
const FULL_FIELD = [
  { id: "p01", name: "Testerino", avatarUrl: AVATAR_URL },
  { id: "p02", name: "annegret" },
  { id: "p03", name: "Blaubeerkuchen" },
  { id: "p04", name: "AltHase", avatarUrl: AVATAR_URL },
  { id: "p05", name: "Kuro" },
  { id: "p06", name: "Falinks" },
  { id: "p07", name: "Wooloo", avatarUrl: AVATAR_URL },
  { id: "p08", name: "Pawmi" },
  { id: "p09", name: "Grafaiai" },
  { id: "p10", name: "Kilowattrel", avatarUrl: AVATAR_URL },
  { id: "p11", name: "Maushold" },
  { id: "p12", name: "Tinkatink" },
  { id: "p13", name: "Yannick mit sehr langem Namen" },
  { id: "p14", name: "Nico" },
  { id: "p15", name: "Luca", avatarUrl: AVATAR_URL },
  { id: "p16", name: "Mika" },
  { id: "p17", name: "Sora" },
  { id: "p18", name: "Jonas" },
];

export function Teilnehmerfeld() {
  return <ParticipantList players={FULL_FIELD} seasonName="Saison 9" />;
}

/* Early in the registration week — a handful of names, the grid still in one
 * or two rows. */
export function ErsteAnmeldungen() {
  return <ParticipantList players={ROSTER} seasonName="Saison 9" />;
}

export function NochNiemandAngemeldet() {
  return <ParticipantList players={[]} seasonName="Saison 9" />;
}
