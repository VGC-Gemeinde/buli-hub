import { describe, expect, it } from "vitest";
import { divisionLabel, filterUsers, type ImpersonatableUser } from "./users";

function user(overrides: Partial<ImpersonatableUser> = {}): ImpersonatableUser {
  return {
    userId: "11111111-1111-4111-8111-111111111111",
    displayName: "Jörg Müller",
    username: "jorgm",
    role: "player",
    division: "Division 1a",
    dropped: false,
    ...overrides,
  };
}

describe("divisionLabel", () => {
  it("names a division before groups exist", () => {
    expect(divisionLabel(1, null)).toBe("Division 1");
  });

  it("names a sub-division once the group is known", () => {
    expect(divisionLabel(1, 0)).toBe("Division 1a");
    expect(divisionLabel(3, 2)).toBe("Division 3c");
  });

  it("returns null for an unplaced user", () => {
    expect(divisionLabel(null, null)).toBeNull();
    expect(divisionLabel(null, 0)).toBeNull();
  });
});

describe("filterUsers", () => {
  const users = [
    user({ displayName: "Jörg Müller", username: "jorgm" }),
    user({
      userId: "22222222-2222-4222-8222-222222222222",
      displayName: "Anna Schmidt",
      username: "annas",
      role: "admin",
      division: "Division 2b",
    }),
    user({
      userId: "33333333-3333-4333-8333-333333333333",
      displayName: null,
      username: null,
      division: null,
      dropped: true,
    }),
  ];

  it("returns everyone for an empty query", () => {
    expect(filterUsers(users, "")).toHaveLength(3);
    expect(filterUsers(users, "   ")).toHaveLength(3);
  });

  it("matches on display name, case-insensitively", () => {
    expect(filterUsers(users, "anna")).toHaveLength(1);
    expect(filterUsers(users, "ANNA")).toHaveLength(1);
  });

  // With cloned data you type a name half-remembered from Discord.
  it("ignores diacritics in both the query and the data", () => {
    expect(filterUsers(users, "jorg")[0].displayName).toBe("Jörg Müller");
    expect(filterUsers(users, "jörg")[0].displayName).toBe("Jörg Müller");
    expect(filterUsers(users, "müller")).toHaveLength(1);
  });

  it("matches on username, division, role and id", () => {
    expect(filterUsers(users, "annas")).toHaveLength(1);
    expect(filterUsers(users, "Division 2b")).toHaveLength(1);
    expect(filterUsers(users, "admin")).toHaveLength(1);
    expect(filterUsers(users, "22222222")).toHaveLength(1);
  });

  it("skips null fields instead of throwing", () => {
    expect(filterUsers(users, "player")).toHaveLength(2);
  });

  it("returns nothing when nothing matches", () => {
    expect(filterUsers(users, "zzzz")).toEqual([]);
  });

  it("does not mutate the input", () => {
    const input = [...users];
    filterUsers(input, "anna");
    expect(input).toEqual(users);
  });
});
