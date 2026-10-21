import type { DiscordUser } from "./discord";

// The two calls of the sign-in that reach Discord (research.md R4). The
// access token is used once, for `/users/@me`, and then dropped: the hub keeps
// no Discord token.

const DISCORD_API = "https://discord.com/api";

export async function exchangeCode(input: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}): Promise<string> {
  const response = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: input.redirectUri,
      code_verifier: input.codeVerifier,
      client_id: input.clientId,
      client_secret: input.clientSecret,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(
      `Discord token exchange failed: ${response.status} ${await response.text()}`,
    );
  }
  const body = (await response.json()) as { access_token?: string };
  if (!body.access_token) {
    throw new Error("Discord token exchange returned no access token");
  }
  return body.access_token;
}

export async function fetchDiscordUser(
  accessToken: string,
): Promise<DiscordUser> {
  const response = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(
      `Discord /users/@me failed: ${response.status} ${await response.text()}`,
    );
  }
  return (await response.json()) as DiscordUser;
}
