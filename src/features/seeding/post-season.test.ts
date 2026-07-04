import { describe, expect, it } from "vitest";
import {
  assignZones,
  type DivisionForValidation,
  divisionModeAvailable,
  effectiveMovement,
  validatePostSeason,
} from "./post-season";

// A division-config builder with sane defaults; override what a case needs.
const div = (
  tier: number,
  o: Partial<DivisionForValidation> = {},
): DivisionForValidation => ({
  tier,
  relevantTable: "sub_division",
  guaranteedPromotions: 0,
  guaranteedDemotions: 0,
  promotionPlayoffSlots: 0,
  demotionPlayoffSlots: 0,
  groupSizes: [8, 8],
  ...o,
});

const kinds = (divisions: DivisionForValidation[]) =>
  validatePostSeason(divisions).map((i) => i.kind);

describe("divisionModeAvailable", () => {
  it("needs at least two equal-size groups", () => {
    expect(divisionModeAvailable([8, 8, 8])).toBe(true);
    expect(divisionModeAvailable([8, 7, 8])).toBe(false);
    expect(divisionModeAvailable([8])).toBe(false);
    expect(divisionModeAvailable([])).toBe(false);
  });
});

describe("effectiveMovement", () => {
  it("scales per-group counts by the group count in sub_division mode", () => {
    const d = div(2, {
      guaranteedPromotions: 1,
      guaranteedDemotions: 2,
      groupSizes: [8, 8, 8],
    });
    expect(effectiveMovement(d)).toEqual({ promotions: 3, demotions: 6 });
  });

  it("uses the counts as-is in division mode", () => {
    const d = div(2, {
      relevantTable: "division",
      guaranteedPromotions: 3,
      guaranteedDemotions: 6,
      groupSizes: [8, 8, 8],
    });
    expect(effectiveMovement(d)).toEqual({ promotions: 3, demotions: 6 });
  });
});

