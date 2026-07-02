import { describe, expect, it } from "vitest";
import type { GuildMember } from "@/lib/discord";
import { guildIdentity } from "./identity";

const GUILD = "999";

function member(overrides: Partial<GuildMember> = {}): GuildMember {
  return {
    roles: [],
    nick: null,
    avatar: null,
    user: { id: "42", username: "kuro", globalName: null, avatar: null },
    ...overrides,
  };
}

const fallback = {
  displayName: "Global Name",
  username: "global_user",
  avatarUrl: "https://cdn.discordapp.com/avatars/42/global.png",
};

describe("guildIdentity", () => {
  it("prefers the server nickname", () => {
    const identity = guildIdentity(
      GUILD,
      member({
        nick: "Alex | Team Rocket",
        user: { id: "42", username: "kuro", globalName: "AlexK", avatar: null },
      }),
      fallback,
    );
    expect(identity.displayName).toBe("Alex | Team Rocket");
  });

  it("falls back to the global name, then the username", () => {
    expect(
      guildIdentity(
        GUILD,
        member({
          user: {
            id: "42",
            username: "kuro",
            globalName: "AlexK",
            avatar: null,
          },
        }),
        fallback,
      ).displayName,
    ).toBe("AlexK");
    expect(guildIdentity(GUILD, member(), fallback).displayName).toBe("kuro");
  });

  it("always uses the guild username for the handle", () => {
    const identity = guildIdentity(GUILD, member({ nick: "Nick" }), fallback);
    expect(identity.username).toBe("kuro");
  });

  it("prefers the guild avatar over the global one", () => {
    const identity = guildIdentity(
      GUILD,
      member({
        avatar: "guildhash",
        user: {
          id: "42",
          username: "kuro",
          globalName: null,
          avatar: "globalhash",
        },
      }),
      fallback,
    );
    expect(identity.avatarUrl).toBe(
      "https://cdn.discordapp.com/guilds/999/users/42/avatars/guildhash.png",
    );
  });

  it("uses the global avatar when there is no guild avatar", () => {
    const identity = guildIdentity(
      GUILD,
      member({
        user: {
          id: "42",
          username: "kuro",
          globalName: null,
          avatar: "globalhash",
        },
      }),
      fallback,
    );
    expect(identity.avatarUrl).toBe(
      "https://cdn.discordapp.com/avatars/42/globalhash.png",
    );
  });

  it("is null avatar when the member has neither", () => {
    expect(guildIdentity(GUILD, member(), fallback).avatarUrl).toBeNull();
  });

  it("uses .gif for animated avatar hashes", () => {
    const identity = guildIdentity(
      GUILD,
      member({ avatar: "a_animated" }),
      fallback,
    );
    expect(identity.avatarUrl).toBe(
      "https://cdn.discordapp.com/guilds/999/users/42/avatars/a_animated.gif",
    );
  });

  it("falls back to the session identity for non-members", () => {
    expect(guildIdentity(GUILD, null, fallback)).toEqual(fallback);
  });
});
