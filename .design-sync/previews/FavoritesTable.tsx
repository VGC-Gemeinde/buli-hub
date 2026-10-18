import { FavoritesTable } from "buli-hub";
import { useState } from "react";
import type { FavoritePlayer, FormCell } from "@/features/favorites/favorites";
import { AVATAR_URL } from "./_fixtures";

/* "Deine Spieler" on /favoriten: every favourite with Gruppe, Platz, Bilanz and
 * form, in the standings table's anatomy. Spieltag 3 runs: its foreign results
 * are covered in the form strip, and Platz and Bilanz with them (one reveal
 * opens all three). The star removes a favourite; the row stays, greyed out.
 * Fixtures shaped like src/features/dev/favorites-fixture.ts, stable ids. */

const CURRENT_ROUND = 3;

const cell = (
  round: number,
  matchId: string,
  result: FormCell["result"],
  opponent: string,
  self: string,
  isMotw = false,
): FormCell => ({
  round,
  matchId,
  result,
  isMotw,
  playerIds: [self, opponent],
});

const FAVORITE_PLAYERS: FavoritePlayer[] = [
  {
    userId: "mira",
    name: "Mira Immergrün",
    avatarUrl: AVATAR_URL,
    tier: 1,
    groupName: "Division 1a",
    rank: 1,
    wins: 2,
    losses: 0,
    dropped: false,
    form: [
      cell(1, "f1", "W", "felix", "mira"),
      cell(2, "f3", "W", "me", "mira"),
    ],
  },
  {
    userId: "greta",
    name: "annegret",
    avatarUrl: null,
    tier: 1,
    groupName: "Division 1b",
    rank: 1,
    wins: 3,
    losses: 0,
    dropped: false,
    form: [
      cell(1, "f8", "W", "jonas", "greta"),
      cell(2, "f10", "W", "ben", "greta"),
      cell(3, "f12", "W", "sam", "greta"),
    ],
  },
  {
    userId: "jonas",
    name: "Jonas Sturm",
    avatarUrl: null,
    tier: 1,
    groupName: "Division 1b",
    rank: 2,
    wins: 1,
    losses: 1,
    dropped: false,
    form: [
      cell(1, "f8b", "double_loss", "greta", "jonas"),
      cell(2, "f10b", "W", "sam", "jonas"),
    ],
  },
  {
    userId: "sam",
    name: "Pawmi",
    avatarUrl: null,
    tier: 1,
    groupName: "Division 1b",
    rank: 4,
    wins: 0,
    losses: 3,
    dropped: true,
    form: [
      cell(1, "f9", "L", "ben", "sam"),
      cell(2, "f10c", "L", "jonas", "sam"),
      cell(3, "f12b", "L", "greta", "sam"),
    ],
  },
  {
    userId: "lena",
    name: "Blaubeerkuchen",
    avatarUrl: AVATAR_URL,
    tier: 2,
    groupName: "Division 2a",
    rank: 1,
    wins: 3,
    losses: 0,
    dropped: false,
    form: [
      cell(1, "f14", "W", "ida", "lena"),
      cell(2, "f16", "W", "finn", "lena"),
      cell(3, "f18", "W", "tobi", "lena"),
    ],
  },
  {
    userId: "tobi",
    name: "Tobi aus Tübingen",
    avatarUrl: null,
    tier: 2,
    groupName: "Division 2a",
    rank: 2,
    wins: 1,
    losses: 1,
    dropped: false,
    form: [
      cell(1, "f15", "W", "finn", "tobi"),
      cell(2, "f17", "offen", "ida", "tobi"),
      cell(3, "f18b", "L", "lena", "tobi"),
    ],
  },
];

function Table({
  spoilersOff = false,
  removed = [],
}: {
  spoilersOff?: boolean;
  removed?: string[];
}) {
  const [removedIds, setRemovedIds] = useState<ReadonlySet<string>>(
    new Set(removed),
  );
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set());
  return (
    <div className="w-full max-w-3xl">
      <FavoritesTable
        players={FAVORITE_PLAYERS}
        removedIds={removedIds}
        currentRound={CURRENT_ROUND}
        meId="me"
        spoilersOff={spoilersOff}
        revealed={revealed}
        onReveal={(id) => setRevealed((s) => new Set([...s, id]))}
        onToggle={(id) =>
          setRemovedIds((s) => {
            const next = new Set(s);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          })
        }
      />
    </div>
  );
}

export function DeineSpieler() {
  return <Table />;
}

export function EinerEntfernt() {
  return <Table removed={["jonas"]} />;
}

export function SpoilerschutzAus() {
  return <Table spoilersOff />;
}
