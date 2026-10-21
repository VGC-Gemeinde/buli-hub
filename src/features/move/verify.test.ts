import { describe, expect, it } from "vitest";
import { allOk, compareAccounts, compareCounts, comparePhotos } from "./verify";

const at = new Date("2026-07-06T10:00:00Z");

describe("compareCounts", () => {
  it("passes equal counts and ignores the tables only the target has", () => {
    const rows = compareCounts(
      { matches: 840, profiles: 260 },
      { matches: 840, profiles: 260, users: 260, sessions: 0 },
    );
    expect(allOk(rows)).toBe(true);
    expect(rows.map((row) => row.check)).toEqual([
      "rows matches",
      "rows profiles",
    ]);
  });

  it("names a table whose count differs or that is missing", () => {
    const rows = compareCounts(
      { matches: 840, bans: 2 },
      { matches: 839, extra: 1 },
    );
    expect(rows.filter((row) => !row.ok).map((row) => row.check)).toEqual([
      "rows bans",
      "rows extra",
      "rows matches",
    ]);
  });
});

describe("compareAccounts", () => {
  const expected = [
    { id: "a", discordId: "1", createdAt: at },
    { id: "b", discordId: "2", createdAt: at },
  ];

  it("passes the same accounts", () => {
    expect(
      allOk(
        compareAccounts(expected, [
          { id: "a", discordId: "1" },
          { id: "b", discordId: "2" },
        ]),
      ),
    ).toBe(true);
  });

  it("names a missing, a changed and an extra account", () => {
    const rows = compareAccounts(expected, [
      { id: "a", discordId: "9" },
      { id: "c", discordId: "3" },
    ]);
    expect(rows.find((row) => row.check === "accounts present")).toMatchObject({
      ok: false,
      detail: "missing: b",
    });
    expect(
      rows.find((row) => row.check === "Discord ids unchanged"),
    ).toMatchObject({ ok: false, detail: "changed: a" });
    expect(rows.find((row) => row.check === "no extra accounts")).toMatchObject(
      { ok: false, detail: "extra: c" },
    );
  });
});

describe("comparePhotos", () => {
  const source = new Map([
    ["u1/a.webp", 100],
    ["u2/b.webp", 200],
  ]);

  it("passes when every referenced photo arrived with its size", () => {
    expect(
      allOk(comparePhotos(["u1/a.webp", "u2/b.webp"], source, new Map(source))),
    ).toBe(true);
  });

  it("names a missing or differently sized photo", () => {
    const rows = comparePhotos(
      ["u1/a.webp", "u2/b.webp"],
      source,
      new Map([["u1/a.webp", 99]]),
    );
    expect(rows[0]).toMatchObject({
      ok: false,
      detail: "missing or different: u1/a.webp, u2/b.webp",
    });
  });
});
