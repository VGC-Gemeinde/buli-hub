import type { User } from "@supabase/supabase-js";

export type DiscordIdentity = {
  /** Discord snowflake id from the auth metadata. */
  discordId: string | null;
  /** Discord global display name, falling back to the username. */
  displayName: string | null;
  /** Discord username (the @handle). */
  username: string | null;
  avatarUrl: string | null;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

// Maps the user metadata Supabase Auth stores after Discord OAuth to the
// identity shown in the UI. Defensive on purpose: metadata is untyped and
// individual fields may be absent depending on the Discord account.
export function discordIdentityFromUser(user: User): DiscordIdentity {
  const meta = asRecord(user.user_metadata);
  const customClaims = asRecord(meta.custom_claims);

  return {
    discordId: asString(meta.provider_id) ?? asString(meta.sub),
    displayName:
      asString(customClaims.global_name) ??
      asString(meta.full_name) ??
      asString(meta.name),
    username: asString(meta.user_name) ?? asString(meta.name),
    avatarUrl: asString(meta.avatar_url) ?? asString(meta.picture),
  };
}
