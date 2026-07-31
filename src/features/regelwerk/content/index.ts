import { SAISON_9 } from "@/features/regelwerk/content/saison-9";
import type { RegelwerkDocument } from "@/features/regelwerk/content/types";

// Every published ruleset, keyed by the season it governs. Rules are hardcoded
// and ship as a commit (docs/plans/regelwerk.md); a new season adds a module
// here rather than editing the previous one, so an old ruleset stays exactly as
// the players agreed to it.
const DOCUMENTS: readonly RegelwerkDocument[] = [SAISON_9];

/**
 * The ruleset governing `seasonNumber`, or null if none is published yet.
 * `/regelwerk` serves the running season only — returning null is what keeps an
 * old Discord link from silently showing the wrong season's rules.
 */
export function regelwerkForSeason(
  seasonNumber: number,
): RegelwerkDocument | null {
  return (
    DOCUMENTS.find((document) => document.seasonNumber === seasonNumber) ?? null
  );
}

export { DOCUMENTS as ALL_REGELWERK_DOCUMENTS };
