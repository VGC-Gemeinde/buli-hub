// What each week after the regular season holds, as the public pages name it:
// "Relegation · Viertelfinale · Tiebreaker", "Halbfinale", "Finale". Pure.

import { bracketRounds, type PublicCard } from "./public-view";

export function publicWeekContents(input: {
  weeks: readonly { name: string; startsOn: string; endsOn: string }[];
  cards: readonly PublicCard[];
  tiebreakers: number;
}): { name: string; startsOn: string; endsOn: string; content: string }[] {
  const rounds = bracketRounds(input.cards);
  const relegation = input.cards.some((card) => card.stage === "relegation");
  return input.weeks.map((week, i) => {
    const parts = [
      ...(i === 0 && relegation ? ["Relegation"] : []),
      ...rounds.filter((round) => round.week === i + 1).map((r) => r.name),
      ...(i === 0 && input.tiebreakers > 0 ? ["Tiebreaker"] : []),
    ];
    return { ...week, content: parts.join(" · ") };
  });
}
