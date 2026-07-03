import { z } from "zod";
import { type matchOutcomeEnum, platformEnum } from "@/db/schema";

// Pure logic for a player's match report: best-of-3 legality, the report form
// schema (a discriminated union over the outcome), and the mapping from the
// reporter-relative form input to absolute persistence rows.

export type Platform = (typeof platformEnum.enumValues)[number];
export type MatchOutcome = (typeof matchOutcomeEnum.enumValues)[number];

// A valid https pokepaste link. Team sheets must be pokepaste URLs.
export function isPokepasteUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    url.protocol === "https:" &&
    (url.hostname === "pokepast.es" || url.hostname === "www.pokepast.es")
  );
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export type SeriesResult =
  | { ok: true; winnerId: string; gamesPlayed: 2 | 3 }
  | {
      ok: false;
      reason:
        | "too_few"
        | "too_many"
        | "not_decisive"
        | "extra_game"
        | "unknown_player";
    };

// Best-of-3 derivation from the per-game winner ids. Legal series: each winner
// is one of the two participants and games are played until one side reaches 2.
export function deriveSeries(
  winners: readonly string[],
  playerAId: string,
  playerBId: string,
): SeriesResult {
  if (winners.length < 2) {
    return { ok: false, reason: "too_few" };
  }
  if (winners.length > 3) {
    return { ok: false, reason: "too_many" };
  }
  let a = 0;
  let b = 0;
  for (let i = 0; i < winners.length; i++) {
    if (winners[i] === playerAId) {
      a++;
    } else if (winners[i] === playerBId) {
      b++;
    } else {
      return { ok: false, reason: "unknown_player" };
    }
    // A decided series must end immediately — no game after 2 wins.
    if ((a === 2 || b === 2) && i !== winners.length - 1) {
      return { ok: false, reason: "extra_game" };
    }
  }
  if (a < 2 && b < 2) {
    return { ok: false, reason: "not_decisive" };
  }
  return {
    ok: true,
    winnerId: a === 2 ? playerAId : playerBId,
    gamesPlayed: winners.length as 2 | 3,
  };
}

const seriesMessages: Record<
  Extract<SeriesResult, { ok: false }>["reason"],
  string
> = {
  too_few: "Best-of-3 braucht mindestens zwei Spiele.",
  too_many: "Ein Best-of-3 hat höchstens drei Spiele.",
  not_decisive: "Bei 1:1 fehlt das entscheidende dritte Spiel.",
  extra_game: "Das Match war bereits entschieden.",
  unknown_player: "Unbekannter Spieler",
};

const platformValues = platformEnum.enumValues;

const gameInputSchema = z.object({
  winnerId: z.string().min(1),
  replayUrl: z.string().trim().optional(),
});

const normalSchema = z.object({
  outcome: z.literal("normal"),
  platform: z.enum(platformValues, { error: "Bitte eine Plattform wählen" }),
  games: z.array(gameInputSchema).min(2).max(3),
  playerATeamUrl: z.string().trim().min(1, "Pflichtfeld"),
  playerBTeamUrl: z.string().trim().min(1, "Pflichtfeld"),
  videoUrl: z.string().trim().nullish(),
});

const freeWinSchema = z.object({
  outcome: z.literal("free_win"),
  winnerId: z.string().min(1),
  freeWinReason: z
    .string()
    .trim()
    .min(1, "Bitte einen Grund angeben")
    .max(2000),
  discussedWithId: z.string().min(1, "Bitte einen Staff auswählen"),
});

const reportUnion = z.discriminatedUnion("outcome", [
  normalSchema,
  freeWinSchema,
]);

export type ReportInput = z.infer<typeof reportUnion>;

