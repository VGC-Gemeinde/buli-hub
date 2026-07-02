import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { discordIdentityFromUser } from "./identity";

function makeUser(userMetadata: unknown): User {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    app_metadata: { provider: "discord" },
    user_metadata: userMetadata,
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00Z",
  } as User;
}

// Shape observed from Supabase Auth after Discord OAuth.
const fullMetadata = {
  avatar_url: "https://cdn.discordapp.com/avatars/123/abc.png",
  custom_claims: { global_name: "Kuro" },
  email: "kuro@example.com",
  full_name: "kuro_full",
  name: "kuro_username",
  picture: "https://cdn.discordapp.com/avatars/123/abc.png",
  provider_id: "123456789012345678",
  sub: "123456789012345678",
};

describe("discordIdentityFromUser", () => {
  it("maps complete Discord metadata", () => {
    expect(discordIdentityFromUser(makeUser(fullMetadata))).toEqual({
      discordId: "123456789012345678",
      displayName: "Kuro",
      username: "kuro_username",
      avatarUrl: "https://cdn.discordapp.com/avatars/123/abc.png",
    });
  });

  it("falls back to full_name when there is no global name", () => {
    const { custom_claims: _omitted, ...rest } = fullMetadata;
    expect(discordIdentityFromUser(makeUser(rest)).displayName).toBe(
      "kuro_full",
    );
  });

  it("falls back to the username when only name is present", () => {
    expect(
      discordIdentityFromUser(makeUser({ name: "kuro_username" })).displayName,
    ).toBe("kuro_username");
  });

  it("falls back to sub for the Discord id and picture for the avatar", () => {
    const identity = discordIdentityFromUser(
      makeUser({ sub: "42", picture: "https://example.com/a.png" }),
    );
    expect(identity.discordId).toBe("42");
    expect(identity.avatarUrl).toBe("https://example.com/a.png");
  });

  it("returns nulls for empty metadata", () => {
    expect(discordIdentityFromUser(makeUser({}))).toEqual({
      discordId: null,
      displayName: null,
      username: null,
      avatarUrl: null,
    });
  });

  it("ignores malformed metadata values", () => {
    const identity = discordIdentityFromUser(
      makeUser({
        provider_id: 123,
        custom_claims: "not-an-object",
        full_name: "",
        name: "kuro_username",
        avatar_url: null,
      }),
    );
    expect(identity).toEqual({
      discordId: null,
      displayName: "kuro_username",
      username: "kuro_username",
      avatarUrl: null,
    });
  });

  it("handles user_metadata not being an object", () => {
    expect(discordIdentityFromUser(makeUser(undefined))).toEqual({
      discordId: null,
      displayName: null,
      username: null,
      avatarUrl: null,
    });
  });
});
