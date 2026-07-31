import { describe, expect, it } from "vitest";
import type { Role } from "@/features/roles/roles";
import {
  BODY_MAX,
  canSend,
  canSubmit,
  feedbackInputSchema,
  RATE_LIMIT_PER_HOUR,
  reporterThreadUrl,
  submissionAllowed,
  TITLE_MAX,
  threadBody,
  threadTitle,
} from "./feedback";

const ROLES: Role[] = ["dev", "admin", "staff", "player"];

describe("canSubmit", () => {
  it("lets every role report a bug", () => {
    for (const role of ROLES) {
      expect(canSubmit(role, "bug")).toBe(true);
    }
  });

  it("restricts ideas to staff and above", () => {
    expect(canSubmit("dev", "idea")).toBe(true);
    expect(canSubmit("admin", "idea")).toBe(true);
    expect(canSubmit("staff", "idea")).toBe(true);
    expect(canSubmit("player", "idea")).toBe(false);
  });
});

describe("feedbackInputSchema", () => {
  const valid = {
    kind: "bug" as const,
    title: "Spieltag lädt nicht",
    body: "Die Seite bleibt weiß, sobald ich auf Spieltag 3 klicke.",
    path: "/",
    userAgent: "Mozilla/5.0",
  };

  it("accepts a well-formed report", () => {
    expect(feedbackInputSchema.safeParse(valid).success).toBe(true);
  });

  it("trims before measuring", () => {
    const parsed = feedbackInputSchema.parse({
      ...valid,
      title: "   Titel mit Rand   ",
    });
    expect(parsed.title).toBe("Titel mit Rand");
  });

  it("rejects a title that is only whitespace-padded and too short", () => {
    expect(
      feedbackInputSchema.safeParse({ ...valid, title: "  ab  " }).success,
    ).toBe(false);
  });

  it("rejects a too-short body", () => {
    expect(
      feedbackInputSchema.safeParse({ ...valid, body: "kaputt" }).success,
    ).toBe(false);
  });

  it("rejects an over-long title and body", () => {
    expect(
      feedbackInputSchema.safeParse({
        ...valid,
        title: "a".repeat(TITLE_MAX + 1),
      }).success,
    ).toBe(false);
    expect(
      feedbackInputSchema.safeParse({
        ...valid,
        body: "a".repeat(BODY_MAX + 1),
      }).success,
    ).toBe(false);
  });

  it("rejects an over-long path or user agent", () => {
    expect(
      feedbackInputSchema.safeParse({ ...valid, path: "/".repeat(201) })
        .success,
    ).toBe(false);
    expect(
      feedbackInputSchema.safeParse({ ...valid, userAgent: "u".repeat(201) })
        .success,
    ).toBe(false);
  });

  it("rejects an unknown kind", () => {
    expect(
      feedbackInputSchema.safeParse({ ...valid, kind: "praise" }).success,
    ).toBe(false);
  });
});

describe("canSend", () => {
  const ok = { title: "Titel", body: "Zehn Zeichen mindestens." };

  it("accepts a filled-in form", () => {
    expect(canSend(ok)).toBe(true);
  });

  it("matches the schema's thresholds at the boundaries", () => {
    expect(canSend({ ...ok, title: "abc" })).toBe(true);
    expect(canSend({ ...ok, title: "ab" })).toBe(false);
    expect(canSend({ ...ok, body: "a".repeat(10) })).toBe(true);
    expect(canSend({ ...ok, body: "a".repeat(9) })).toBe(false);
    expect(canSend({ ...ok, title: "a".repeat(TITLE_MAX) })).toBe(true);
    expect(canSend({ ...ok, title: "a".repeat(TITLE_MAX + 1) })).toBe(false);
    expect(canSend({ ...ok, body: "a".repeat(BODY_MAX) })).toBe(true);
    expect(canSend({ ...ok, body: "a".repeat(BODY_MAX + 1) })).toBe(false);
  });

  it("does not count whitespace as content", () => {
    expect(canSend({ title: "   ", body: "   " })).toBe(false);
    expect(canSend({ ...ok, body: `${" ".repeat(40)}kurz` })).toBe(false);
  });
});

