import { Sets, Team } from "@pkmn/sets";
import { canonicalSpecies } from "./mega";

// Parsing, validating and stripping a team sheet. This is the only place a
// sheet becomes storable, and the only reason the paste service exists: the
// league requires an open team sheet, and nothing else in the flow can tell a
// complete one from an incomplete one.
//
// Stripping is done by *rebuilding* each set from the five fields we keep and
// re-serialising it, never by deleting lines from the submitted text. A field
// we do not explicitly carry over therefore cannot reach the database, which
// is what keeps EVs out of it even as Showdown adds new export lines.

export const TEAM_SIZE = 6;
export const MAX_MOVES = 4;

export type TeamsheetMon = {
  species: string;
  item: string | null;
  ability: string;
  nature: string;
  moves: string[];
};

export type ParseResult =
  | { ok: true; ots: string; mons: TeamsheetMon[] }
  | { ok: false; errors: string[] };

// Everything Champions' open-sheet rules require. Item is genuinely optional:
// a mon may hold nothing. Tera is not part of the format, so a Tera line is
// dropped in silence rather than treated as an error.
function validateSet(
  set: {
    species: string;
    item: string;
    ability: string;
    nature: string;
    moves: string[];
  },
  index: number,
): string[] {
  const label = set.species || `Pokémon ${index + 1}`;
  const errors: string[] = [];
  if (!set.species) {
    errors.push(`Pokémon ${index + 1}: Spezies fehlt.`);
  }
  if (!set.ability) {
    errors.push(`${label}: Fähigkeit fehlt.`);
  }
  if (!set.nature) {
    errors.push(`${label}: Wesen fehlt.`);
  }
  if (set.moves.length === 0) {
    errors.push(`${label}: mindestens eine Attacke angeben.`);
  } else if (set.moves.length > MAX_MOVES) {
    errors.push(`${label}: höchstens ${MAX_MOVES} Attacken.`);
  }
  return errors;
}

export function parseTeamsheet(text: string): ParseResult {
  const sets = Team.import(text)?.team ?? [];
  if (sets.length === 0) {
    return {
      ok: false,
      errors: [
        "Daraus lässt sich kein Team lesen. Erwartet wird ein Showdown-Export.",
      ],
    };
  }

  const raw = sets.map((set) => ({
    // `species` carries the species even when a nickname is present; `name`
    // holds the nickname. Only one of them is set on a plain export.
    species: (set.species || set.name || "").trim(),
    item: (set.item ?? "").trim(),
    ability: (set.ability ?? "").trim(),
    nature: (set.nature ?? "").trim(),
    moves: (set.moves ?? []).map((move) => move.trim()).filter(Boolean),
  }));

  const errors: string[] = [];
  if (raw.length !== TEAM_SIZE) {
    errors.push(
      `Das Team braucht genau ${TEAM_SIZE} Pokémon. Gefunden: ${raw.length}.`,
    );
  }
  for (const [index, set] of raw.entries()) {
    errors.push(...validateSet(set, index));
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const mons: TeamsheetMon[] = raw.map((set) => ({
    species: canonicalSpecies(set.species, set.item || null),
    item: set.item || null,
    ability: set.ability,
    nature: set.nature,
    moves: set.moves,
  }));

  // The canonical sheet: five fields per mon, nothing else. Level, EVs, IVs,
  // Tera, nickname, gender, shininess and anything Showdown adds later are
  // gone here, because they were never copied across.
  const ots = mons
    .map((mon) =>
      Sets.exportSet({
        species: mon.species,
        item: mon.item ?? "",
        ability: mon.ability,
        nature: mon.nature,
        moves: mon.moves,
      }).trim(),
    )
    .join("\n\n");

  return { ok: true, ots: `${ots}\n`, mons };
}
