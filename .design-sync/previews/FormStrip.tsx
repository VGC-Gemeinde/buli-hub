import { FormStrip } from "buli-hub";
import { useState } from "react";
import type { FormCell } from "@/features/favorites/favorites";

/* A player's form on /favoriten, oldest Spieltag left (DESIGN.md §8.12): a win
 * is a green cell with a white tick, a loss a red one with a white cross, a
 * double loss an outlined cross, an overdue result a dashed outline. The
 * running Spieltag's foreign result is covered with the spoiler pill. Shown
 * beside the player's name, as in the Form column of "Deine Spieler". */

const c = (
  round: number,
  result: FormCell["result"],
  player: string,
): FormCell => ({
  round,
  matchId: `${player}-${round}`,
  result,
  isMotw: false,
  playerIds: [player, "gegner"],
});

const ROWS: { name: string; cells: FormCell[] }[] = [
  {
    name: "Blaubeerkuchen",
    cells: [c(1, "W", "lena"), c(2, "W", "lena"), c(3, "W", "lena")],
  },
  {
    name: "Tobi aus Tübingen",
    cells: [c(1, "W", "tobi"), c(2, "offen", "tobi"), c(3, "L", "tobi")],
  },
  {
    name: "Jonas Sturm",
    cells: [c(1, "double_loss", "jonas"), c(2, "W", "jonas")],
  },
  {
    name: "Pawmi",
    cells: [c(1, "L", "sam"), c(2, "L", "sam"), c(3, "L", "sam")],
  },
];

function Rows({ coverRound }: { coverRound?: number }) {
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set());
  return (
    <div className="flex w-72 flex-col divide-y rounded-lg border">
      {ROWS.map((row) => (
        <div
          key={row.name}
          className="flex items-center justify-between gap-4 px-3 py-2.5"
        >
          <span className="truncate font-semibold text-[14.5px]">
            {row.name}
          </span>
          <FormStrip
            cells={row.cells}
            covered={(cell) =>
              cell.round === coverRound &&
              cell.result !== "offen" &&
              !revealed.has(cell.matchId)
            }
            onReveal={(id) => setRevealed((s) => new Set([...s, id]))}
          />
        </div>
      ))}
    </div>
  );
}

export function Bilanzen() {
  return <Rows />;
}

export function NochKeinSpiel() {
  return (
    <div className="flex w-72 items-center justify-between gap-4 rounded-lg border px-3 py-2.5">
      <span className="truncate font-semibold text-[14.5px]">Ida</span>
      <FormStrip cells={[]} covered={() => false} onReveal={() => {}} />
    </div>
  );
}

export function VerdeckterSpieltag() {
  return <Rows coverRound={3} />;
}
