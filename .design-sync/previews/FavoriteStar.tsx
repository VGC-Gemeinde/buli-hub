import { FavoriteStar, StandingsTable } from "buli-hub";
import { STANDINGS } from "./_fixtures";

/* The marker before a favourite's name in tables and match rows: a small
 * filled orange star. A marker, not a control (no hover, no click). Orange
 * because a favourite is the viewer's own choice. */

const NAMES: { name: string; favorite: boolean }[] = [
  { name: "Mira Immergrün", favorite: true },
  { name: "Karl Kraut", favorite: false },
  { name: "Blaubeerkuchen", favorite: true },
  { name: "Ole Wetter", favorite: false },
];

export function BeimNamen() {
  return (
    <div className="flex w-64 flex-col gap-2">
      {NAMES.map((n) => (
        <div
          key={n.name}
          className="flex items-center gap-2 rounded-lg border px-3 py-2"
        >
          {n.favorite ? <FavoriteStar /> : null}
          <span className="truncate font-medium text-[14.5px]">{n.name}</span>
        </div>
      ))}
    </div>
  );
}

export function InDerTabelle() {
  return (
    <div className="w-full max-w-xl">
      <StandingsTable
        standings={STANDINGS}
        meId="me"
        favoriteIds={new Set(["a", "b"])}
      />
    </div>
  );
}
