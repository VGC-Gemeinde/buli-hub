import { describe, expect, it } from "vitest";
import {
  BAN_ERROR,
  banBlock,
  banConflicts,
  banGuard,
  parseDiscordId,
} from "./bans";

describe("banBlock", () => {
  it("refuses a banned caller with the neutral message", () => {
    expect(banBlock(true)).toEqual({ ok: false, error: BAN_ERROR });
    expect(banBlock(false)).toBeNull();
  });

  it("never names a reason", () => {
    expect(BAN_ERROR).not.toMatch(/weil|Grund|Begründung/);
  });
});

describe("parseDiscordId", () => {
  it("accepts a snowflake, trimmed", () => {
    expect(parseDiscordId(" 123456789012345678 ")).toBe("123456789012345678");
    expect(parseDiscordId("12345678901234567")).toBe("12345678901234567");
  });

  it("accepts a copied mention", () => {
    expect(parseDiscordId("<@123456789012345678>")).toBe("123456789012345678");
    expect(parseDiscordId("<@!123456789012345678>")).toBe("123456789012345678");
  });

  it.each([
    "",
    "1234567890123456", // 16 digits
    "123456789012345678901", // 21 digits
    "12345678901234567a",
    "@anton",
  ])("refuses %s", (input) => {
    expect(parseDiscordId(input)).toBeNull();
  });
});

describe("banConflicts", () => {
  const base = {
    userId: "u",
    seasonName: "Saison 9",
    registered: false,
    playing: false,
    pendingOfferFor: null,
  };

  it("finds nothing for someone outside the season", () => {
    expect(banConflicts({ ...base, phase: "regular_season" })).toEqual([]);
    expect(banConflicts({ ...base, phase: "not_started" })).toEqual([]);
  });

  it("points a registration before the seeding to the cancel", () => {
    for (const phase of ["registration_open", "registration_closed"] as const) {
      const [conflict] = banConflicts({ ...base, phase, registered: true });
      expect(conflict).toMatchObject({
        kind: "registration",
        actionLabel: "Anmeldung stornieren",
        href: "/spieler/u",
      });
      expect(conflict.text).toContain("Saison 9");
    }
  });

  it("points a player in the finalized or running season to the drop", () => {
    for (const phase of [
      "seeded",
      "schedule_hidden",
      "regular_season",
    ] as const) {
      expect(
        banConflicts({ ...base, phase, registered: true, playing: true }),
      ).toEqual([
        expect.objectContaining({
          kind: "placement",
          actionLabel: "Spieler droppen",
        }),
      ]);
    }
  });

  it("sees no conflict in a dropped player", () => {
    expect(
      banConflicts({
        ...base,
        phase: "regular_season",
        registered: true,
        playing: false,
      }),
    ).toEqual([]);
  });

  it("points an open replacement offer to the dropped player's profile", () => {
    expect(
      banConflicts({
        ...base,
        phase: "regular_season",
        pendingOfferFor: { userId: "x", name: "Anton" },
      }),
    ).toEqual([
      {
        kind: "offer",
        text: "Hat ein offenes Angebot als Ersatz für Anton.",
        actionLabel: "Angebot zurückziehen",
        href: "/spieler/x",
      },
    ]);
  });
});

describe("banGuard", () => {
  const ok = {
    reason: "Mehrfach nicht angetreten",
    alreadyBanned: false,
    self: false,
    conflicts: 0,
    acknowledged: false,
  };

  it("allows a ban with a reason and no conflicts", () => {
    expect(banGuard(ok)).toBeNull();
  });

  it("allows conflicts once they are acknowledged", () => {
    expect(banGuard({ ...ok, conflicts: 2, acknowledged: true })).toBeNull();
  });

  it.each([
    [{ reason: "  " }, "Begründung"],
    [{ alreadyBanned: true }, "bereits gebannt"],
    [{ self: true }, "selbst"],
    [{ conflicts: 1 }, "Konflikte"],
  ])("refuses %o", (patch, message) => {
    expect(banGuard({ ...ok, ...patch })).toContain(message);
  });
});
