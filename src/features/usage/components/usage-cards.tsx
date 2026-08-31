// The headline numbers: a micro label, a big tabular figure and its unit.
// Display only; the page decides what goes in.

export type UsageCard = {
  label: string;
  value: number;
  unit: string;
};

const numberFormat = new Intl.NumberFormat("de-DE");

export function formatCount(value: number): string {
  return numberFormat.format(value);
}

export function UsageCards({ cards }: { cards: readonly UsageCard[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((card) => (
        <div
          key={`${card.label}-${card.unit}`}
          className="flex flex-col gap-1 rounded-xl border px-5 py-4"
        >
          <span className="font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.12em]">
            {card.label}
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="font-bold font-heading text-[30px] text-brand-blue leading-none tabular-nums dark:text-white">
              {formatCount(card.value)}
            </span>
            <span className="text-[13px] text-muted-foreground">
              {card.unit}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
