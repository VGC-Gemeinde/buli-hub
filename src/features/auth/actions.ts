"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  OAUTH_COOKIE,
  OAUTH_COOKIE_PATH,
  OAUTH_MAX_AGE_SECONDS,
  sessionCookie,
} from "@/lib/auth/cookie-options";
import { callbackUrl, discordOAuthConfig } from "./config";
import {
  authorizeUrl,
  newCodeVerifier,
  newOAuthState,
  pkceChallenge,
} from "./discord";
import { endSession } from "./sessions";
import { encodeOAuthCookie } from "./sign-in";

// Sign-in and sign-out (specs/004-google-cloud-migration, contracts/session.md).

export async function signInWithDiscord() {
  const origin = (await headers()).get("origin");
  if (!origin) {
    throw new Error("Missing Origin header on sign-in request");
  }

  const { clientId } = discordOAuthConfig();
  const state = newOAuthState();
  const codeVerifier = newCodeVerifier();
  (await cookies()).set(OAUTH_COOKIE, encodeOAuthCookie(state, codeVerifier), {
    path: OAUTH_COOKIE_PATH,
    maxAge: OAUTH_MAX_AGE_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  redirect(
    authorizeUrl({
      clientId,
      redirectUri: callbackUrl(origin),
      state,
      codeChallenge: pkceChallenge(codeVerifier),
    }),
  );
}

export async function signOut() {
  const jar = await cookies();
  const cookie = sessionCookie();
  const token = jar.get(cookie.name)?.value;
  // This browser only; the account's other devices stay signed in
  // (specs/003-shared-discord-login, clarification 2026-10-18).
  if (token) {
    await endSession(token);
  }
  jar.set(cookie.name, "", { ...cookie.options, maxAge: 0 });
  redirect("/");
}
