import { ReplacementNote } from "buli-hub";
import type { Identity } from "@/features/season/dashboard";
import { AVATAR_URL } from "./_fixtures";

/* The line under the Spieler-Dashboard title for either side of a
 * replacement (docs/plans/player-replacement.md): the other player's avatar,
 * a micro label with a tick (orange for the replacement, neutral for the
 * replaced player) and one sentence linking the other player's profile.
 */

const NACLI: Identity = { userId: "nacli", name: "Nacli", avatarUrl: null };
const FALINKS: Identity = {
  userId: "falinks",
  name: "Falinks",
  avatarUrl: AVATAR_URL,
};

/** The replacement: why their record starts with losses. */
export const ErsatzAbSpieltag2 = () => (
  <ReplacementNote kind="replacing" other={NACLI} entryRound={2} />
);

/** The replaced player: why they are no longer in the table. */
export const ErsetztAbSpieltag2 = () => (
  <ReplacementNote kind="replaced" other={FALINKS} entryRound={2} />
);
