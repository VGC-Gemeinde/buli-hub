import { z } from "zod";

export const MIN_SUB_DIVISION_SIZE = 2;
export const MAX_SUB_DIVISION_SIZE = 24;
export const MIN_DIVISIONS = 1;
export const MAX_DIVISIONS = 20;

// „Division 1", „Division 2", …
export function divisionName(tier: number): string {
  return `Division ${tier}`;
}

// „Division 1a", „Division 1b", … — division tier + a letter for the 0-based
// group position.
export function subDivisionName(tier: number, position: number): string {
  return `Division ${subDivisionShortName(tier, position)}`;
}

// Short form „1a", „2c" — for tight columns/selects.
export function subDivisionShortName(tier: number, position: number): string {
  return `${tier}${String.fromCharCode(97 + position)}`;
}

// Generous upper bound for a promotion/demotion/playoff count; the real limit is
// the capacity check in `validatePostSeason` (zones must fit the group/division).
export const MAX_MOVEMENT = 99;

const movementCount = z.coerce
  .number({ error: "Ungültige Zahl" })
  .int()
  .min(0, "Mindestens 0")
  .max(MAX_MOVEMENT, `Höchstens ${MAX_MOVEMENT}`);

// One division's post-season config as submitted by the staff panel.
export const postSeasonDivisionSchema = z.object({
  divisionId: z.string().uuid(),
  relevantTable: z.enum(["sub_division", "division"]),
  guaranteedPromotions: movementCount,
  guaranteedDemotions: movementCount,
  promotionPlayoffSlots: movementCount,
  demotionPlayoffSlots: movementCount,
  championshipPlayoffSlots: movementCount,
});

export const postSeasonConfigSchema = z.array(postSeasonDivisionSchema);

export type PostSeasonDivisionInput = z.output<typeof postSeasonDivisionSchema>;

export const seedingConfigSchema = z.object({
  subDivisionSize: z.coerce
    .number({ error: "Ungültige Zahl" })
    .int()
    .min(MIN_SUB_DIVISION_SIZE, `Mindestens ${MIN_SUB_DIVISION_SIZE}`)
    .max(MAX_SUB_DIVISION_SIZE, `Höchstens ${MAX_SUB_DIVISION_SIZE}`),
  divisionCount: z.coerce
    .number({ error: "Ungültige Zahl" })
    .int()
    .min(MIN_DIVISIONS, `Mindestens ${MIN_DIVISIONS}`)
    .max(MAX_DIVISIONS, `Höchstens ${MAX_DIVISIONS}`),
});

export type SeedingConfig = z.output<typeof seedingConfigSchema>;
