// Pure post-season logic: promotion/demotion rules per division, their
// validation, and the zone a standings row falls into. No DB access — see
// docs/plans/post-season-setup.md.

export type RelevantTable = "sub_division" | "division";

// The zone a player's row sits in, from the top of the (relevant) table down.
// `champion` is the Division-1 title playoff, above promotion.
export type Zone =
  | "champion"
  | "promote"
  | "promotion_playoff"
  | "demotion_playoff"
  | "demote"
  | "none";

// A division's post-season config. Counts are per group in `sub_division` mode
// and per division in `division` mode.
export type DivisionPostSeason = {
  relevantTable: RelevantTable;
  guaranteedPromotions: number;
  guaranteedDemotions: number;
  promotionPlayoffSlots: number;
  demotionPlayoffSlots: number;
  // Title-playoff slots — only the top tier (Division 1).
  championshipPlayoffSlots: number;
};

// A division as seen by validation: its config plus the structural facts the
// rules need — the roster size of each of its groups (ordered).
export type DivisionForValidation = DivisionPostSeason & {
  tier: number;
  groupSizes: readonly number[];
};

// A division supports the global-division-table mode only with at least two
// groups, all the same size (mirrors `divisionStandings`).
export function divisionModeAvailable(groupSizes: readonly number[]): boolean {
  return (
    groupSizes.length >= 2 && groupSizes.every((size) => size === groupSizes[0])
  );
}

// The effective totals of guaranteed movement for a division — what the balance
// invariant compares. Per-group counts scale by the group count; per-division
// counts are already totals.
export function effectiveMovement(division: DivisionForValidation): {
  promotions: number;
  demotions: number;
} {
  if (division.relevantTable === "division") {
    return {
      promotions: division.guaranteedPromotions,
      demotions: division.guaranteedDemotions,
    };
  }
  const groups = division.groupSizes.length;
  return {
    promotions: division.guaranteedPromotions * groups,
    demotions: division.guaranteedDemotions * groups,
  };
}

// The zones occupy per group (`sub_division`) or per division (`division`).
function zoneSpan(division: DivisionForValidation): number {
  return (
    division.championshipPlayoffSlots +
    division.guaranteedPromotions +
    division.promotionPlayoffSlots +
    division.demotionPlayoffSlots +
    division.guaranteedDemotions
  );
}

// The capacity the zones must fit into: the smallest group in `sub_division`
// mode (the per-group counts apply to every group), the whole division in
// `division` mode.
function zoneCapacity(division: DivisionForValidation): number {
  if (division.relevantTable === "division") {
    return division.groupSizes.reduce((sum, size) => sum + size, 0);
  }
  return division.groupSizes.length === 0
    ? 0
    : Math.min(...division.groupSizes);
}

export type PostSeasonIssue =
  // demotions(t) ≠ promotions(t+1) between adjacent tiers.
  | { kind: "balance"; upperTier: number; lowerTier: number }
  // zones exceed the group / division capacity.
  | { kind: "capacity"; tier: number }
  // promotion at the top tier or demotion at the lowest — impossible movement.
  | { kind: "boundary"; tier: number }
  // `division` mode chosen where groups are not ≥2 and equal size.
  | { kind: "division_mode_invalid"; tier: number }
  // no promotion path (neither a guaranteed spot nor a playoff slot).
  | { kind: "missing_promotion_path"; tier: number }
  // no demotion path.
  | { kind: "missing_demotion_path"; tier: number }
  // championship playoff set on a division that is not the top tier.
  | { kind: "championship_not_top"; tier: number };

// Validates a whole window's post-season config. Divisions may be given in any
// order; they are sorted by tier (1 = top) internally. Returns every issue found
// (empty = valid). A valid config is what gates finalize.
export function validatePostSeason(
  divisions: readonly DivisionForValidation[],
): PostSeasonIssue[] {
  const issues: PostSeasonIssue[] = [];
  const sorted = [...divisions].sort((a, b) => a.tier - b.tier);
  if (sorted.length === 0) {
    return issues;
  }
  const topTier = sorted[0].tier;
  const lowestTier = sorted[sorted.length - 1].tier;

  for (const division of sorted) {
    const isTop = division.tier === topTier;
    const isLowest = division.tier === lowestTier;

    // The top can't promote, the lowest can't demote — neither guaranteed nor
    // via playoff.
    if (
      (isTop &&
        (division.guaranteedPromotions > 0 ||
          division.promotionPlayoffSlots > 0)) ||
      (isLowest &&
        (division.guaranteedDemotions > 0 || division.demotionPlayoffSlots > 0))
    ) {
      issues.push({ kind: "boundary", tier: division.tier });
    }

    // Every division except the top needs a promotion path; every division
    // except the lowest needs a demotion path.
    if (
      !isTop &&
      division.guaranteedPromotions === 0 &&
      division.promotionPlayoffSlots === 0
    ) {
      issues.push({ kind: "missing_promotion_path", tier: division.tier });
    }
    if (
      !isLowest &&
      division.guaranteedDemotions === 0 &&
      division.demotionPlayoffSlots === 0
    ) {
      issues.push({ kind: "missing_demotion_path", tier: division.tier });
    }

    if (
      division.relevantTable === "division" &&
      !divisionModeAvailable(division.groupSizes)
    ) {
      issues.push({ kind: "division_mode_invalid", tier: division.tier });
    }

    // The championship playoff only makes sense at the top — it decides the
    // overall champion, and only Division 1 has no promotion to compete with.
    if (!isTop && division.championshipPlayoffSlots > 0) {
      issues.push({ kind: "championship_not_top", tier: division.tier });
    }

    if (zoneSpan(division) > zoneCapacity(division)) {
      issues.push({ kind: "capacity", tier: division.tier });
    }
  }

  // Adjacent tiers must balance guaranteed movement: what tier t demotes is what
  // tier t+1 promotes.
  for (let i = 0; i < sorted.length - 1; i++) {
    const upper = sorted[i];
    const lower = sorted[i + 1];
    if (
      effectiveMovement(upper).demotions !== effectiveMovement(lower).promotions
    ) {
      issues.push({
        kind: "balance",
        upperTier: upper.tier,
        lowerTier: lower.tier,
      });
    }
  }

  return issues;
}

// Assigns a zone to every row of an ordered standings list (index 0 = 1st place).
// `promotions`/`demotions` and the playoff counts are the per-table counts (per
// group for a sub-division table, per division for a division table). Promotion
// bands are laid from the top, demotion bands from the bottom; on an
// over-capacity overlap the promotion side wins (validation prevents overlap in
// practice). Boundary ties (players level on rank across a zone edge) are resolved
// by the postseason tie feature, not here — this is purely positional.
export function assignZones(input: {
  rowCount: number;
  champion?: number;
  promotions: number;
  promotionPlayoff: number;
  demotionPlayoff: number;
  demotions: number;
}): Zone[] {
  const { rowCount, promotions, promotionPlayoff, demotionPlayoff, demotions } =
    input;
  const champion = input.champion ?? 0;
  const demoteStart = rowCount - demotions;
  const demotionPlayoffStart = demoteStart - demotionPlayoff;

  return Array.from({ length: rowCount }, (_, i): Zone => {
    if (i < champion) return "champion";
    if (i < champion + promotions) return "promote";
    if (i < champion + promotions + promotionPlayoff)
      return "promotion_playoff";
    if (i >= demoteStart) return "demote";
    if (i >= demotionPlayoffStart) return "demotion_playoff";
    return "none";
  });
}
