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
  | { ok: true; winner: "reporter" | "opponent"; gamesPlayed: 2 | 3 }
  | {
      ok: false;
      reason: "too_few" | "too_many" | "not_decisive" | "extra_game";
    };

// Best-of-3 derivation from the reporter's per-game wins (true = reporter won
// that game). Legal series: play exactly until one side reaches 2 wins.
export function deriveSeries(games: readonly boolean[]): SeriesResult {
  if (games.length < 2) {
    return { ok: false, reason: "too_few" };
  }
  if (games.length > 3) {
    return { ok: false, reason: "too_many" };
  }
  let reporter = 0;
  let opponent = 0;
  for (let i = 0; i < games.length; i++) {
    if (games[i]) {
      reporter++;
    } else {
      opponent++;
    }
    const decided = reporter === 2 || opponent === 2;
    // A decided series must end immediately — no game after 2 wins.
    if (decided && i !== games.length - 1) {
      return { ok: false, reason: "extra_game" };
    }
  }
  if (reporter < 2 && opponent < 2) {
    return { ok: false, reason: "not_decisive" };
  }
  return {
    ok: true,
    winner: reporter === 2 ? "reporter" : "opponent",
    gamesPlayed: games.length as 2 | 3,
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
};

const platformValues = platformEnum.enumValues;

const gameInputSchema = z.object({
  won: z.boolean(),
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
  return reportUnion.superRefine((value, ctx) => {
    if (value.outcome === "normal") {
      const series = deriveSeries(value.games.map((game) => game.won));
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
      const { playerAId, playerBId } = context.participants;
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

// Maps a validated report to persistence rows, resolving the reporter-relative
// Win/Loss into absolute winner ids. `playerATeamUrl`/`playerBTeamUrl` are
// already keyed to the match's player A/B (the form labels them by identity),
// so they pass straight through.
export function toResultRows(
  input: ReportInput,
  context: { reporterId: string; opponentId: string },
): { result: ResultRow; games: GameRow[] } {
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

  const series = deriveSeries(input.games.map((game) => game.won));
  const winnerId =
    series.ok && series.winner === "opponent"
      ? context.opponentId
      : context.reporterId;
  const games: GameRow[] = input.games.map((game, i) => ({
    gameNumber: i + 1,
    winnerId: game.won ? context.reporterId : context.opponentId,
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
