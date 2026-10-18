"use client";

import { MotwWeekPager } from "buli-hub";
import { useState } from "react";
import type { MotwCandidate, MotwOption, MotwWeek } from "@/features/motw/motw";

/* The season strip of the MotW workspace (`/staff/motw`): one chip per
 * Spieltag, the round over a mark for where that week stands (filled orange
 * dot = confirmed with VOD, orange ring = confirmed without VOD, diamond =
 * candidates but not confirmed, dash = open). The open week is navy, the
 * running Spieltag has the orange border. The chips and chevrons are the
 * shared `StaffWeekPager`; the legend underneath spells the marks out.
 *
 * Clickable: each cell keeps its own selected round in local state.
 */

const PLACEHOLDER_OPTION: MotwOption = {
  matchId: "wm-x",
  round: 0,
  tier: 1,
  groupName: "Division 1a",
  playerA: {
    userId: "motw-Wooloo",
    name: "Wooloo",
    avatarUrl: null,
    streamPhotoUrl: null,
    rank: 1,
    wins: 4,
    losses: 0,
    hasCaptureCard: true,
    profileEdited: true,
    dropped: false,
  },
  playerB: {
    userId: "motw-Falinks",
    name: "Falinks",
    avatarUrl: null,
    streamPhotoUrl: null,
    rank: 2,
    wins: 3,
    losses: 1,
    hasCaptureCard: true,
    profileEdited: true,
    dropped: false,
  },
  reported: false,
};

const CANDIDATE: MotwCandidate = {
  option: PLACEHOLDER_OPTION,
  role: "primary",
  changedFrom: null,
};

type Mark = "vod" | "no-vod" | "candidates" | "open";

function week(round: number, mark: Mark, currentRound: number): MotwWeek {
  const regular = round <= 6;
  return {
    round,
    name: regular ? `Spieltag ${round}` : `Woche ${round - 6}`,
    chip: regular ? String(round) : `W${round - 6}`,
    state:
      round < currentRound
        ? "past"
        : round === currentRound
          ? "current"
          : "future",
    startsOn: "2026-01-05",
    endsOn: "2026-01-11",
    options: [],
    candidates: mark === "candidates" ? [CANDIDATE] : [],
    selection:
      mark === "vod"
        ? { matchId: "wm-x", youtubeUrl: "https://youtu.be/xK92dQvgc" }
        : mark === "no-vod"
          ? { matchId: "wm-x", youtubeUrl: null }
          : null,
    selectedMatch:
      mark === "vod" || mark === "no-vod" ? PLACEHOLDER_OPTION : null,
    editable: true,
  };
}

function Pager({
  marks,
  currentRound,
  initialRound,
}: {
  marks: Mark[];
  currentRound: number | null;
  initialRound: number;
}) {
  const [active, setActive] = useState(initialRound);
  const weeks = marks.map((mark, i) => week(i + 1, mark, currentRound ?? 99));
  return (
    <MotwWeekPager
      weeks={weeks}
      activeRound={active}
      currentRound={currentRound}
      onSelect={setActive}
    />
  );
}

/** Mid-season, the workspace opening on Spieltag 3: finished but never
 *  confirmed (diamond), so it holds the billboard back. Spieltag 4 runs
 *  (orange border), confirmed but its VOD is still missing (ring); weeks
 *  1 and 2 are done, the playoff week W1 has its Hauptkandidat. */
export function Saison() {
  return (
    <Pager
      marks={[
        "vod",
        "vod",
        "candidates",
        "no-vod",
        "candidates",
        "open",
        "candidates",
      ]}
      currentRound={4}
      initialRound={3}
    />
  );
}

/** The running week open: the navy chip carries the orange ring of the
 *  current Spieltag. */
export function WocheLaeuft() {
  return (
    <Pager
      marks={["vod", "no-vod", "candidates", "open", "open", "open"]}
      currentRound={3}
      initialRound={3}
    />
  );
}

/** Season start: nothing nominated yet, every week a dash. */
export function Saisonstart() {
  return (
    <Pager
      marks={["open", "open", "open", "open", "open", "open"]}
      currentRound={1}
      initialRound={1}
    />
  );
}
