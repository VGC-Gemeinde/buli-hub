import { describe, expect, it } from "vitest";
import { mapAccounts } from "./accounts";

const created = new Date("2026-07-06T10:00:00Z");

describe("mapAccounts", () => {
  it("keeps id and creation time and reads provider_id, then sub", () => {
    expect(
      mapAccounts([
        {
          id: "a",
          raw_user_meta_data: { provider_id: "1", sub: "2", email: "x@y" },
          created_at: created,
        },
        { id: "b", raw_user_meta_data: { sub: "3" }, created_at: created },
      ]),
    ).toEqual({
      accounts: [
        { id: "a", discordId: "1", createdAt: created },
        { id: "b", discordId: "3", createdAt: created },
      ],
      withoutDiscordId: [],
    });
  });

  it("lists accounts without a Discord id instead of dropping them", () => {
    expect(
      mapAccounts([
        { id: "a", raw_user_meta_data: {}, created_at: created },
        { id: "b", raw_user_meta_data: null, created_at: created },
        {
          id: "c",
          raw_user_meta_data: { provider_id: "" },
          created_at: created,
        },
      ]).withoutDiscordId,
    ).toEqual(["a", "b", "c"]);
  });

  it("carries no email into the result", () => {
    const { accounts } = mapAccounts([
      {
        id: "a",
        raw_user_meta_data: { provider_id: "1", email: "x@y" },
        created_at: created,
      },
    ]);
    expect(JSON.stringify(accounts)).not.toContain("x@y");
  });
});
