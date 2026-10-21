// The Discord identity the hub shows for an account: the Discord id from
// `users`, names and avatar from Discord at sign-in and from the guild sync
// afterwards (stored on `profiles`).
export type DiscordIdentity = {
  /** Discord snowflake id. */
  discordId: string | null;
  /** Discord global display name, falling back to the username. */
  displayName: string | null;
  /** Discord username (the @handle). */
  username: string | null;
  avatarUrl: string | null;
};
