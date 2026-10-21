import { syncMember } from "@/features/roles/sync";
import { type DiscordUser, discordIdentityFromDiscordUser } from "./discord";
import { exchangeCode, fetchDiscordUser } from "./discord-api";
import { createSession } from "./sessions";
import { classifySignInError, type SignInErrorKind } from "./sign-in-error";
import { findOrCreateUserByDiscordId, rememberSignInIdentity } from "./users";

// What the callback does with Discord's answer (contracts/session.md, "Sign-in
// flow"): check that this browser started the sign-in, trade the code for the
// Discord identity, find or create the account, sync it and start a session.
// The route stays a thin wrapper; Discord's two calls are injectable so the
// whole flow runs in an integration test.

export type StartedSignIn = {
  state: string;
  codeVerifier: string;
  /** The callback address on the host the sign-in started on. */
  redirectUri: string;
};

/**
 * The `buli-hub-oauth` cookie: state, PKCE verifier and the redirect URI the
 * sign-in was started with, joined by dots (the URI base64url-encoded). The
 * redirect URI travels along because Discord must get the identical one at
 * the token exchange, and the callback cannot rebuild it: the cookie only
 * comes back to the host it was set on, which is the host the sign-in
 * started on, whatever APP_BASE_URL says.
 */
export function encodeOAuthCookie(started: StartedSignIn): string {
  return [
    started.state,
    started.codeVerifier,
    Buffer.from(started.redirectUri).toString("base64url"),
  ].join(".");
}

export function decodeOAuthCookie(
  value: string | undefined,
): StartedSignIn | null {
  if (!value) return null;
  const [state, codeVerifier, encodedUri, ...rest] = value.split(".");
  if (!state || !codeVerifier || !encodedUri || rest.length > 0) return null;
  const redirectUri = Buffer.from(encodedUri, "base64url").toString();
  return { state, codeVerifier, redirectUri };
}

/**
 * Where the browser goes after the callback: the host the sign-in started
 * on, but only if that is the host answering the callback. The cookie is
 * host-only, so anything else means it was planted (a sibling subdomain can
 * set cookies for the parent domain), and nobody is sent to a foreign host.
 */
export function returnOrigin(
  redirectUri: string,
  callbackHost: string | null,
): string | null {
  try {
    const url = new URL(redirectUri);
    const sameHost = callbackHost !== null && url.host === callbackHost;
    const httpish = url.protocol === "https:" || url.protocol === "http:";
    return sameHost && httpish && url.pathname === "/auth/callback"
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

export type SignInDeps = {
  exchangeCode: typeof exchangeCode;
  fetchDiscordUser: (accessToken: string) => Promise<DiscordUser>;
  syncMember: typeof syncMember;
};

const discordDeps: SignInDeps = { exchangeCode, fetchDiscordUser, syncMember };

export type SignInResult =
  | { ok: true; userId: string; sessionToken: string }
  | { ok: false; kind: SignInErrorKind; reason: string };

export async function completeSignIn(
  input: {
    /** Query params Discord sent back. */
    code: string | null;
    state: string | null;
    error: string | null;
    /** The decoded `buli-hub-oauth` cookie of this browser. */
    started: StartedSignIn | null;
    clientId: string;
    clientSecret: string;
  },
  deps: SignInDeps = discordDeps,
): Promise<SignInResult> {
  if (input.error) {
    return {
      ok: false,
      kind: classifySignInError({ error: input.error }),
      reason: `Discord returned error=${input.error}`,
    };
  }
  // A response this browser did not start, or started more than ten minutes
  // ago, or a replayed one (the cookie is cleared on the first visit).
  if (!input.started || !input.state || input.state !== input.started.state) {
    return { ok: false, kind: "unknown", reason: "state mismatch" };
  }
  if (!input.code) {
    return { ok: false, kind: "unknown", reason: "no code" };
  }

  let user: DiscordUser;
  try {
    const accessToken = await deps.exchangeCode({
      code: input.code,
      codeVerifier: input.started.codeVerifier,
      redirectUri: input.started.redirectUri,
      clientId: input.clientId,
      clientSecret: input.clientSecret,
    });
    user = await deps.fetchDiscordUser(accessToken);
  } catch (error) {
    return { ok: false, kind: "unknown", reason: String(error) };
  }

  const identity = discordIdentityFromDiscordUser(user);
  const userId = await findOrCreateUserByDiscordId(user.id);
  // Best-effort member sync, as before the move: a Discord failure never
  // blocks sign-in; getRole revalidates on read anyway. It also writes the
  // fresh name and avatar to the profile (FR-003).
  try {
    await deps.syncMember(userId, identity);
  } catch (syncError) {
    console.error("Member sync at sign-in failed:", syncError);
  }
  await rememberSignInIdentity(userId, identity);
  const sessionToken = await createSession(userId);
  return { ok: true, userId, sessionToken };
}
