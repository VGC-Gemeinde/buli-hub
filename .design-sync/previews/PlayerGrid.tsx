import { EmptyStateCard, PlayerGrid, type RegisteredPlayer } from "buli-hub";
import { AVATAR_URL, ROSTER } from "./_fixtures";

/* The compact roster grid — shared by the staff dashboard's „Anmeldungen"
 * section and the player dashboard's „Teilnehmerfeld". It sorts by name with a
 * German collator, so the cells below are deliberately handed unsorted data.
 * `empty` is caller-supplied: the app always passes an EmptyStateCard. */

/* A full division: 16 registrations, the size the grid actually has to carry.
 * Local to this preview — the shared ROSTER is intentionally small. */
const DIVISION: RegisteredPlayer[] = [
  { id: "1", name: "Testerino", avatarUrl: AVATAR_URL },
  { id: "2", name: "annegret" },
  { id: "3", name: "Blaubeerkuchen" },
  { id: "4", name: "Yannick mit sehr langem Namen" },
  { id: "5", name: "Falinks" },
  { id: "6", name: "Wooloo", avatarUrl: AVATAR_URL },
  { id: "7", name: "Pawmi" },
  { id: "8", name: "Grafaiai" },
  { id: "9", name: "Kilowattrel", avatarUrl: AVATAR_URL },
  { id: "10", name: "Maushold" },
  { id: "11", name: "Tinkatink" },
  { id: "12", name: "Ösi-Trainer" },
  { id: "13", name: "Zwergnase" },
  { id: "14", name: "Krähenfuß" },
  { id: "15", name: "Bibor" },
  { id: "16", name: "Schlaraffel" },
];

export function Teilnehmerfeld() {
  return (
    <PlayerGrid
      players={ROSTER}
      empty={
        <EmptyStateCard title="Noch keine Anmeldungen" informational>
          Sobald sich die ersten Spieler über den Anmeldelink registrieren,
          erscheinen sie hier.
        </EmptyStateCard>
      }
    />
  );
}

export function VolleDivision() {
  return (
    <PlayerGrid
      players={DIVISION}
      empty={
        <EmptyStateCard title="Noch keine Anmeldungen" informational>
          Sobald sich die ersten Spieler über den Anmeldelink registrieren,
          erscheinen sie hier.
        </EmptyStateCard>
      }
    />
  );
}

export function Leer() {
  return (
    <PlayerGrid
      players={[]}
      empty={
        <EmptyStateCard title="Noch keine Anmeldungen" informational>
          Sobald sich die ersten Spieler über den Anmeldelink registrieren,
          erscheinen sie hier.
        </EmptyStateCard>
      }
    />
  );
}
