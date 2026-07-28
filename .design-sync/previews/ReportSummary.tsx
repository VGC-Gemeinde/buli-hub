import { ReportSummary } from "buli-hub";
import type { StoredResult } from "@/features/reporting/queries";
import { asIdentity, STANDINGS } from "./_fixtures";

/* The read-only result page for a played match (design/MATCH-REPORTING.md §9–10
 * and design/SPOILER-SCHUTZ.md §3): back link, tick eyebrow „Ergebnis ·
 * Spieltag n · Division", the outcome headline with its status chip, the big
 * scoreboard (avatars 50px, names 28px, score 56px, orange „Sieger" tick), the
 * meta line, then the Spiele and Teamsheets sections.
 *
 * Two independent axes, both swept below:
 *   viewer      participant/staff (filled navy avatar, „Du"/„Gegner" sublabels,
 *               „Gemeldet von", free-win context) vs. neutral observer, who gets
 *               the objective A vs. B view with no report metadata at all
 *   spoilerMode none | default | motw — the SAME layout with masked slots, so
 *               replays, teamsheets and the match video stay usable unspoiled
 *
 * Not renderable statically: „Ergebnis aufdecken", „Wieder verdecken" and the
 * per-game pills are client `useState`. The covered cells are the state a page
 * loads in; `spoilerMode="none"` is what a reveal resolves to.
 *
 * Cell names sort so the canonical participant result comes first.
 */

const TESTERINO = asIdentity(STANDINGS[0]); // „me", avatar
const FALINKS = asIdentity(STANDINGS[1]); // „a", initials fallback

// The neutral cells get their own pairing: a neutral observer is by definition
// looking at somebody else's match, not at one „me" played.
const WOOLOO = asIdentity(STANDINGS[2]);
const GRAFAIAI = { userId: "d", name: "Grafaiai", avatarUrl: null };

const REPORTED_AT = new Date("2026-01-14T19:20:00Z");

const BASE = {
  playerATeamUrl: "https://pokepast.es/4f1c9ab2d7e0",
  playerBTeamUrl: "https://pokepast.es/8b3d05fe61ca",
  videoUrl: null,
  freeWinReason: null,
  discussedWithId: null,
  discussedWithName: null,
  reportedById: "me",
  reportedAt: REPORTED_AT,
  confirmedAt: null,
  correctedAt: null,
} as const;

const REPLAY = "https://replay.pokemonshowdown.com/gen9vgc2026regj-2214887301";

/** Showdown Bo3 that went the distance — Testerino 2:1. */
const SIEG: StoredResult = {
  ...BASE,
  outcome: "normal",
  winnerId: "me",
  platform: "showdown",
  games: [
    { gameNumber: 1, winnerId: "me", replayUrl: `${REPLAY}-1` },
    { gameNumber: 2, winnerId: "a", replayUrl: `${REPLAY}-2` },
    { gameNumber: 3, winnerId: "me", replayUrl: `${REPLAY}-3` },
  ],
};

/** The mirror image — Falinks takes it 2:1. Drives the „Sieg für Falinks"
 *  headline the losing participant reads before filing an Anfechtung. */
const NIEDERLAGE: StoredResult = {
  ...SIEG,
  winnerId: "a",
  reportedById: "a",
  games: [
    { gameNumber: 1, winnerId: "a", replayUrl: `${REPLAY}-1` },
    { gameNumber: 2, winnerId: "me", replayUrl: `${REPLAY}-2` },
    { gameNumber: 3, winnerId: "a", replayUrl: `${REPLAY}-3` },
  ],
};

/** Grafaiai sweeps Wooloo 2:0 on Showdown — only two games exist, so under an
 *  active spoiler mode the page appends a phantom third row (same anatomy,
 *  game 2's replay borrowed) and the row count betrays nothing (§3.6). */
const SWEEP: StoredResult = {
  ...BASE,
  outcome: "normal",
  winnerId: "d",
  platform: "showdown",
  reportedById: "d",
  games: [
    { gameNumber: 1, winnerId: "d", replayUrl: `${REPLAY}-1` },
    { gameNumber: 2, winnerId: "d", replayUrl: `${REPLAY}-2` },
  ],
};

/** The same pairing on cartridge: no replays exist there at all, so the match
 *  video is the whole spoiler-free offering and gets its own card. */
const CARTRIDGE: StoredResult = {
  ...BASE,
  outcome: "normal",
  winnerId: "d",
  platform: "cartridge",
  videoUrl: "https://www.youtube.com/watch?v=vgc-bundesliga-s1-st3",
  reportedById: "d",
  games: [
    { gameNumber: 1, winnerId: "d", replayUrl: null },
    { gameNumber: 2, winnerId: "b", replayUrl: null },
    { gameNumber: 3, winnerId: "d", replayUrl: null },
  ],
};

