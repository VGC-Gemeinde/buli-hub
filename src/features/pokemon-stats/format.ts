// Numbers on the stats, in German: one decimal and a narrow no-break space
// before the percent sign ("41,3 %").

const NNBSP = " ";

const percent = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const count = new Intl.NumberFormat("de-DE");

// A share in [0, 1]. Above 0 but below what one decimal shows reads "<0,1 %",
// so a single entry never looks like none (FR-029).
export function formatShare(share: number): string {
  const value = share * 100;
  if (value > 0 && value < 0.05) {
    return `<0,1${NNBSP}%`;
  }
  return `${percent.format(value)}${NNBSP}%`;
}

// A win rate, or the empty-value placeholder without a rated match (FR-018).
export function formatWinRate(wins: number, rated: number): string {
  return rated === 0 ? "—" : formatShare(wins / rated);
}

export function formatCount(value: number): string {
  return count.format(value);
}
