import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { callbackUrl, discordOAuthConfig } from "@/features/auth/config";
import { completeSignIn, decodeOAuthCookie } from "@/features/auth/sign-in";
import { SIGN_IN_ERROR_PARAM } from "@/features/auth/sign-in-error";
import {
  OAUTH_COOKIE,
  OAUTH_COOKIE_PATH,
  sessionCookie,
} from "@/lib/auth/cookie-options";

// OAuth callback: Discord redirects here with a code, which becomes a session
// (specs/004-google-cloud-migration, contracts/session.md). Kept as a thin
// wrapper around completeSignIn.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  // Behind Cloud Run's proxy, `request.url` reflects the container's own
  // listen address (0.0.0.0:8080), not the public domain — redirects must
  // use APP_BASE_URL. Locally it is unset and the request origin is correct.
  const base = process.env.APP_BASE_URL || origin;

  const jar = await cookies();
  const started = decodeOAuthCookie(jar.get(OAUTH_COOKIE)?.value);
  // Read once: a replayed callback finds no cookie and fails.
  jar.set(OAUTH_COOKIE, "", { path: OAUTH_COOKIE_PATH, maxAge: 0 });

  const result = await completeSignIn({
    code: searchParams.get("code"),
    state: searchParams.get("state"),
    error: searchParams.get("error"),
    started,
    redirectUri: callbackUrl(origin),
    ...discordOAuthConfig(),
  });

  if (!result.ok) {
    // The raw reason stays here in the log; only the category reaches the UI.
    console.error(`Sign-in failed (${result.kind}):`, result.reason);
    return NextResponse.redirect(
      `${base}/?${SIGN_IN_ERROR_PARAM}=${result.kind}`,
    );
  }

  const cookie = sessionCookie();
  jar.set(cookie.name, result.sessionToken, cookie.options);
  return NextResponse.redirect(base);
}
