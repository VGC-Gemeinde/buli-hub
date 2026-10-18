import { PlayerPicker } from "buli-hub";
import { useState } from "react";

/* The searchable single-choice list of hub users for the replacement offer
 * and the Banliste dialogs. The list height is the caller's (`listClassName`);
 * the dialogs use h-[280px] md:h-[400px], the cards the phone height.
 * Avatars fall back to initials where no Discord avatar is set. */

const AVATAR = "https://cdn.discordapp.com/embed/avatars/1.png";

const PLAYERS = [
  {
    userId: "u1",
    name: "Blaubeerkuchen",
    username: "blaubeerkuchen",
    avatarUrl: AVATAR,
  },
  { userId: "u2", name: "annegret", username: "annegret", avatarUrl: null },
  { userId: "u3", name: "Falinks", username: "falinks_vgc", avatarUrl: null },
  { userId: "u4", name: "Grafaiai", username: "grafaiai", avatarUrl: null },
  {
    userId: "u5",
    name: "Kilowattrel",
    username: "kilowatt.rel",
    avatarUrl: null,
  },
  { userId: "u6", name: "Maushold", username: null, avatarUrl: null },
  {
    userId: "u7",
    name: "Yannick mit sehr langem Namen",
    username: "yannick",
    avatarUrl: null,
  },
];

const EMPTY_BAN =
  "Niemand gefunden. Wer sich nie im Buli-Hub angemeldet hat, lässt sich per Discord-ID bannen.";
const EMPTY_OFFER =
  "Niemand gefunden. Der Spieler muss sich einmal im Buli-Hub angemeldet haben und darf nicht schon mitspielen oder gesperrt sein.";

function Picker({
  initial,
  players = PLAYERS,
  emptyText = EMPTY_BAN,
}: {
  initial: string | null;
  players?: typeof PLAYERS;
  emptyText?: string;
}) {
  const [selected, setSelected] = useState<string | null>(initial);
  return (
    <div className="max-w-md">
      <PlayerPicker
        players={players}
        selectedId={selected}
        onSelect={setSelected}
        emptyText={emptyText}
        listClassName="h-[280px]"
      />
    </div>
  );
}

export function Auswahl() {
  return <Picker initial="u3" />;
}

export function OhneAuswahl() {
  return <Picker initial={null} />;
}

export function NiemandVerfuegbar() {
  return <Picker initial={null} players={[]} emptyText={EMPTY_OFFER} />;
}
