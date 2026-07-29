import { describe, expect, it } from "vitest";
import { buildScrubSql, SYNTHETIC_NAMES, syntheticIdentity } from "./scrub";

describe("syntheticIdentity", () => {
  it("cycles the fixture list", () => {
    expect(syntheticIdentity(1).displayName).toBe(SYNTHETIC_NAMES[0]);
    expect(syntheticIdentity(SYNTHETIC_NAMES.length).displayName).toBe(
      SYNTHETIC_NAMES[SYNTHETIC_NAMES.length - 1],
    );
    expect(syntheticIdentity(SYNTHETIC_NAMES.length + 1).displayName).toBe(
      SYNTHETIC_NAMES[0],
    );
  });

  it("gives every user a distinct username even when names repeat", () => {
    const usernames = Array.from(
      { length: 200 },
      (_, i) => syntheticIdentity(i + 1).username,
    );

    expect(new Set(usernames).size).toBe(usernames.length);
  });

  it("produces handle-shaped usernames", () => {
    for (let n = 1; n <= SYNTHETIC_NAMES.length; n++) {
      expect(syntheticIdentity(n).username).toMatch(/^[a-z0-9._]+_\d+$/);
    }
  });

  it("falls back to a placeholder handle when the name has no ascii", () => {
    const rtl = SYNTHETIC_NAMES.indexOf("مرحبا بالعالم");
    expect(rtl).toBeGreaterThanOrEqual(0);

    expect(syntheticIdentity(rtl + 1).username).toMatch(/^spieler_\d+$/);
  });

  it("leaves every fourth user without an avatar", () => {
    expect(syntheticIdentity(4).avatarUrl).toBeNull();
    expect(syntheticIdentity(8).avatarUrl).toBeNull();
    expect(syntheticIdentity(1).avatarUrl).toMatch(
      /^https:\/\/cdn\.discordapp/,
    );
  });

  it("is deterministic", () => {
    expect(syntheticIdentity(7)).toEqual(syntheticIdentity(7));
  });
});

// The point of the fixtures: anonymised data must still break the layouts
// that real data breaks.
describe("SYNTHETIC_NAMES", () => {
  it("keeps the properties that break UIs", () => {
    const all = SYNTHETIC_NAMES.join(" ");

    expect(all).toMatch(/[äöüßÄÖÜ]/); // umlauts
    expect(all).toMatch(/\p{Extended_Pictographic}/u); // emoji
    expect(all).toMatch(/@everyone|<@\d+>/); // mention-like
    expect(all).toMatch(/[֐-ࣿ]/); // right-to-left
    expect(SYNTHETIC_NAMES.some((n) => n.length > 40)).toBe(true); // truncation
    expect(SYNTHETIC_NAMES.some((n) => n.length <= 3)).toBe(true); // very short
  });
});

describe("buildScrubSql", () => {
  it("covers every table holding personal data", () => {
    const sql = buildScrubSql([]).join("\n");

    expect(sql).toContain(`"public"."profiles"`);
    expect(sql).toContain("auth.users");
    expect(sql).toContain("auth.identities");
    expect(sql).toContain(`"public"."registrations"`);
    expect(sql).toContain(`"public"."disputes"`);
  });

  it("escapes quotes in the fixture names", () => {
    const [mapping] = buildScrubSql([]);

    expect(SYNTHETIC_NAMES.some((n) => n.includes("'"))).toBe(true);
    expect(mapping).toContain("O''Brien");
  });

  it("embeds the allow-list so listed testers keep their identity", () => {
    const [mapping] = buildScrubSql(["123456789012345678"]);

    expect(mapping).toContain("'123456789012345678'");
    expect(mapping).toContain("identity_data->>'provider_id' = any(");
  });

  it("scrubs everyone when the allow-list is empty", () => {
    const [mapping] = buildScrubSql([]);

    expect(mapping).toContain("array[]::text[]");
  });

  it("rejects allow-list entries that are not snowflakes", () => {
    expect(() => buildScrubSql(["not-an-id"])).toThrow(/Invalid Discord id/);
    expect(() => buildScrubSql(["1'; drop table users; --"])).toThrow(
      /Invalid Discord id/,
    );
  });

  // Directly identifying, unlike `origin`, which is a low-cardinality category.
  it("scrubs the social handles", () => {
    const sql = buildScrubSql([]).join("\n");

    expect(sql).toContain("twitter_handle =");
    expect(sql).toContain("bluesky_handle =");
    expect(sql).toContain("'.bsky.social'");
  });

  it("replaces social handles rather than deleting them, so the UI still renders links", () => {
    const sql = buildScrubSql([]).join("\n");

    expect(sql).toContain("when p.twitter_handle is null then null else");
    expect(sql).toContain("when p.bluesky_handle is null then null");
  });

  it("leaves origin alone — a category, not personal data", () => {
    expect(buildScrubSql([]).join("\n")).not.toContain("origin =");
  });

  it("preserves null-ness of the optional free-text columns", () => {
    const sql = buildScrubSql([]).join("\n");

    expect(sql).toContain("when r.prev_name is null then null");
    expect(sql).toContain("when r.greatest_achievements is null then null");
    expect(sql).toContain("when d.note is null then null");
  });

  it("drops its temporary table so a rerun in the same session is clean", () => {
    const sql = buildScrubSql([]);

    expect(sql[0]).toContain("create temporary table _scrub_identities");
    expect(sql[sql.length - 1]).toBe("drop table _scrub_identities;");
  });
});