// The report form schema. Context is injected (participants for the free-win
// winner, a staff/admin predicate for „discussed with") so the schema stays a
// pure, testable function — mirroring the codebase's Zod-in-feature-.ts pattern.
export function reportSchema(context: {
  participants: { playerAId: string; playerBId: string };
  isStaffOrAdmin: (userId: string) => boolean;
}) {
  const { playerAId, playerBId } = context.participants;
  return reportUnion.superRefine((value, ctx) => {
    if (value.outcome === "normal") {
      const series = deriveSeries(
        value.games.map((game) => game.winnerId),
        playerAId,
        playerBId,
      );
      if (!series.ok) {
        ctx.addIssue({
          code: "custom",
          path: ["games"],
          message: seriesMessages[series.reason],
        });
      }
      if (value.platform === "showdown") {
        value.games.forEach((game, i) => {
          if (!game.replayUrl || !isHttpsUrl(game.replayUrl)) {
            ctx.addIssue({
              code: "custom",
              path: ["games", i, "replayUrl"],
              message: "Replay-Link erforderlich",
            });
          }
        });
        if (value.videoUrl) {
          ctx.addIssue({
            code: "custom",
            path: ["videoUrl"],
            message: "Ein Video-Link ist nur für Cartridge vorgesehen.",
          });
        }
      } else {
        if (value.videoUrl && !isHttpsUrl(value.videoUrl)) {
          ctx.addIssue({
            code: "custom",
            path: ["videoUrl"],
            message: "Ungültiger Link",
          });
        }
        value.games.forEach((game, i) => {
          if (game.replayUrl) {
            ctx.addIssue({
              code: "custom",
              path: ["games", i, "replayUrl"],
              message: "Replays gibt es nur für Showdown.",
            });
          }
        });
      }
      if (!isPokepasteUrl(value.playerATeamUrl)) {
        ctx.addIssue({
          code: "custom",
          path: ["playerATeamUrl"],
          message: "Bitte einen gültigen Pokepaste-Link angeben.",
        });
      }
      if (!isPokepasteUrl(value.playerBTeamUrl)) {
        ctx.addIssue({
          code: "custom",
          path: ["playerBTeamUrl"],
          message: "Bitte einen gültigen Pokepaste-Link angeben.",
        });
      }
    } else {
      if (value.winnerId !== playerAId && value.winnerId !== playerBId) {
        ctx.addIssue({
          code: "custom",
          path: ["winnerId"],
          message: "Unbekannter Spieler",
        });
      }
      if (!context.isStaffOrAdmin(value.discussedWithId)) {
        ctx.addIssue({
          code: "custom",
          path: ["discussedWithId"],
          message: "Bitte einen Staff auswählen",
        });
      }
    }
  });
}

export type ResultRow = {
  outcome: MatchOutcome;
  winnerId: string | null;
  platform: Platform | null;
  playerATeamUrl: string | null;
  playerBTeamUrl: string | null;
  videoUrl: string | null;
  freeWinReason: string | null;
  discussedWithId: string | null;
};

export type GameRow = {
  gameNumber: number;
  winnerId: string;
  replayUrl: string | null;
};

// Maps a validated report to persistence rows. Game winners are already
// absolute (the form picks a player), so the match winner is simply whoever won
// two games; `playerATeamUrl`/`playerBTeamUrl` are keyed to player A/B by the
// form and pass straight through.
export function toResultRows(input: ReportInput): {
  result: ResultRow;
  games: GameRow[];
} {
  if (input.outcome === "free_win") {
    return {
      result: {
        outcome: "free_win",
        winnerId: input.winnerId,
        platform: null,
        playerATeamUrl: null,
        playerBTeamUrl: null,
        videoUrl: null,
        freeWinReason: input.freeWinReason,
        discussedWithId: input.discussedWithId,
      },
      games: [],
    };
  }

  const wins = new Map<string, number>();
  for (const game of input.games) {
    wins.set(game.winnerId, (wins.get(game.winnerId) ?? 0) + 1);
  }
  const winnerId =
    [...wins.entries()].find(([, count]) => count >= 2)?.[0] ?? null;
  const games: GameRow[] = input.games.map((game, i) => ({
    gameNumber: i + 1,
    winnerId: game.winnerId,
    replayUrl: input.platform === "showdown" ? (game.replayUrl ?? null) : null,
  }));
  return {
    result: {
      outcome: "normal",
      winnerId,
      platform: input.platform,
      playerATeamUrl: input.playerATeamUrl,
      playerBTeamUrl: input.playerBTeamUrl,
      videoUrl:
        input.platform === "cartridge" ? (input.videoUrl ?? null) : null,
      freeWinReason: null,
      discussedWithId: null,
    },
    games,
  };
}
