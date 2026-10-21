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

/** The `buli-hub-oauth` cookie: state and PKCE verifier, joined by a dot. */
export function encodeOAuthCookie(state: string, codeVerifier: string): string {
  return `${state}.${codeVerifier}`;
}

export function decodeOAuthCookie(
  value: string | undefined,
): { state: string; codeVerifier: string } | null {
  if (!value) return null;
  const [state, codeVerifier, ...rest] = value.split(".");
  if (!state || !codeVerifier || rest.length > 0) return null;
  return { state, codeVerifier };
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
    started: { state: string; codeVerifier: string } | null;
    redirectUri: string;
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
      redirectUri: input.redirectUri,
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
