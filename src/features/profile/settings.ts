import { z } from "zod";
import { isRegion, type Region } from "./regions";

// Normalization shared by both handles: trim, strip a leading @, empty → null.
const handleSchema = z
  .string()
  .trim()
  .max(100, "Maximal 100 Zeichen")
  .transform((value) => value.replace(/^@+/, ""))
  .transform((value) => (value === "" ? null : value));

export const profileSettingsSchema = z.object({
  twitterHandle: handleSchema,
  // Bluesky handles are domains and case-insensitive — store lowercase.
  blueskyHandle: handleSchema.transform(
    (value) => value?.toLowerCase() ?? null,
  ),
  origin: z
    .string()
    .trim()
    .max(100, "Maximal 100 Zeichen")
    .transform((value) => (value === "" ? null : value)),
  hasCaptureCard: z.boolean(),
});

export type ProfileSettings = z.output<typeof profileSettingsSchema>;
export type ProfileSettingsInput = z.input<typeof profileSettingsSchema>;

// Form state for the origin field: a fixed region in the select, or the
// "Andere" free-text branch, or nothing chosen yet.
export type OriginFormState =
  | { kind: "none" }
  | { kind: "region"; region: Region }
  | { kind: "other"; text: string };

export function originToFormState(origin: string | null): OriginFormState {
  if (origin === null || origin === "") {
    return { kind: "none" };
  }
  if (isRegion(origin)) {
    return { kind: "region", region: origin };
  }
  return { kind: "other", text: origin };
}
