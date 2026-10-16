import { sql } from "drizzle-orm";
import { matches } from "@/db/schema";

// Player A of a regular round-robin match, typed non-null. A relegation or
// playoff match has no players until its pairings are published, so the
// column itself is nullable; the `matches_regular_shape` check guarantees
// player A for every regular match. Select this instead of
// `matches.playerAId` only in a query that is restricted to regular matches
// (through `matches.subDivisionId`, which only regular matches have).
export const regularPlayerAId = sql<string>`${matches.playerAId}`.mapWith(
  matches.playerAId,
);
