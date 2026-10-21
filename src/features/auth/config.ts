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

// Discord sends the browser back here. Behind Cloud Run's proxy the request
// origin is the container's own address, so APP_BASE_URL wins where it is
// set; locally the request origin is right.
export function callbackUrl(origin: string): string {
  return `${process.env.APP_BASE_URL || origin}/auth/callback`;
}