/** The Match of the Week: a Showdown Bo3 whose recording is already up, so the
 *  covered page can point at the VOD („erst das VOD ansehen"). */
const MOTW_RESULT: StoredResult = {
  ...SIEG,
  videoUrl: "https://www.youtube.com/watch?v=vgc-bundesliga-s1-st2",
};

/** Free win awaiting staff confirmation: no games, no teamsheets — the context
 *  fields carry the whole story instead. */
const FREEWIN: StoredResult = {
  ...BASE,
  outcome: "free_win",
  winnerId: "me",
  platform: null,
  playerATeamUrl: null,
  playerBTeamUrl: null,
  freeWinReason:
    "Gegner war trotz mehrerer Terminvorschläge über die ganze Woche nicht erreichbar.",
  discussedWithId: "staff1",
  discussedWithName: "Orga Team",
  games: [],
};

/** Participant view of a normal result: „Sieg für dich", Final chip, the filled
 *  navy avatar plus „Du"/„Gegner" sublabels, „Gemeldet von" in the meta line,
 *  three game rows with real replay affordances, two pokepaste cards. */
export function Ergebnis() {
  return (
    <div className="mx-auto max-w-3xl">
      <ReportSummary
        result={SIEG}
        playerA={TESTERINO}
        playerB={FALINKS}
        viewerId="me"
        privileged
        round={2}
        groupName="Division 1a"
      />
    </div>
  );
}

/** An open dispute flips the status chip Final → Angefochten in destructive red
 *  (§4.4) — shown from the losing participant's side, the perspective an
 *  Anfechtung is actually filed from. Only participants and staff ever see it. */
export function ErgebnisAngefochten() {
  return (
    <div className="mx-auto max-w-3xl">
      <ReportSummary
        result={NIEDERLAGE}
        playerA={TESTERINO}
        playerB={FALINKS}
        viewerId="me"
        privileged
        disputed
        round={2}
        groupName="Division 1a"
      />
    </div>
  );
}

/** Free win, not yet confirmed: orange „Wartet auf Staff" chip, the „Noch nicht
 *  gewertet" banner, the walkover 2:0 scoreboard and the privileged context
 *  stack (Begründung · Besprochen mit · Gemeldet). */
export function Freewin() {
  return (
    <div className="mx-auto max-w-3xl">
      <ReportSummary
        result={FREEWIN}
        playerA={TESTERINO}
        playerB={FALINKS}
        viewerId="me"
        privileged
        round={4}
        groupName="Division 1a"
      />
    </div>
  );
}

/** Match of the Week, covered: identical masking to the ordinary cover, only the
 *  notice copy changes — and this cover ignores the global spoiler switch, so it
 *  is what every neutral viewer gets until they choose to reveal. The VOD is
 *  linked in the Teamsheets section as „Video zum Match": watch first, reveal
 *  after. */
export function MatchOfTheWeekVerdeckt() {
  return (
    <div className="mx-auto max-w-3xl">
      <ReportSummary
        result={MOTW_RESULT}
        playerA={TESTERINO}
        playerB={FALINKS}
        viewerId={null}
        privileged={false}
        round={2}
        groupName="Division 1a"
        backHref="/"
        backLabel="Zur Übersicht"
        spoilerMode="motw"
      />
    </div>
  );
}

/** Neutral observer on somebody else's cartridge match: objective „Sieg für
 *  Grafaiai", no „Du" framing, no reporter and no free-win context — just the
 *  result. Cartridge means no replay buttons anywhere; the match video is the
 *  third card under Teamsheets. */
export function NeutraleSicht() {
  return (
    <div className="mx-auto max-w-3xl">
      <ReportSummary
        result={CARTRIDGE}
        playerA={WOOLOO}
        playerB={GRAFAIAI}
        viewerId={null}
        privileged={false}
        round={3}
        groupName="Division 1b"
        backHref="/"
        backLabel="Zur Übersicht"
      />
    </div>
  );
}

/** The site-wide spoiler cover, neutral viewer: the headline falls back to the
 *  neutral pairing, the score becomes the masked `– : –` button in its reserved
 *  slot, the winner markers wait in blank reserved rows, and every game hides its
 *  winner behind its own pill while its replay stays clickable. This series was
 *  a 2:0 — Spiel 3 is the phantom row that keeps the count from betraying it and
 *  becomes the dashed „Nicht gespielt" ghost once revealed. */
export function SpoilerVerdeckt() {
  return (
    <div className="mx-auto max-w-3xl">
      <ReportSummary
        result={SWEEP}
        playerA={WOOLOO}
        playerB={GRAFAIAI}
        viewerId={null}
        privileged={false}
        round={2}
        groupName="Division 1b"
        backHref="/"
        backLabel="Zur Übersicht"
        spoilerMode="default"
      />
    </div>
  );
}
