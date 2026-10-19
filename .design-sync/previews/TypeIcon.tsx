import { TypeIcon } from "buli-hub";

/* A move's type as the stats show it: the partywhale/pokemon-type-icons SVGs
 * from the sprite bucket's /types/. The type name is Showdown's English
 * one; the file is its lower-case form. */

const TYPES = [
  "Normal",
  "Fire",
  "Water",
  "Grass",
  "Electric",
  "Ice",
  "Fighting",
  "Poison",
  "Ground",
  "Flying",
  "Psychic",
  "Bug",
  "Rock",
  "Ghost",
  "Dragon",
  "Dark",
  "Steel",
  "Fairy",
];

export function AlleTypen() {
  return (
    <div className="grid max-w-sm grid-cols-6 gap-3">
      {TYPES.map((type) => (
        <TypeIcon key={type} type={type} />
      ))}
    </div>
  );
}

/* The three sizes in use: a ranking row (24px), the move card (22px) and a
 * small detail list (18px), each beside the text it labels. */
export function NebenDemNamen() {
  return (
    <div className="flex flex-col gap-3 font-semibold text-[14px] text-brand-blue dark:text-white">
      <span className="flex items-center gap-2.5">
        <TypeIcon type="Fire" />
        Heat Wave
      </span>
      <span className="flex items-center gap-2.5">
        <TypeIcon type="Dark" className="size-[22px]" />
        Kowtow Cleave
      </span>
      <span className="flex items-center gap-2 text-[13px]">
        <TypeIcon type="Fairy" className="size-[18px]" />
        Moonblast
      </span>
    </div>
  );
}
