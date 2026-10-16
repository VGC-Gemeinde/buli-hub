// "Relegation und Playoffs veröffentlichen" (docs/plans/relegation-and-playoffs.md):
// what must be settled first, and what the one click writes. Publishing
// closes the regular season (its results become final), creates the
// tiebreaker matches and writes every seat whose holder is known into its
// match. Pure.

import type { FinalTable, TieDecision } from "@/features/final-table/places";

// Type-to-confirm phrase: it names what the click gives up, not what it does
// (the button says that).
export const PUBLISH_RELEGATION_PLAYOFFS_PHRASE = "Reguläre Saison abschließen";

export type PublishFacts = {
  // The schedule of Relegation und Playoffs exists.
  scheduleCreated: boolean;
  // The last regular Spieltag's deadline has passed.
  lastSpieltagOver: boolean;
  // Regular matches (no byes, none decided by a drop) without a result.
  unreported: number;
  openDisputes: number;
  pendingFreeWins: number;
  // Recording holds on regular matches.
  heldRegular: number;
  // Confirmed regular Matches of the Week still waiting for their VOD.
  motwWithoutVod: number;
  openReplacementOffers: number;
};

export type PublishBlocker = {
  kind:
    | "schedule"
    | "last_spieltag"
    | "unreported"
    | "disputes"
    | "free_wins"
    | "holds"
    | "motw_vod"
    | "replacements";
  label: string;
  href: string;
};

// What still stands between staff and publishing, in the order a checklist
// reads. Empty means the click is allowed.
export function publishBlockers(facts: PublishFacts): PublishBlocker[] {
  const blockers: PublishBlocker[] = [];
  const count = (n: number, one: string, many: string) =>
    n === 1 ? one : many.replace("{n}", String(n));
  if (!facts.scheduleCreated) {
    blockers.push({
      kind: "schedule",
      label: "Der Spielplan für Relegation und Playoffs fehlt",
      href: "/staff/relegation-playoffs",
    });
  }
  if (!facts.lastSpieltagOver) {
    blockers.push({
      kind: "last_spieltag",
      label: "Der letzte Spieltag läuft noch",
      href: "/staff/woche",
    });
  }
  if (facts.unreported > 0) {
    blockers.push({
      kind: "unreported",
      label: count(
        facts.unreported,
        "1 Match hat noch kein Ergebnis",
        "{n} Matches haben noch kein Ergebnis",
      ),
      href: "/staff/woche#ueberfaellig",
    });
  }
  if (facts.openDisputes > 0) {
    blockers.push({
      kind: "disputes",
      label: count(
        facts.openDisputes,
        "1 Ergebnis ist angefochten",
        "{n} Ergebnisse sind angefochten",
      ),
      href: "/staff/woche#angefochten",
    });
  }
  if (facts.pendingFreeWins > 0) {
    blockers.push({
      kind: "free_wins",
      label: count(
        facts.pendingFreeWins,
        "1 Freewin wartet auf Bestätigung",
        "{n} Freewins warten auf Bestätigung",
      ),
      href: "/staff/woche#freewins",
    });
  }
  if (facts.heldRegular > 0) {
    blockers.push({
      kind: "holds",
      label: count(
        facts.heldRegular,
        "1 Aufnahme hält ein Ergebnis zurück",
        "{n} Aufnahmen halten Ergebnisse zurück",
      ),
      href: "/staff/aufnahmen",
    });
  }
  if (facts.motwWithoutVod > 0) {
    blockers.push({
      kind: "motw_vod",
      label: count(
        facts.motwWithoutVod,
        "1 Match of the Week wartet auf das VOD",
        "{n} Matches of the Week warten auf das VOD",
      ),
      href: "/staff/motw",
    });
  }
  if (facts.openReplacementOffers > 0) {
    blockers.push({
      kind: "replacements",
      label: count(
        facts.openReplacementOffers,
        "1 Ersatzspieler-Angebot ist offen",
        "{n} Ersatzspieler-Angebote sind offen",
      ),
      href: "/staff/teilnehmer",
    });
  }
  return blockers;
}

export type TiebreakerToCreate = {
  tieKey: string;
  tier: number;
  // The first place the tie covers (0-based).
  position: number;
  playerAId: string;
  playerBId: string;
};

// The tiebreaker matches publishing creates: one per two-player tie at a
// zone boundary. Three or more wait for a staff order instead.
export function tiebreakersToCreate(
  tablesByTier: ReadonlyMap<number, readonly FinalTable[]>,
): TiebreakerToCreate[] {
  return [...tablesByTier.entries()]
    .sort(([a], [b]) => a - b)
    .flatMap(([, tables]) => tables.flatMap((table) => table.ties))
    .filter((tie) => tie.decision === "tiebreaker")
    .map((tie) => ({
      tieKey: tie.key,
      tier: tie.tier,
      position: tie.indexes[0],
      playerAId: tie.userIds[0],
      playerBId: tie.userIds[1],
    }));
}

// A tiebreaker as stored, with its counting result.
export type StoredTiebreaker = {
  tieKey: string;
  playerAId: string;
  playerBId: string;
  // null while nothing counts yet (unreported, or a free win still waiting
  // for staff).
  outcome: "won" | "double_loss" | null;
  winnerId: string | null;
};

// How each boundary tie is decided so far: a tiebreaker's winner ahead of
// its loser, a tiebreaker lost by both leaves its places empty, and a staff
// order for three or more.
export function tieDecisions(input: {
  tiebreakers: readonly StoredTiebreaker[];
  orders: readonly { tieKey: string; order: readonly string[] }[];
}): Map<string, TieDecision> {
  const decided = new Map<string, TieDecision>();
  for (const tiebreaker of input.tiebreakers) {
    if (tiebreaker.outcome === "double_loss") {
      decided.set(tiebreaker.tieKey, "vacant");
    } else if (tiebreaker.outcome === "won" && tiebreaker.winnerId) {
      const loser =
        tiebreaker.winnerId === tiebreaker.playerAId
          ? tiebreaker.playerBId
          : tiebreaker.playerAId;
      decided.set(tiebreaker.tieKey, [tiebreaker.winnerId, loser]);
    }
  }
  for (const order of input.orders) {
    decided.set(order.tieKey, order.order);
  }
  return decided;
}
