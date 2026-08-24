import { describe, expect, it } from "vitest";
import {
  bucketMembership,
  isConfirmedNonMember,
  MEMBERSHIP_ERROR,
  membershipBlock,
  type RosterMembership,
} from "./membership";

function row(overrides: Partial<RosterMembership> = {}): RosterMembership {
  return {
    userId: "user",
    displayName: "Spieler",
    username: "spieler",
    avatarUrl: null,
    guildMember: null,
    guildMemberCheckedAt: null,
    ...overrides,
  };
}

describe("isConfirmedNonMember", () => {
  it("is true only for a confirmed false", () => {
    expect(isConfirmedNonMember(false)).toBe(true);
    expect(isConfirmedNonMember(true)).toBe(false);
    expect(isConfirmedNonMember(null)).toBe(false);
  });
});

describe("membershipBlock", () => {
  it("refuses a confirmed non-member with the verbatim error", () => {
    expect(membershipBlock(false)).toEqual({
      ok: false,
      error: MEMBERSHIP_ERROR,
    });
  });

  it("lets a member proceed", () => {
    expect(membershipBlock(true)).toBeNull();
  });

  it("fails open on unknown", () => {
    expect(membershipBlock(null)).toBeNull();
  });
});

describe("bucketMembership", () => {
  it("splits confirmed non-members and never-checked players", () => {
    const nonMember = row({ userId: "a", guildMember: false });
    const unchecked = row({ userId: "b", guildMember: null });
    const member = row({ userId: "c", guildMember: true });
    const buckets = bucketMembership([member, unchecked, nonMember]);
    expect(buckets.nonMembers).toEqual([nonMember]);
    expect(buckets.unchecked).toEqual([unchecked]);
    expect(buckets.allConfirmed).toBe(false);
  });

  it("is allConfirmed only when both buckets are empty", () => {
    expect(bucketMembership([row({ guildMember: true })]).allConfirmed).toBe(
      true,
    );
    expect(bucketMembership([row({ guildMember: false })]).allConfirmed).toBe(
      false,
    );
    expect(bucketMembership([row({ guildMember: null })]).allConfirmed).toBe(
      false,
    );
  });

  it("is allConfirmed for an empty roster", () => {
    expect(bucketMembership([]).allConfirmed).toBe(true);
  });

  it("takes the oldest check as the roster-wide stamp", () => {
    const older = new Date("2026-08-01T10:00:00Z");
    const newer = new Date("2026-08-20T10:00:00Z");
    const buckets = bucketMembership([
      row({ userId: "a", guildMember: true, guildMemberCheckedAt: newer }),
      row({ userId: "b", guildMember: false, guildMemberCheckedAt: older }),
    ]);
    expect(buckets.oldestCheckedAt).toEqual(older);
  });

  it("ignores never-checked rows for the stamp", () => {
    const checked = new Date("2026-08-20T10:00:00Z");
    const buckets = bucketMembership([
      row({ userId: "a", guildMember: true, guildMemberCheckedAt: checked }),
      row({ userId: "b", guildMember: null }),
    ]);
    expect(buckets.oldestCheckedAt).toEqual(checked);
  });

  it("has no stamp when nobody was ever checked", () => {
    expect(bucketMembership([row()]).oldestCheckedAt).toBeNull();
  });
});
