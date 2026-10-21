import { createHash, randomBytes } from "node:crypto";
import type { DiscordIdentity } from "./identity";

// The pure parts of signing in with Discord (specs/004-google-cloud-migration,
// research.md R4): authorization code flow with state and PKCE, scope
// `identify` only, so Discord sends no email.

export const DISCORD_AUTHORIZE_URL = "https://discord.com/oauth2/authorize";
export const DISCORD_SCOPE = "identify";

export function newOAuthState(): string {
  return randomBytes(16).toString("base64url");
}

export function newCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

/** RFC 7636 S256: base64url(SHA-256(verifier)). */
export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function authorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL(DISCORD_AUTHORIZE_URL);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: input.clientId,
    scope: DISCORD_SCOPE,
    redirect_uri: input.redirectUri,
    state: input.state,
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

/** The fields of Discord's `GET /users/@me` the hub reads. */
export type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
};

// The identity shown in the hub until the guild sync replaces it with the
// server nickname: the global display name, falling back to the username,
// and the avatar as a PNG (an animated one shows its first frame, as before).
export function discordIdentityFromDiscordUser(
  user: DiscordUser,
): DiscordIdentity {
  return {
    discordId: user.id,
    displayName: user.global_name || user.username,
    username: user.username,
    avatarUrl: user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
      : null,
  };
}
