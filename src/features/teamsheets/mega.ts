import { Dex } from "@pkmn/dex";

// Mega handling, ported from justhit.gg (src/lib/pokepaste.ts#resolveMega).
// Pokémon Champions brought megas back, and a paste can express one two ways:
// as the mega forme itself ("Delphox-Mega @ Delphoxite") or as the base form
// holding the stone ("Delphox @ Delphoxite"). Both mean the same team.
//
// Nothing here can reject a sheet. `@pkmn/dex` is a cosmetics table for us —
// a species it does not know renders with a fallback sprite and no mega badge,
// and still validates and stores fine.

// Escape hatch for the window between a Champions patch and the next `@pkmn`
// release. Keys are @pkmn ids (lowercase alphanumeric).
const STONE_OVERRIDES: Record<string, { base: string; mega: string }> = {};

// Regulation Set M-C (2026-09-08) added these five megas. `@pkmn/dex` 0.10.11
// predates it and carries a stale slot 0 for four of them — the Gen 6 mega's
// ability for the Z formes, the base species' for Mega Golisopod — so the
// badge named the wrong one. Drop an entry once a `@pkmn/dex` release ships
// the real ability. Mega Baxcalibur needs no entry: its slot 0 already reads
// Thermal Exchange, which is its mega ability.
const MEGA_ABILITY_OVERRIDES: Record<string, string> = {
  garchompmegaz: "Levitate",
  // Brand new in M-C, so no dex knows it yet: halves contact damage.
  lucariomegaz: "Aura Guard",
  absolmegaz: "Sharpness",
  golisopodmega: "Tough Claws",
};

const toId = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

type StoneEvolution = { base: string; mega: string };

// What a stone does for the given species: the form it evolves and the mega
// it becomes, or null when the stone is not this species' stone. The dex keys
// a stone by the exact form that can hold it — usually the base species
// ("Delphox"), but "Floette-Eternal" for Floettite (plain Floette cannot
// mega-evolve), and one key per form for stones like Tatsugirinite or
// Meowsticite, whose megas keep the form. So the lookup goes form as written
// → the mega itself (a paste that writes "Floette-Mega" inline, matched on
// the stone's value) → base species, and reports the holding form as `base`.
// The base species comes last on purpose: "Tatsugiri-Droopy-Mega" must find
// its own entry before falling back to the one plain "Tatsugiri" would use.
function stoneEvolution(item: string, species: string): StoneEvolution | null {
  const sp = Dex.species.get(species);
  const written = sp.exists ? sp.name : species;
  const baseSpecies = sp.exists ? sp.baseSpecies || sp.name : species;

  const override = STONE_OVERRIDES[toId(item)];
  if (override) {
    return [written, baseSpecies].some((c) => toId(c) === toId(override.base))
      ? override
      : null;
  }
  const stone = (Dex.items.get(item) as { megaStone?: Record<string, string> })
    .megaStone;
  if (!stone) {
    return null;
  }
  if (stone[written]) {
    return { base: written, mega: stone[written] };
  }
  const inline = Object.entries(stone).find(([, mega]) => mega === written);
  if (inline) {
    return { base: inline[0], mega: inline[1] };
  }
  return stone[baseSpecies]
    ? { base: baseSpecies, mega: stone[baseSpecies] }
    : null;
}

// The single ability a species mega-evolves into (slot 0). Every mega has
// exactly one, and it never depends on what the base form was listed with.
// It may happen to read like a base ability, and for some megas it matches
// the base's only one, but that is a coincidence and not the mega carrying
// something over. So slot 0 is the whole answer, and a second slot in the
// dex is stale data rather than a second possibility: reading past slot 0
// would leave an Ice Body Baxcalibur on Ice Body instead of Thermal Exchange.
function megaAbilityOf(mega: string): string | null {
  const override = MEGA_ABILITY_OVERRIDES[toId(mega)];
  if (override) {
    return override;
  }
  return Dex.species.get(mega).abilities?.["0"] ?? null;
}

// The species we store. A mon holding its own mega stone is always written as
// the form that holds it, so that a Pokepaste (which writes the mega forme
// inline) and a VRPaste (which returns the base form plus a separate mega
// block) produce byte-identical OTS for the same team. A mega forme *without*
// its stone is left alone — it is unusual, but it is what the player wrote.
// `Dex` lowercases the name of a species it does not know, so unknown input is
// passed through untouched rather than mangled into "nonexistentmon".
export function canonicalSpecies(species: string, item: string | null): string {
  if (item) {
    const evolution = stoneEvolution(item, species);
    if (evolution) {
      return evolution.base;
    }
  }
  const sp = Dex.species.get(species);
  return sp.exists ? sp.name : species;
}

export type MegaResolution = {
  // The species to draw the sprite for — the mega when one applies.
  spriteSpecies: string;
  // What to call it on screen: always the base name, never "Delphox-Mega".
  displayName: string;
  // The ability after mega-evolving, when it differs from the listed one.
  megaAbility: string | null;
};

// A mega forme, by its forme name. "Mega" is not always the start of it: a
// mega that keeps a forme of its own is named after both, so Meowstic-F-Mega
// has the forme "F-Mega" and Tatsugiri-Droopy-Mega has "Droopy-Mega". Anchor
// on the whole segment instead. Checked against the dex: this matches all ten
// forme shapes and every one of the 97 megas a stone can produce, and nothing
// that is not a mega.
const MEGA_FORME = /(^|-)Mega(-|$)/i;

// A mon shows its mega when it either *is* a mega forme in the paste, or holds
// the stone that evolves it.
export function resolveMega(
  species: string,
  item: string | null,
): MegaResolution {
  const sp = Dex.species.get(species);

  if (sp.exists && MEGA_FORME.test(sp.forme ?? "")) {
    // Which form it evolved from is a question its own stone answers, so ask
    // the same lookup the held-stone branch below asks. Taking `baseSpecies`
    // instead would drop a forme the mega keeps and turn Meowstic-F-Mega into
    // a plain Meowstic. Rayquaza-Mega has no stone and falls back.
    const evolution = sp.requiredItem
      ? stoneEvolution(sp.requiredItem, sp.name)
      : null;
    return {
      spriteSpecies: sp.name,
      displayName: evolution?.base ?? sp.baseSpecies ?? sp.name,
      megaAbility: megaAbilityOf(sp.name),
    };
  }

  if (item) {
    const evolution = stoneEvolution(item, species);
    if (evolution) {
      return {
        spriteSpecies: evolution.mega,
        displayName: evolution.base,
        megaAbility: megaAbilityOf(evolution.mega),
      };
    }
  }

  return { spriteSpecies: species, displayName: species, megaAbility: null };
}

// The +10% / -10% a nature applies, for the arrows on a team card. Derived from
// the nature name alone, so it reveals nothing about the EVs we strip.
//
// The stat abbreviations are the Showdown ones, untranslated. They are what
// every VGC player reads on every sheet, calc and replay; a German rendering
// ("Ang", "SpVert") would be ours alone and nobody else's.
const STAT_LABEL: Record<string, string> = {
  hp: "HP",
  atk: "Atk",
  def: "Def",
  spa: "SpA",
  spd: "SpD",
  spe: "Spe",
};

export function natureEffect(
  nature: string,
): { plus: string; minus: string } | null {
  const nat = Dex.natures.get(nature);
  if (!nat.exists || !nat.plus || !nat.minus) {
    return null;
  }
  return {
    plus: STAT_LABEL[nat.plus] ?? nat.plus,
    minus: STAT_LABEL[nat.minus] ?? nat.minus,
  };
}
