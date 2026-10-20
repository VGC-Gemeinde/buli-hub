import type { CookieOptionsWithName } from "@supabase/ssr";

// The shared Gemeinde session (specs/003-shared-discord-login/contracts/shared-session.md).
// This file is kept byte-identical in gemeinde-tippspiel: a change goes into every app that shares
// the session, in the same feature.
//
// In production AUTH_COOKIE_DOMAIN=.vgcgemein.de makes one sign-in count for every Gemeinde site,
// under a name of its own so sessions from before the switch are simply not read. Without it
// (local development, staging) the cookie keeps the library's per-host default name: locally
// buli-hub and tippspiel both run on localhost against different Supabase projects, and one fixed
// name would collide there. No browser code reads the session, so it is httpOnly everywhere.

type Env = Record<string, string | undefined>;

export function sessionCookieOptions(
  env: Env = process.env,
): CookieOptionsWithName {
  const domain = env.AUTH_COOKIE_DOMAIN;
  if (!domain) {
    return { httpOnly: true };
  }
  return {
    name: "gemeinde-auth",
    domain,
    path: "/",
    sameSite: "lax",
    secure: true,
    httpOnly: true,
  };
}

/** The session cookie name the library uses by default: `sb-<first host label>-auth-token`. */
export function legacySessionKey(supabaseUrl: string): string {
  return `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
}
