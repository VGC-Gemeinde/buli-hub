import { z } from "zod";

// VRPaste returns structured JSON rather than a Showdown export, and it splits
// a mega into the base species plus a separate `megaEvolution` block. We
// rebuild the plain export ("Staraptor @ Staraptite") and hand it to the same
// parser every other route uses, so all three routes fail with identical
// messages and produce identical stored sheets. The mega block is ignored on
// purpose: `resolveMega` derives it again from species + stone at render time.

const monSchema = z.looseObject({
  species: z.string().optional(),
  name: z.string().optional(),
  item: z.string().nullish(),
  ability: z.string().nullish(),
  nature: z.string().nullish(),
  moves: z.array(z.string()).nullish(),
});

const responseSchema = z.looseObject({
  teams: z.array(monSchema),
});

export type VrpasteShape = z.infer<typeof responseSchema>;

function exportMon(mon: z.infer<typeof monSchema>): string {
  const species = (mon.species || mon.name || "").trim();
  const item = (mon.item ?? "").trim();
  const lines = [item ? `${species} @ ${item}` : species];
  if (mon.ability?.trim()) {
    lines.push(`Ability: ${mon.ability.trim()}`);
  }
  if (mon.nature?.trim()) {
    lines.push(`${mon.nature.trim()} Nature`);
  }
  for (const move of mon.moves ?? []) {
    if (move.trim()) {
      lines.push(`- ${move.trim()}`);
    }
  }
  return lines.join("\n");
}

// A Showdown export built from a VRPaste API response, or null when the
// response is not shaped the way the (undocumented, unversioned) API has been
// shaped so far. Null means "tell the user to use another route", not
// "the team is invalid".
export function vrpasteToShowdown(payload: unknown): string | null {
  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success || parsed.data.teams.length === 0) {
    return null;
  }
  return `${parsed.data.teams.map(exportMon).join("\n\n")}\n`;
}