describe("threadTitle", () => {
  it("prefixes the kind", () => {
    expect(threadTitle({ kind: "bug", title: "Kaputt" })).toBe(
      "[Fehler] Kaputt",
    );
    expect(threadTitle({ kind: "idea", title: "Dark Mode" })).toBe(
      "[Idee] Dark Mode",
    );
  });

  it("never exceeds Discord's 100-character thread name limit", () => {
    const title = threadTitle({ kind: "bug", title: "a".repeat(TITLE_MAX) });
    expect(title.length).toBeLessThanOrEqual(100);
  });

  it("breaks on a word boundary when one is close to the limit", () => {
    const words = `${"wort ".repeat(30)}ende`;
    const title = threadTitle({ kind: "idea", title: words });
    expect(title.endsWith("…")).toBe(true);
    expect(title).not.toContain("wor…");
    expect(title.length).toBeLessThanOrEqual(100);
  });

  it("hard-cuts a single long word rather than losing most of it", () => {
    const title = threadTitle({ kind: "bug", title: `kurz ${"x".repeat(95)}` });
    expect(title.length).toBeLessThanOrEqual(100);
    expect(title).toContain("x");
  });
});

describe("threadBody", () => {
  const context = {
    body: "Der Button tut nichts.",
    reporterName: "Alex",
    reporterRole: "player" as Role,
    path: "/match/abc",
    userAgent: "Mozilla/5.0",
    buildSha: "abc1234",
    round: 3,
    seasonNumber: 2,
  };

  it("renders description and context block", () => {
    const message = threadBody(context);
    expect(message).toContain("Der Button tut nichts.");
    expect(message).toContain("**Route:** /match/abc");
    expect(message).toContain("**Nutzer:** Alex (Spieler)");
    expect(message).toContain("**Saison:** Saison 2, Spieltag 3");
    expect(message).toContain("**Build:** abc1234");
    expect(message).toContain("**Browser:** Mozilla/5.0");
  });

  it("falls back to „lokal“ without a build sha", () => {
    expect(threadBody({ ...context, buildSha: null })).toContain(
      "**Build:** lokal",
    );
  });

  it("omits the Spieltag when there is no current round", () => {
    expect(threadBody({ ...context, round: null })).toContain(
      "**Saison:** Saison 2\n",
    );
  });

  it("renders a dash when no season is running", () => {
    expect(
      threadBody({ ...context, seasonNumber: null, round: null }),
    ).toContain("**Saison:** —");
  });

  it("stays within Discord's message limit at maximum input", () => {
    const message = threadBody({
      ...context,
      body: "a".repeat(BODY_MAX),
      reporterName: "n".repeat(100),
      path: "/".repeat(200),
      userAgent: "u".repeat(200),
    });
    expect(message.length).toBeLessThanOrEqual(2000);
  });
});

describe("submissionAllowed", () => {
  it("allows submissions below the limit", () => {
    expect(submissionAllowed({ recentCount: 0 }).ok).toBe(true);
    expect(submissionAllowed({ recentCount: RATE_LIMIT_PER_HOUR - 1 }).ok).toBe(
      true,
    );
  });

  it("blocks at and above the limit", () => {
    expect(submissionAllowed({ recentCount: RATE_LIMIT_PER_HOUR }).ok).toBe(
      false,
    );
    expect(submissionAllowed({ recentCount: RATE_LIMIT_PER_HOUR + 9 }).ok).toBe(
      false,
    );
  });
});

describe("reporterThreadUrl", () => {
  it("links a thread in the main guild", () => {
    expect(
      reporterThreadUrl({
        threadId: "555",
        threadGuildId: "111",
        mainGuildId: "111",
      }),
    ).toBe("https://discord.com/channels/111/555");
  });

  it("returns null for a thread on another server the reporter cannot open", () => {
    expect(
      reporterThreadUrl({
        threadId: "555",
        threadGuildId: "999",
        mainGuildId: "111",
      }),
    ).toBeNull();
  });

  it("returns null when anything is missing", () => {
    expect(
      reporterThreadUrl({
        threadId: null,
        threadGuildId: "111",
        mainGuildId: "111",
      }),
    ).toBeNull();
    expect(
      reporterThreadUrl({
        threadId: "555",
        threadGuildId: null,
        mainGuildId: "111",
      }),
    ).toBeNull();
    expect(
      reporterThreadUrl({
        threadId: "555",
        threadGuildId: "111",
        mainGuildId: null,
      }),
    ).toBeNull();
  });
});
