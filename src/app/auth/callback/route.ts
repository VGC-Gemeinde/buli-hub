import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { discordOAuthConfig } from "@/features/auth/config";
import {
  completeSignIn,
  decodeOAuthCookie,
  returnOrigin,
} from "@/features/auth/sign-in";
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
  const { searchParams } = new URL(request.url);

  const jar = await cookies();
  const cookieStarted = decodeOAuthCookie(jar.get(OAUTH_COOKIE)?.value);
  // Read once: a replayed callback finds no cookie and fails.
  jar.set(OAUTH_COOKIE, "", { path: OAUTH_COOKIE_PATH, maxAge: 0 });

  // Back to the host the sign-in started on, which must be this one. Behind
  // Cloud Run `request.url` carries the container's own address, so the
  // public host comes from the Host header; without a usable start, the
  // configured base URL is where an error is shown.
  const host = (await headers()).get("host");
  const origin = cookieStarted
    ? returnOrigin(cookieStarted.redirectUri, host)
    : null;
  const started = origin ? cookieStarted : null;
  const base =
    origin ?? process.env.APP_BASE_URL ?? new URL(request.url).origin;

  const result = await completeSignIn({
    code: searchParams.get("code"),
    state: searchParams.get("state"),
    error: searchParams.get("error"),
    started,
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
