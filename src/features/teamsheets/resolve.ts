import { parseTeamsheet, type TeamsheetMon } from "./parse";
import {
  classifyInput,
  pokepasteRawUrl,
  type TeamsheetSource,
  vrpasteApiUrl,
} from "./sources";
import { vrpasteToShowdown } from "./vrpaste";

// One pipeline for all three routes: a Pokepaste link, a VRPaste link, or a
// Showdown export pasted straight in. Whatever comes in ends up as the same
// canonical sheet, and every route fails with the same messages, because the
// link routes only differ in how they obtain the text.
//
// The fetchers are injected so this stays testable without touching the
// network — which matters most for VRPaste, whose API is undocumented and
// unversioned and could change under us at any time.

export type Fetchers = {
  // Resolved text, or null on any failure (network, timeout, non-2xx).
  text: (url: string) => Promise<string | null>;
  // Parsed JSON, or null on any failure including malformed bodies.
  json: (url: string) => Promise<unknown>;
};

export type ResolveResult =
  | { ok: true; source: TeamsheetSource; ots: string; mons: TeamsheetMon[] }
  | { ok: false; error: string; details?: string[] };

// VRPaste has no public API and no stability promise, so its failure message
// must always name the two routes that do not depend on it.
const VRPASTE_DOWN =
  "VRPaste ist gerade nicht erreichbar. Bitte einen Pokepaste-Link angeben oder das Team direkt aus Showdown importieren.";

const messages = {
  invalid:
    "Das ist weder ein Pokepaste- oder VRPaste-Link noch ein Showdown-Export.",
  pokepasteDown:
    "Dieses Pokepaste konnte nicht geladen werden. Bitte den Link prüfen.",
  vrpasteDown: VRPASTE_DOWN,
  vrpasteShape: VRPASTE_DOWN,
  incomplete: "Das Teamsheet ist nicht vollständig.",
} as const;

async function textFor(
  input: ReturnType<typeof classifyInput>,
  fetchers: Fetchers,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  switch (input.kind) {
    case "import":
      return { ok: true, text: input.text };
    case "pokepaste": {
      const text = await fetchers.text(pokepasteRawUrl(input.id));
      return text === null
        ? { ok: false, error: messages.pokepasteDown }
        : { ok: true, text };
    }
    case "vrpaste": {
      const payload = await fetchers.json(vrpasteApiUrl(input.id));
      if (payload === null) {
        return { ok: false, error: messages.vrpasteDown };
      }
      const text = vrpasteToShowdown(payload);
      return text === null
        ? { ok: false, error: messages.vrpasteShape }
        : { ok: true, text };
    }
    default:
      return { ok: false, error: messages.invalid };
  }
}

// Turns whatever the user submitted into a stored-ready sheet, or into an
// error the form can show next to the field it belongs to.
export async function resolveTeamsheet(
  value: string,
  fetchers: Fetchers,
): Promise<ResolveResult> {
  const input = classifyInput(value);
  const fetched = await textFor(input, fetchers);
  if (!fetched.ok) {
    return { ok: false, error: fetched.error };
  }

  const parsed = parseTeamsheet(fetched.text);
  if (!parsed.ok) {
    return { ok: false, error: messages.incomplete, details: parsed.errors };
  }

  // `invalid` never reaches here — textFor turns it into an error.
  const source: TeamsheetSource =
    input.kind === "invalid" ? "import" : input.kind;
  return { ok: true, source, ots: parsed.ots, mons: parsed.mons };
}
