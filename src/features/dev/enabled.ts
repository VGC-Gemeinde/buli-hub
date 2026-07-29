import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// The gate for everything under /dev. Two questions, deliberately separate:
//
//   devToolsConfigured() — is this deployment allowed to expose /dev at all?
//   devToolsEnabled()    — may *this request* see it?
//
// In `npm run dev` both are trivially true. Outside development the tooling is
// off unless ENABLE_DEV_TOOLS is "true"; the production Cloud Run service never
// sets it (docs/deployment.md §5). Staging does — and staging is served on a
// public, merely-unguessable URL, so the flag alone would be too thin a
// defence: /dev/login mints an admin session for any persona and /dev/login-as
// for any copied user. Outside development the request must therefore also
// carry the unlock cookie, obtained once via /dev/unlock?token=<DEV_TOOLS_TOKEN>.

const UNLOCK_COOKIE = "buli_dev_tools";

function inDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Env-only check, safe to call outside a request scope. True when the
 * deployment may expose /dev — not that the caller is allowed to see it.
 */
export function devToolsConfigured(): boolean {
  return inDevelopment() || process.env.ENABLE_DEV_TOOLS === "true";
}

/** The configured unlock token, or null when unset (which fails closed). */
export function devToolsToken(): string | null {
  const token = process.env.DEV_TOOLS_TOKEN;
  return token && token.length > 0 ? token : null;
}

// Compare digests rather than the raw strings: equal length regardless of
// input, so timingSafeEqual never throws and the comparison leaks nothing.
export function sameToken(a: string, b: string): boolean {
  return timingSafeEqual(
    createHash("sha256").update(a).digest(),
    createHash("sha256").update(b).digest(),
  );
}

/**
 * The check every /dev page (via its layout) and route handler performs.
 * Outside development this fails closed: no ENABLE_DEV_TOOLS, no
 * DEV_TOOLS_TOKEN, or no matching unlock cookie all mean "not found".
 */
export async function devToolsEnabled(): Promise<boolean> {
  if (inDevelopment()) {
    return true;
  }
  if (process.env.ENABLE_DEV_TOOLS !== "true") {
    return false;
  }
  const token = devToolsToken();
  if (!token) {
    return false;
  }
  const cookie = (await cookies()).get(UNLOCK_COOKIE)?.value;
  return cookie !== undefined && sameToken(cookie, token);
}

/** Name and options for the unlock cookie, shared with /dev/unlock. */
export const unlockCookie = {
  name: UNLOCK_COOKIE,
  options: {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    // A working session's worth; re-unlocking is one URL visit.
    maxAge: 60 * 60 * 24 * 7,
  },
} as const;
