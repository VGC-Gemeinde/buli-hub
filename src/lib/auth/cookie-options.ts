// The hub session cookie (specs/004-google-cloud-migration,
// contracts/session.md). Pure: reads AUTH_COOKIE_DOMAIN and NODE_ENV only.
//
// With AUTH_COOKIE_DOMAIN (production, and only once another Gemeinde site
// reads the session) the cookie covers the whole domain under a name of its
// own; without it it stays on this host. The two names differ so a host-only
// cookie can never shadow the domain one while the setting is switched on.
// No browser code reads the session, so it is httpOnly everywhere.

type Env = Record<string, string | undefined>;

export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export type SessionCookie = {
  name: string;
  options: {
    domain?: string;
    path: "/";
    sameSite: "lax";
    secure: boolean;
    httpOnly: true;
    maxAge: number;
  };
};

export function sessionCookie(env: Env = process.env): SessionCookie {
  const domain = env.AUTH_COOKIE_DOMAIN || undefined;
  return {
    name: domain ? "gemeinde-auth" : "buli-hub-auth",
    options: {
      ...(domain ? { domain } : {}),
      path: "/",
      sameSite: "lax",
      // `next dev` may be reached over plain http from a phone on the LAN.
      secure: env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: SESSION_MAX_AGE_SECONDS,
    },
  };
}

// The short-lived cookie that ties Discord's answer to the browser that
// started the sign-in: state and PKCE verifier, read once by the callback.
export const OAUTH_COOKIE = "buli-hub-oauth";
export const OAUTH_COOKIE_PATH = "/auth/callback";
export const OAUTH_MAX_AGE_SECONDS = 10 * 60;

// Supabase's session cookie, its chunks and its PKCE verifier
// (`sb-<ref>-auth-token`, `…-auth-token.0`, `…-auth-token-code-verifier`),
// cleared by the proxy after the move.
export function isLegacySupabaseCookie(name: string): boolean {
  return /^sb-[a-z0-9]+-auth-token(\.\d+|-code-verifier)?$/.test(name);
}
