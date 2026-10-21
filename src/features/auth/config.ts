// The Discord application the hub signs in with (research.md R4). Read at
// call time, so a missing value fails the sign-in, not the build.
export function discordOAuthConfig(): {
  clientId: string;
  clientSecret: string;
} {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET must be set (see .env.example)",
    );
  }
  return { clientId, clientSecret };
}

// Discord sends the browser back to the host the sign-in started on: the
// short-lived OAuth cookie lives there, so a callback on another host (staging
// and production are each reachable under two names) could never be matched.
// `origin` is the Origin header of the Server Action, the public host.
export function callbackUrl(origin: string): string {
  return `${origin}/auth/callback`;
}
