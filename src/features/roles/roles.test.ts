import { describe, expect, it } from "vitest";
import { deriveRole, isRoleStale, ROLE_SYNC_TTL_MS, roleLabel } from "./roles";

const mapping = { dev: "111", admin: "222", staff: "333" };

describe("deriveRole", () => {
  it("maps each configured role", () => {
    expect(deriveRole(["111"], mapping)).toBe("dev");
    expect(deriveRole(["222"], mapping)).toBe("admin");
    expect(deriveRole(["333"], mapping)).toBe("staff");
  });

  it("lets the highest role win when a member has several", () => {
    expect(deriveRole(["333", "222"], mapping)).toBe("admin");
    expect(deriveRole(["333", "222", "111"], mapping)).toBe("dev");
    expect(deriveRole(["111", "333"], mapping)).toBe("dev");
  });

  it("ignores unmapped role ids", () => {
    expect(deriveRole(["999", "888"], mapping)).toBe("player");
    expect(deriveRole(["999", "333"], mapping)).toBe("staff");
  });

  it("maps members without roles to player", () => {
    expect(deriveRole([], mapping)).toBe("player");
  });

  it("maps non-members to player", () => {
    expect(deriveRole(null, mapping)).toBe("player");
  });
});

describe("isRoleStale", () => {
  const now = new Date("2026-07-02T12:00:00Z");

  it("treats never-synced as stale", () => {
    expect(isRoleStale(null, now)).toBe(true);
  });

  it("trusts a sync within the TTL", () => {
    const recent = new Date(now.getTime() - ROLE_SYNC_TTL_MS + 1000);
    expect(isRoleStale(recent, now)).toBe(false);
  });

  it("marks a sync older than the TTL as stale", () => {
    const old = new Date(now.getTime() - ROLE_SYNC_TTL_MS - 1000);
    expect(isRoleStale(old, now)).toBe(true);
  });
});

describe("roleLabel", () => {
  it("labels all roles in German", () => {
    expect(roleLabel("dev")).toBe("Dev");
    expect(roleLabel("admin")).toBe("Admin");
    expect(roleLabel("staff")).toBe("Staff");
    expect(roleLabel("player")).toBe("Spieler");
  });
});
