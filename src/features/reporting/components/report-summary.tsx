import { PLATFORM_LABELS } from "@/features/registration/registration";
import type { Identity } from "@/features/season/dashboard";
import type { StoredResult } from "../queries";

// Read-only view of an already-reported result — shown to the participants once
// a result exists. Corrections go through the (later) dispute flow.
export function ReportSummary({
  result,
  playerA,
  playerB,
}: {
  result: StoredResult;
  playerA: Identity;
  playerB: Identity;
}) {
  const nameOf = (id: string | null) =>
    id === playerA.userId
      ? playerA.name
      : id === playerB.userId
        ? playerB.name
        : "—";

  if (result.outcome === "free_win") {
    const pending = result.confirmedAt === null;
    return (
      <div className="flex flex-col gap-4">
        <div
          className={
            pending
              ? "rounded-lg border border-brand-orange/40 bg-brand-orange/5 px-5 py-4"
              : "rounded-lg border px-5 py-4"
          }
        >
          <p className="font-semibold">
            Freigewinn für {nameOf(result.winnerId)}
          </p>
          <p className="mt-1 text-muted-foreground text-sm">
            {pending
              ? "Wartet auf Bestätigung durch den Staff."
              : "Vom Staff bestätigt."}
          </p>
        </div>
        {result.freeWinReason ? (
          <div>
            <p className="text-[13px] text-muted-foreground">Begründung</p>
            <p className="text-sm">{result.freeWinReason}</p>
          </div>
        ) : null}
      </div>
    );
  }

  const outcome =
    result.outcome === "double_loss" ? "Doppelniederlage" : "Gemeldet";
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-lg border px-5 py-4">
        <p className="font-semibold">{outcome}</p>
        {result.winnerId ? (
          <p className="mt-1 text-muted-foreground text-sm">
            Sieger: {nameOf(result.winnerId)}
            {result.platform ? ` · ${PLATFORM_LABELS[result.platform]}` : null}
          </p>
        ) : null}
      </div>
      {result.games.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {result.games.map((game) => (
            <li
              key={game.gameNumber}
              className="flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm"
            >
              <span className="font-medium">
                Spiel {game.gameNumber}: {nameOf(game.winnerId)}
              </span>
              {game.replayUrl ? (
                <a
                  href={game.replayUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-orange text-sm hover:underline"
                >
                  Replay
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-col gap-1.5 text-sm">
        {result.playerATeamUrl ? (
          <a
            href={result.playerATeamUrl}
            target="_blank"
            rel="noreferrer"
            className="text-brand-orange hover:underline"
          >
            Teamsheet {playerA.name}
          </a>
        ) : null}
        {result.playerBTeamUrl ? (
          <a
            href={result.playerBTeamUrl}
            target="_blank"
            rel="noreferrer"
            className="text-brand-orange hover:underline"
          >
            Teamsheet {playerB.name}
          </a>
        ) : null}
        {result.videoUrl ? (
          <a
            href={result.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-brand-orange hover:underline"
          >
            Video
          </a>
        ) : null}
      </div>
    </div>
  );
}
