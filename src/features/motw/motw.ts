import { z } from "zod";
import type {
  PublicDivision,
  PublicMatch,
} from "@/features/public-league/queries";

// Pure domain logic for the Match of the Week (never translated): the staff
// todo derivation, YouTube-URL validation, and locating the featured match
// inside an already-built public overview.

// A valid https YouTube link (watch page, short link, or live URL).
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
]);

export function isYoutubeUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return url.protocol === "https:" && YOUTUBE_HOSTS.has(url.hostname);
}

export const youtubeUrlSchema = z
  .string()
  .trim()
  .refine(isYoutubeUrl, "Bitte einen https-YouTube-Link angeben");

// The staff dashboard's MotW todo. The current Spieltag without a pick is the
// urgent case and replaces the next-week warning; otherwise staff are nudged
// to pick next week's match ahead of time. Null outside a running round or
// once everything (incl. the season's last round) is picked. Selecting is
// never a blocker for anything else — the todo is purely informational.
export type MotwTodo = {
  round: number;
  urgency: "warning" | "urgent";
} | null;

export function motwTodo(input: {
  currentRound: number | null;
  totalRounds: number;
  selectedRounds: ReadonlySet<number>;
}): MotwTodo {
  if (input.currentRound === null) {
    return null;
  }
  if (!input.selectedRounds.has(input.currentRound)) {
    return { round: input.currentRound, urgency: "urgent" };
  }
  const next = input.currentRound + 1;
  if (next <= input.totalRounds && !input.selectedRounds.has(next)) {
    return { round: next, urgency: "warning" };
  }
  return null;
}

// The rounds staff may pick a Match of the Week for: the current and (when the
// season is not on its last round) the next Spieltag. Empty outside a running
// season. Past rounds are deliberately not selectable — the feature is a
// weekly pick, not an archive editor.
export function selectableRounds(
  currentRound: number | null,
  totalRounds: number,
): Set<number> {
  if (currentRound === null) {
    return new Set();
  }
  const rounds = new Set([currentRound]);
  if (currentRound + 1 <= totalRounds) {
    rounds.add(currentRound + 1);
  }
  return rounds;
}

// Everything the public prominent block renders. `match.playerB` is guaranteed
// non-null (a bye cannot be selected). The ranks are the players' current
// standings ("Platz {n}" sub-lines) — taken from the table that decides the
// division (the Gesamttabelle in division mode, the group table otherwise).
export type MotwBlockData = {
  match: PublicMatch;
  groupName: string;
  youtubeUrl: string | null;
  rankA: number | null;
  rankB: number | null;
};

// Locates the selected match inside the built overview divisions — the block
// reuses the overview's identities/result state instead of re-querying. Null
// when the match is not part of the overview (should not happen for a
// consistent selection) or is a bye.
export function findMotw(
  divisions: readonly PublicDivision[],
  selection: { matchId: string; youtubeUrl: string | null },
): MotwBlockData | null {
  for (const division of divisions) {
    for (const group of division.groups) {
      const match = group.matches.find((m) => m.matchId === selection.matchId);
      if (!match) {
        continue;
      }
      if (match.playerB === null) {
        return null;
      }
      const table =
        division.mode === "division" && division.divisionStandings
          ? division.divisionStandings
          : group.standings;
      const rankOf = (userId: string) =>
        table.find((row) => row.userId === userId)?.rank ?? null;
      return {
        match,
        groupName: group.name,
        youtubeUrl: selection.youtubeUrl,
        rankA: rankOf(match.playerA.userId),
        rankB: rankOf(match.playerB.userId),
      };
    }
  }
  return null;
}
