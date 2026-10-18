import { MoveCardView, Tick } from "buli-hub";
import type { MoveCard } from "@/features/pokemon-stats/move-card";

/* A move's game data under its name on the move detail
 * (/statistiken/attacken/<id>), as Showdown shows it: tinted in the move's
 * type through the --type-* palette, description in English. Written out
 * literally; move-card.ts reads @pkmn/mods, which is not in the bundle. The
 * type icon is served from the app's public/type-icons/. */

const CARDS: Record<string, MoveCard> = {
  fakeOut: {
    name: "Fake Out",
    type: "Normal",
    basePower: 40,
    accuracy: 100,
    shortDesc: "Hits first. First turn out only. 100% flinch chance.",
  },
  heatWave: {
    name: "Heat Wave",
    type: "Fire",
    basePower: 95,
    accuracy: 90,
    shortDesc: "10% chance to burn the foe(s).",
  },
  waveCrash: {
    name: "Wave Crash",
    type: "Water",
    basePower: 120,
    accuracy: 100,
    shortDesc: "Has 33% recoil.",
  },
  kowtowCleave: {
    name: "Kowtow Cleave",
    type: "Dark",
    basePower: 85,
    accuracy: true,
    shortDesc: "This move does not check accuracy.",
  },
  spore: {
    name: "Spore",
    type: "Grass",
    basePower: 0,
    accuracy: 100,
    shortDesc: "Causes the target to fall asleep.",
  },
  tailwind: {
    name: "Tailwind",
    type: "Flying",
    basePower: 0,
    accuracy: true,
    shortDesc: "For 4 turns, allies' Speed is doubled.",
  },
};

function UnderName({ card }: { card: MoveCard }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 font-semibold text-[12.5px] text-muted-foreground uppercase tracking-[0.12em]">
        <Tick size="s" />
        Attacke · Saison 9
      </div>
      <h1 className="mt-1.5 text-[28px] text-brand-blue leading-[1.1] dark:text-white">
        {card.name}
      </h1>
      <MoveCardView card={card} />
    </div>
  );
}

export function Angriffe() {
  return (
    <div className="flex flex-wrap gap-6">
      <UnderName card={CARDS.fakeOut} />
      <UnderName card={CARDS.heatWave} />
      <UnderName card={CARDS.waveCrash} />
    </div>
  );
}

/* Status moves have no BP: the empty-value placeholder. */
export function Statusattacken() {
  return (
    <div className="flex flex-wrap gap-6">
      <UnderName card={CARDS.spore} />
      <UnderName card={CARDS.tailwind} />
    </div>
  );
}

/* A move that does not check accuracy shows ACC as the placeholder. */
export function TrifftImmer() {
  return <UnderName card={CARDS.kowtowCleave} />;
}