describe("validatePostSeason", () => {
  it("accepts a balanced three-tier chain (sub_division, 2 groups each)", () => {
    // top demotes 1/group (2 total) = middle promotes 1/group (2); middle
    // demotes 1/group (2) = bottom promotes 1/group (2).
    const divisions = [
      div(1, { guaranteedDemotions: 1, demotionPlayoffSlots: 1 }),
      div(2, {
        guaranteedPromotions: 1,
        guaranteedDemotions: 1,
        promotionPlayoffSlots: 1,
        demotionPlayoffSlots: 1,
      }),
      div(3, { guaranteedPromotions: 1, promotionPlayoffSlots: 1 }),
    ];
    expect(validatePostSeason(divisions)).toEqual([]);
  });

  it("flags an imbalance when demotions(t) ≠ promotions(t+1)", () => {
    const divisions = [
      div(1, { guaranteedDemotions: 2 }), // 2×2 = 4 demoted
      div(2, { guaranteedPromotions: 1, promotionPlayoffSlots: 1 }), // 1×2 = 2 promoted
    ];
    expect(kinds(divisions)).toContain("balance");
  });

  it("balances across divisions with different group counts (totals, not per-group)", () => {
    // Div1: 2 groups demote 3/group = 6 total. Div2: 3 groups promote 2/group = 6.
    const divisions = [
      div(1, { guaranteedDemotions: 3, groupSizes: [8, 8] }),
      div(2, {
        guaranteedPromotions: 2,
        promotionPlayoffSlots: 1,
        groupSizes: [8, 8, 8],
      }),
    ];
    expect(validatePostSeason(divisions)).toEqual([]);
  });

  it("balances a division-mode neighbour against a sub_division total", () => {
    // Div1 sub_division: 3 groups demote 1/group = 3. Div2 division mode: promote 3.
    const divisions = [
      div(1, { guaranteedDemotions: 1, groupSizes: [8, 8, 8] }),
      div(2, {
        relevantTable: "division",
        guaranteedPromotions: 3,
        promotionPlayoffSlots: 1,
        groupSizes: [8, 8, 8],
      }),
    ];
    expect(validatePostSeason(divisions)).toEqual([]);
  });

  it("rejects division mode when groups are unequal", () => {
    const divisions = [
      div(1, { guaranteedDemotions: 3 }),
      div(2, {
        relevantTable: "division",
        guaranteedPromotions: 3,
        promotionPlayoffSlots: 1,
        groupSizes: [8, 7, 8],
      }),
    ];
    expect(kinds(divisions)).toContain("division_mode_invalid");
  });

  it("flags over-capacity (zones exceed the smallest group)", () => {
    const divisions = [
      div(1, { guaranteedDemotions: 1 }),
      // 3 + 2 + 2 + 3 = 10 zones per group but the smallest group is 4.
      div(2, {
        guaranteedPromotions: 3,
        guaranteedDemotions: 3,
        promotionPlayoffSlots: 2,
        demotionPlayoffSlots: 2,
        groupSizes: [8, 4],
      }),
      div(3, { guaranteedPromotions: 3 }),
    ];
    expect(kinds(divisions)).toContain("capacity");
  });

  it("flags promotion at the top tier and demotion at the lowest", () => {
    const divisions = [
      div(1, { guaranteedPromotions: 1, guaranteedDemotions: 1 }),
      div(2, { guaranteedPromotions: 1, guaranteedDemotions: 1 }),
    ];
    const result = validatePostSeason(divisions);
    const boundaries = result.filter((i) => i.kind === "boundary");
    expect(boundaries.map((i) => (i as { tier: number }).tier).sort()).toEqual([
      1, 2,
    ]);
  });

  it("accepts a promotion path via playoff with zero guaranteed promotions", () => {
    // Middle division: 0 guaranteed promotions, but a promotion playoff slot.
    const divisions = [
      div(1, { guaranteedDemotions: 1 }),
      div(2, {
        guaranteedDemotions: 1,
        promotionPlayoffSlots: 1, // promotion path
        demotionPlayoffSlots: 1,
      }),
      div(3, { guaranteedPromotions: 1, promotionPlayoffSlots: 1 }),
    ];
    // top demotes 2, middle promotes 0 guaranteed → balance 2 ≠ 0.
    // Fix balance: top has 0 guaranteed demotions instead, path via playoff.
    const balanced = [
      div(1, { demotionPlayoffSlots: 1 }),
      div(2, { promotionPlayoffSlots: 1, demotionPlayoffSlots: 1 }),
      div(3, { promotionPlayoffSlots: 1 }),
    ];
    expect(validatePostSeason(balanced)).toEqual([]);
    // The first list is unbalanced but has no missing-path issue.
    expect(kinds(divisions)).not.toContain("missing_promotion_path");
  });

  it("flags a middle division with neither guaranteed spot nor playoff slot", () => {
    const divisions = [
      div(1, { demotionPlayoffSlots: 1 }),
      div(2, {}), // no promotion path and no demotion path
      div(3, { promotionPlayoffSlots: 1 }),
    ];
    expect(kinds(divisions)).toContain("missing_promotion_path");
    expect(kinds(divisions)).toContain("missing_demotion_path");
  });

  it("needs no promotion path at the top nor demotion path at the lowest", () => {
    const divisions = [
      div(1, { demotionPlayoffSlots: 1 }), // top: only a demotion path
      div(2, { promotionPlayoffSlots: 1 }), // lowest: only a promotion path
    ];
    expect(validatePostSeason(divisions)).toEqual([]);
  });
});

describe("assignZones", () => {
  it("lays promotion, playoff and demotion bands with a gap in the middle", () => {
    const zones = assignZones({
      rowCount: 8,
      promotions: 1,
      promotionPlayoff: 1,
      demotionPlayoff: 1,
      demotions: 1,
    });
    expect(zones).toEqual([
      "promote",
      "promotion_playoff",
      "none",
      "none",
      "none",
      "none",
      "demotion_playoff",
      "demote",
    ]);
  });

  it("is all none when there is no movement", () => {
    expect(
      assignZones({
        rowCount: 4,
        promotions: 0,
        promotionPlayoff: 0,
        demotionPlayoff: 0,
        demotions: 0,
      }),
    ).toEqual(["none", "none", "none", "none"]);
  });

  it("partitions cleanly when bands meet with no gap", () => {
    const zones = assignZones({
      rowCount: 4,
      promotions: 1,
      promotionPlayoff: 1,
      demotionPlayoff: 1,
      demotions: 1,
    });
    expect(zones).toEqual([
      "promote",
      "promotion_playoff",
      "demotion_playoff",
      "demote",
    ]);
  });
});
