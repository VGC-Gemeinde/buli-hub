// Where a submitted team sheet came from. Stored on `team_sheets.source` so a
// failing route (VRPaste is an undocumented internal API) is diagnosable after
// the fact; the submitted URL itself is deliberately not kept, see
// docs/plans/teamsheet-pastes.md.
export type TeamsheetSource = "pokepaste" | "vrpaste" | "import";

export type TeamsheetInput =
  | { kind: "pokepaste"; id: string }
  | { kind: "vrpaste"; id: string }
  | { kind: "import"; text: string }
  | { kind: "invalid" };

// Paste ids are opaque slugs in both services (`b89ff7cbd139fbcb`, `uQ8gaGGC`).
const PASTE_ID = /^[A-Za-z0-9_-]+$/;

// A link is a single token; every Showdown export contains whitespace. Anything
// with a space or newline in it is therefore a paste, never a URL — which is
// what keeps "Garchomp @ Life Orb" out of the URL branch.
function asUrl(value: string): URL | null {
  if (/\s/.test(value)) {
    return null;
  }
  // Any scheme, not just http(s): "ftp://pokepast.es/x" is a link the user got
  // wrong, and deserves a link-shaped error rather than "das ist kein Team".
  // The protocol check in classifyInput turns it away.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    try {
      return new URL(value);
    } catch {
      return null;
    }
  }
  // A host with a path but no protocol ("pokepast.es/abc") is still a link the
  // user meant as one. A bare word is not, so it falls through to the parser
  // and gets a team-shaped error instead of a link-shaped one.
  if (/^[a-z0-9.-]+\.[a-z]{2,}\//i.test(value)) {
    try {
      return new URL(`https://${value}`);
    } catch {
      return null;
    }
  }
  return null;
}

function hostOf(url: URL): string {
  return url.hostname.toLowerCase().replace(/^www\./, "");
}

// The first path segment is the paste id on both services. Pokepaste also
// serves `/raw` and `/json` under the same id, so a user who copied one of
// those is understood rather than rejected.
function idOf(url: URL): string | null {
  const [id] = url.pathname.split("/").filter(Boolean);
  return id && PASTE_ID.test(id) ? id : null;
}

// Decides how a submitted value is read: a link to one of the two supported
// paste services, or a raw Showdown export. Pure — the fetching happens in the
// server action.
export function classifyInput(value: string): TeamsheetInput {
  const trimmed = value.trim();
  if (trimmed === "") {
    return { kind: "invalid" };
  }

  const url = asUrl(trimmed);
  if (!url) {
    return { kind: "import", text: trimmed };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { kind: "invalid" };
  }

  const host = hostOf(url);
  const id = idOf(url);
  if (host === "pokepast.es") {
    return id ? { kind: "pokepaste", id } : { kind: "invalid" };
  }
  if (host === "vrpastes.com") {
    return id ? { kind: "vrpaste", id } : { kind: "invalid" };
  }
  return { kind: "invalid" };
}

export function pokepasteRawUrl(id: string): string {
  return `https://pokepast.es/${id}/raw`;
}

// VRPaste has no public API. This is the endpoint its own frontend calls, so it
// can change or vanish without notice — every caller must handle failure by
// pointing the user at the other two routes.
export function vrpasteApiUrl(id: string): string {
  return `https://vrpaste-backend.vercel.app/api/paste/${id}?lang=english`;
}
