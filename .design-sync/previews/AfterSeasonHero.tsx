import { AfterSeasonHero } from "buli-hub";
import type { Identity } from "@/features/season/dashboard";
import { AVATAR_URL } from "./_fixtures";

/* The Spieler-Dashboard's hero after the regular season
 * (docs/plans/relegation-and-playoffs.md). Two shapes:
 *   match    the next Relegation / Playoff / Tiebreaker match: an orange-tinted
 *            panel, "me vs opponent", the report button and the stakes chips
 *            ("Sieg · ...", "Niederlage · ..."). An opponent not known yet is
 *            a dashed circle with what the side will be, and the button is
 *            disabled.
 *   outcome  the season result: a coloured mark tile (zone tokens: promote
 *            green, demote red, stays muted) with the next season's division;
 *            the champion gets the gold zone-champion panel with a trophy.
 * Specimens ported from the dev/ui gallery.
 */

const LUMI: Identity = { userId: "lumi", name: "Lumi", avatarUrl: AVATAR_URL };
const HENDRIK: Identity = {
  userId: "hendrik",
  name: "Hendrik",
  avatarUrl: null,
};
const SIRIUS: Identity = { userId: "sirius", name: "Sirius", avatarUrl: null };

/** Relegation against a known opponent, with what a win and a loss mean. */
export const AnstehendeRelegation = () => (
  <AfterSeasonHero
    season="Saison 9"
    me={LUMI}
    hero={{
      kind: "match",
      matchId: "rel-2",
      stage: "Relegation",
      opponent: { kind: "player", identity: HENDRIK },
      stakes: {
        win: "Aufstieg in Division 1",
        loss: "Klassenerhalt in Division 2",
      },
    }}
  />
);

/** Playoff final while the other semi-final is still open: the opponent is
 *  "Sieger HF 2" and reporting is not possible yet. */
export const AnstehendesFinaleGegnerOffen = () => (
  <AfterSeasonHero
    season="Saison 9"
    me={SIRIUS}
    hero={{
      kind: "match",
      matchId: "po-2",
      stage: "Playoffs · Finale",
      opponent: { kind: "open", label: "Sieger HF 2" },
      stakes: { win: "Meister", loss: "Vizemeister" },
    }}
  />
);

export const ErgebnisAufstieg = () => (
  <AfterSeasonHero
    season="Saison 9"
    me={LUMI}
    hero={{
      kind: "outcome",
      outcome: "promoted",
      champion: false,
      nextTier: 1,
    }}
  />
);

export const ErgebnisKlassenerhalt = () => (
  <AfterSeasonHero
    season="Saison 9"
    me={HENDRIK}
    hero={{ kind: "outcome", outcome: "stays", champion: false, nextTier: 2 }}
  />
);

export const ErgebnisAbstieg = () => (
  <AfterSeasonHero
    season="Saison 9"
    me={HENDRIK}
    hero={{ kind: "outcome", outcome: "demoted", champion: false, nextTier: 3 }}
  />
);

/** The champion: the gold panel instead of the outcome tile. */
export const ErgebnisMeister = () => (
  <AfterSeasonHero
    season="Saison 9"
    me={SIRIUS}
    hero={{ kind: "outcome", outcome: "stays", champion: true, nextTier: 1 }}
  />
);
