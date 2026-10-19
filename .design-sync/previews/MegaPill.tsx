import { MegaPill } from "buli-hub";

/* The Mega marker after a Pokémon's base name. A species with one Mega reads
 * "Mega"; one with several names the letter. Never on its own: it always
 * follows the name it qualifies. */

const NAME =
  "flex flex-wrap items-center gap-x-[7px] gap-y-0.5 font-semibold text-[14px] text-brand-blue leading-tight dark:text-white";

export function AmNamen() {
  return (
    <div className="flex flex-col gap-3">
      {(
        [
          ["Charizard", "Mega Y"],
          ["Garchomp", "Mega Z"],
          ["Floette", "Mega"],
          ["Delphox", "Mega"],
        ] as const
      ).map(([name, mega]) => (
        <span key={`${name}-${mega}`} className={NAME}>
          <span>{name}</span>
          <MegaPill label={mega} />
        </span>
      ))}
    </div>
  );
}

/* In a detail header the pill sits beside the large name. */
export function InDerUeberschrift() {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
      <h1 className="font-bold font-heading text-[28px] text-brand-blue normal-case leading-[1.1] tracking-[0.01em] dark:text-white">
        Charizard
      </h1>
      <MegaPill label="Mega X" className="h-[22px] px-2 text-[11px]" />
    </div>
  );
}
