import {
  emptyTeamsheet,
  isAccepted,
  storedTeamsheet,
  type TeamsheetValue,
} from "@/features/teamsheets/field-state";
import type { TeamsheetSource } from "@/features/teamsheets/sources";
import type { MonIcon } from "@/features/teamsheets/view";
import type { Platform } from "./report";

// The editable form state behind a staff result edit, plus the pure rules that
// govern it. Lives outside the components because two surfaces edit a result
// the same way: the standalone "Ergebnis bearbeiten" editor and the correction
// branch of the dispute decision.

// A stored sheet as the editor opens it. There is no link because we never
// stored one: for editing, a sheet is always text.
export type EditorSheet = {
  source: TeamsheetSource;
  ots: string;
  icons: MonIcon[];
};

// Prefill for the editor, built from a stored normal result. Null fields mean
// "nothing to prefill" — a free win being converted into a normal result starts
// from an empty draft.
export type NormalEditorInitial = {
  platform: Platform | null;
  games: { winnerId: string; replayUrl: string | null }[];
  playerASheet: EditorSheet | null;
  playerBSheet: EditorSheet | null;
  videoUrl: string | null;
};

export type ResultDraft = {
  platform: Platform | "";
  // Always three slots; the third stays empty unless the series is split.
  winners: string[];
  replays: string[];
  teamA: TeamsheetValue;
  teamB: TeamsheetValue;
  video: string;
};

function initialSheet(sheet: EditorSheet | null | undefined): TeamsheetValue {
  return sheet
    ? storedTeamsheet(sheet.source, sheet.ots, sheet.icons)
    : emptyTeamsheet();
}

export function emptyDraft(initial?: NormalEditorInitial | null): ResultDraft {
  return {
    platform: initial?.platform ?? "",
    winners: [0, 1, 2].map((i) => initial?.games[i]?.winnerId ?? ""),
    replays: [0, 1, 2].map((i) => initial?.games[i]?.replayUrl ?? ""),
    teamA: initialSheet(initial?.playerASheet),
    teamB: initialSheet(initial?.playerBSheet),
    video: initial?.videoUrl ?? "",
  };
}

// A best-of-3 needs a third game exactly when the first two went to different
// players — before that the third slot is not shown and not required.
export function isSplit(draft: ResultDraft): boolean {
  const [first, second] = draft.winners;
  return first !== "" && second !== "" && first !== second;
}

export function gameIndexes(draft: ResultDraft): number[] {
  return isSplit(draft) ? [0, 1, 2] : [0, 1];
}

// Picking a winner can un-split a series (2:0), which drops the third game.
export function setWinner(
  draft: ResultDraft,
  index: number,
  userId: string,
): ResultDraft {
  const winners = [...draft.winners];
  winners[index] = userId;
  if (winners[0] !== "" && winners[0] === winners[1]) {
    winners[2] = "";
  }
  return { ...draft, winners };
}

// Everything the server will insist on, checked live so the submit button only
// lights up on a submittable draft. Replays are required on Showdown; the
// per-division proof rule is stricter server-side, never looser.
export function isDraftComplete(draft: ResultDraft): boolean {
  const indexes = gameIndexes(draft);
  return (
    draft.platform !== "" &&
    indexes.every((i) => draft.winners[i] !== "") &&
    isAccepted(draft.teamA) &&
    isAccepted(draft.teamB) &&
    (draft.platform !== "showdown" ||
      indexes.every((i) => draft.replays[i].trim() !== ""))
  );
}

// The draft as the payload the server validates (`staffResultSchema`): only the
// games that count, replays only on Showdown, video only on Cartridge.
export function draftToReport(draft: ResultDraft): unknown {
  const indexes = gameIndexes(draft);
  return {
    outcome: "normal" as const,
    platform: draft.platform,
    games: indexes.map((i) => ({
      winnerId: draft.winners[i],
      ...(draft.platform === "showdown" ? { replayUrl: draft.replays[i] } : {}),
    })),
    playerASheet: {
      source: draft.teamA.accepted?.source ?? "import",
      ots: draft.teamA.accepted?.ots ?? "",
    },
    playerBSheet: {
      source: draft.teamB.accepted?.source ?? "import",
      ots: draft.teamB.accepted?.ots ?? "",
    },
    ...(draft.platform === "cartridge" && draft.video.trim() !== ""
      ? { videoUrl: draft.video }
      : {}),
  };
}
