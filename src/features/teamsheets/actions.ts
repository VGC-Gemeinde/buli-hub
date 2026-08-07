"use server";

import { currentUser } from "@/features/roles/guard";
import { type Fetchers, type ResolveResult, resolveTeamsheet } from "./resolve";
import { type MonIcon, monIcons } from "./view";

// The one validation entry point, shared by every surface that accepts a team
// sheet: the player report form (link fields on blur, import modal on confirm)
// and the staff/dispute editor. Same code, same errors, wherever a sheet is
// entered.

// Neither service is ours: Pokepaste is a courtesy, VRPaste is an internal API
// with no stability promise. A slow answer must not hold a form hostage, so
// both get a hard ceiling and every failure collapses to null.
const TIMEOUT_MS = 8000;

const fetchers: Fetchers = {
  async text(url) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
      return response.ok ? await response.text() : null;
    } catch {
      return null;
    }
  },
  async json(url) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
      return response.ok ? await response.json() : null;
    } catch {
      return null;
    }
  },
};

export type ValidateTeamsheetResult =
  | { ok: true; source: ResolveOk["source"]; ots: string; icons: MonIcon[] }
  | { ok: false; error: string; details?: string[] };

type ResolveOk = Extract<ResolveResult, { ok: true }>;

export async function validateTeamsheet(
  value: string,
): Promise<ValidateTeamsheetResult> {
  // Not an authorization check — the sheets themselves are public once
  // reported. It keeps the endpoint from being a general-purpose URL fetcher
  // for anonymous callers.
  const current = await currentUser();
  if (!current) {
    return { ok: false, error: "Nicht angemeldet" };
  }

  const resolved = await resolveTeamsheet(value, fetchers);
  if (!resolved.ok) {
    return resolved;
  }

  return {
    ok: true,
    source: resolved.source,
    ots: resolved.ots,
    icons: monIcons(resolved.mons),
  };
}
