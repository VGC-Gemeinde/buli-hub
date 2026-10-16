import type { MoveCard } from "../move-card";
import { TypeIcon } from "./stats-icon";

// The move's game data under its name, as Showdown shows it (FR-023): at most
// 280px, tinted in the move's type, nothing else coloured by it.
export function MoveCardView({ card }: { card: MoveCard }) {
  const tint = `var(--type-${card.type.toLowerCase()})`;
  return (
    <div
      className="mt-3 flex max-w-[280px] flex-col gap-2 rounded-xl border px-3.5 py-3"
      style={{
        borderColor: `color-mix(in oklab, ${tint} 55%, transparent)`,
        background: `color-mix(in oklab, ${tint} 13%, var(--card))`,
      }}
    >
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 font-semibold text-[13.5px] text-brand-blue tabular-nums dark:text-white">
        <TypeIcon type={card.type} className="size-[22px]" />
        <span>BP: {card.basePower || "—"}</span>
        <span>ACC: {card.accuracy === true ? "—" : `${card.accuracy}%`}</span>
      </div>
      <p lang="en" className="text-[13.5px] leading-normal">
        {card.shortDesc}
      </p>
    </div>
  );
}
