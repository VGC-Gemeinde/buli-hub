import { parseTeamsheet } from "@/features/teamsheets/parse";
import type { SheetRow } from "./report";

// The server's last word on a team sheet. The form sends the canonical OTS it
// got back from `validateTeamsheet`, and every write path runs it through the
// parser again before it reaches the database.
//
// This is not paranoia about a tampered client: a client can put anything into
// the import box anyway, and we deliberately store no source URL, so there is
// no provenance claim that could be made false. It is about the stored sheet
// being *the parser's* output and nothing else — which is what guarantees that
// no EV line can ever reach the column, no matter what was posted.
//
// Server-only: it pulls in @pkmn/sets, which has no business in a client bundle.
export function canonicalSheets(
  sheets: SheetRow[],
):
  | { ok: true; sheets: SheetRow[] }
  | { ok: false; error: string; details: string[] } {
  const canonical: SheetRow[] = [];
  for (const sheet of sheets) {
    const parsed = parseTeamsheet(sheet.ots);
    if (!parsed.ok) {
      return {
        ok: false,
        error: "Das Teamsheet ist nicht vollständig.",
        details: parsed.errors,
      };
    }
    canonical.push({ ...sheet, ots: parsed.ots });
  }
  return { ok: true, sheets: canonical };
}
