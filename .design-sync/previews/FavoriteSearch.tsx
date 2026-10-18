import { FavoriteSearch } from "buli-hub";
import { useEffect, useRef, useState } from "react";
import type { PickablePlayer } from "@/components/player-picker";
import { AVATAR_URL } from "./_fixtures";

/* "Spieler hinzufügen" on /favoriten: a search over the season's players whose
 * results open below the field. Favourites already on the list show their
 * star and cannot be picked again. The list opens on focus and the component
 * exposes no `open` prop, so the open cell focuses the field on mount. */

const CANDIDATES: PickablePlayer[] = [
  { userId: "ben", name: "Ben", username: "ben.vgc", avatarUrl: null },
  { userId: "felix", name: "Felix", username: "felixfeuer", avatarUrl: null },
  { userId: "ida", name: "Ida", username: null, avatarUrl: AVATAR_URL },
  { userId: "jonas", name: "Jonas Sturm", username: "jonas", avatarUrl: null },
  {
    userId: "mira",
    name: "Mira Immergrün",
    username: "mira.vgc",
    avatarUrl: AVATAR_URL,
  },
  { userId: "nico", name: "Nico", username: "nico_ou", avatarUrl: null },
  {
    userId: "tobi",
    name: "Tobi aus Tübingen",
    username: "tobi",
    avatarUrl: null,
  },
];

function Search({
  focus = false,
  disabled = false,
}: {
  focus?: boolean;
  disabled?: boolean;
}) {
  const [favorites, setFavorites] = useState<ReadonlySet<string>>(
    new Set(["mira", "jonas", "tobi"]),
  );
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focus) {
      ref.current?.querySelector("input")?.focus();
    }
  }, [focus]);
  return (
    <div
      ref={ref}
      className={focus ? "h-96 w-full max-w-md" : "w-full max-w-md"}
    >
      <FavoriteSearch
        label="Spieler hinzufügen"
        candidates={CANDIDATES}
        favoriteIds={favorites}
        onAdd={(id) => setFavorites((s) => new Set([...s, id]))}
        disabled={disabled}
      />
    </div>
  );
}

export function GeoeffneteSuche() {
  return <Search focus />;
}

export function Geschlossen() {
  return <Search />;
}

export function WirdHinzugefuegt() {
  return <Search disabled />;
}
