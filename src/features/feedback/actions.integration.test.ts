import { randomUUID } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { feedbackReports } from "@/db/schema";
import { db } from "@/lib/db";

// The action's promise: the row is written first, so a Discord outage costs
// the reporter the thread link and never the report.

const { currentUserMock, createForumThreadMock } = vi.hoisted(() => ({
  currentUserMock: vi.fn(),
  createForumThreadMock: vi.fn(),
}));

vi.mock("@/features/roles/guard", () => ({ currentUser: currentUserMock }));
vi.mock("@/lib/discord", () => ({
  createForumThread: createForumThreadMock,
}));

const { submitFeedback } = await import("./actions");

const player = randomUUID();
const staff = randomUUID();

function signedInAs(userId: string, role: "player" | "staff") {
  currentUserMock.mockResolvedValue({
    userId,
    discordId: "1",
    role,
    displayName: "Testnutzer",
    username: "test",
    avatarUrl: null,
  });
}

const input = {
  kind: "bug" as const,
  title: "Spieltag lädt nicht",
  body: "Die Seite bleibt weiß, sobald ich auf Spieltag 3 klicke.",
  path: "/",
  userAgent: "Mozilla/5.0",
};

// Real magic bytes — the action identifies images by content, not by the
// declared type, so a fake header would be rejected.
function pngFile() {
  return new File(
    [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])],
    "shot.png",
    { type: "image/png" },
  );
}

function jpegFile() {
  return new File(
    [new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])],
    "shot.jpg",
    { type: "image/jpeg" },
  );
}

async function storedFor(userId: string) {
  return db.query.feedbackReports.findFirst({
    where: eq(feedbackReports.reporterId, userId),
    orderBy: desc(feedbackReports.createdAt),
  });
}

beforeAll(async () => {
  for (const id of [player, staff]) {
    await db.execute(sql`insert into auth.users (id) values (${id})`);
  }
  process.env.DISCORD_FEEDBACK_FORUM_CHANNEL_ID = "forum-1";
  process.env.DISCORD_GUILD_ID = "main-guild";
});

afterEach(async () => {
  vi.clearAllMocks();
  for (const id of [player, staff]) {
    await db.delete(feedbackReports).where(eq(feedbackReports.reporterId, id));
  }
});

afterAll(async () => {
  for (const id of [player, staff]) {
    await db.execute(sql`delete from auth.users where id = ${id}`);
  }
});

describe("submitFeedback", () => {
  it("stores the report and records the thread it opened", async () => {
    signedInAs(player, "player");
    createForumThreadMock.mockResolvedValue({
      ok: true,
      threadId: "thread-1",
      guildId: "main-guild",
    });

    const result = await submitFeedback(input);

    expect(result).toEqual({
      ok: true,
      threadUrl: "https://discord.com/channels/main-guild/thread-1",
      attachmentCount: 0,
      attachmentsPosted: true,
    });
    const stored = await storedFor(player);
    expect(stored?.threadId).toBe("thread-1");
    expect(stored?.reporterRole).toBe("player");
    expect(stored?.postedAt).not.toBeNull();
  });

  it("keeps the report when the forum lives on another server, but offers no link", async () => {
    signedInAs(player, "player");
    createForumThreadMock.mockResolvedValue({
      ok: true,
      threadId: "thread-2",
      guildId: "staff-guild",
    });

    const result = await submitFeedback(input);

    expect(result).toEqual({
      ok: true,
      threadUrl: null,
      attachmentCount: 0,
      attachmentsPosted: true,
    });
    const stored = await storedFor(player);
    expect(stored?.threadGuildId).toBe("staff-guild");
  });

  it("keeps the report when Discord rejects the call", async () => {
    signedInAs(player, "player");
    createForumThreadMock.mockResolvedValue({ ok: false, status: 403 });

    const result = await submitFeedback(input);

    expect(result).toEqual({
      ok: true,
      threadUrl: null,
      attachmentCount: 0,
      attachmentsPosted: false,
    });
    const stored = await storedFor(player);
    expect(stored).toBeDefined();
    expect(stored?.threadId).toBeNull();
    expect(stored?.postedAt).toBeNull();
  });

  it("keeps the report when the Discord call throws", async () => {
    signedInAs(player, "player");
    createForumThreadMock.mockRejectedValue(new Error("network down"));

    const result = await submitFeedback(input);

    expect(result).toEqual({
      ok: true,
      threadUrl: null,
      attachmentCount: 0,
      attachmentsPosted: false,
    });
    expect(await storedFor(player)).toBeDefined();
  });

  it("refuses an idea from a player, and stores nothing", async () => {
    signedInAs(player, "player");

    const result = await submitFeedback({ ...input, kind: "idea" });

    expect(result).toEqual({ ok: false, error: "Keine Berechtigung" });
    expect(createForumThreadMock).not.toHaveBeenCalled();
    expect(await storedFor(player)).toBeUndefined();
  });

  it("accepts an idea from staff", async () => {
    signedInAs(staff, "staff");
    createForumThreadMock.mockResolvedValue({
      ok: true,
      threadId: "thread-3",
      guildId: "main-guild",
    });

    const result = await submitFeedback({ ...input, kind: "idea" });

    expect(result.ok).toBe(true);
    expect((await storedFor(staff))?.kind).toBe("idea");
  });

  it("rejects an invalid input before touching the database", async () => {
    signedInAs(player, "player");

    const result = await submitFeedback({ ...input, body: "kurz" });

    expect(result.ok).toBe(false);
    expect(createForumThreadMock).not.toHaveBeenCalled();
    expect(await storedFor(player)).toBeUndefined();
  });

  it("rejects a submission when not signed in", async () => {
    currentUserMock.mockResolvedValue(null);

    expect(await submitFeedback(input)).toEqual({
      ok: false,
      error: "Nicht angemeldet",
    });
  });

  it("uploads screenshots with generated names and records the count", async () => {
    signedInAs(player, "player");
    createForumThreadMock.mockResolvedValue({
      ok: true,
      threadId: "thread-img",
      guildId: "staff-guild",
    });

    const result = await submitFeedback(input, [pngFile(), jpegFile()]);

    expect(result).toMatchObject({
      ok: true,
      attachmentCount: 2,
      attachmentsPosted: true,
    });
    expect(createForumThreadMock).toHaveBeenCalledWith(
      "forum-1",
      expect.objectContaining({
        files: [
          expect.objectContaining({
            name: "screenshot-1.png",
            contentType: "image/png",
          }),
          expect.objectContaining({
            name: "screenshot-2.jpg",
            contentType: "image/jpeg",
          }),
        ],
      }),
    );
    expect((await storedFor(player))?.attachmentCount).toBe(2);
  });

  it("reports the loss when a post carrying screenshots fails", async () => {
    signedInAs(player, "player");
    createForumThreadMock.mockResolvedValue({ ok: false, status: 403 });

    const result = await submitFeedback(input, [pngFile()]);

    expect(result).toEqual({
      ok: true,
      threadUrl: null,
      attachmentCount: 1,
      attachmentsPosted: false,
    });
    // The row keeps the count, so staff can see the report had a screenshot.
    expect((await storedFor(player))?.attachmentCount).toBe(1);
  });

  it("rejects a non-image disguised as a png, before writing anything", async () => {
    signedInAs(player, "player");
    const disguised = new File(
      [new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01])],
      "screenshot.png",
      { type: "image/png" },
    );

    const result = await submitFeedback(input, [disguised]);

    expect(result.ok).toBe(false);
    expect(createForumThreadMock).not.toHaveBeenCalled();
    expect(await storedFor(player)).toBeUndefined();
  });

  it("rejects more images than the limit, before writing anything", async () => {
    signedInAs(player, "player");

    const result = await submitFeedback(input, [
      pngFile(),
      pngFile(),
      pngFile(),
      pngFile(),
    ]);

    expect(result.ok).toBe(false);
    expect(createForumThreadMock).not.toHaveBeenCalled();
    expect(await storedFor(player)).toBeUndefined();
  });

  it("blocks the sixth report within an hour", async () => {
    signedInAs(player, "player");
    createForumThreadMock.mockResolvedValue({
      ok: true,
      threadId: "thread-n",
      guildId: "main-guild",
    });

    for (let i = 0; i < 5; i += 1) {
      expect((await submitFeedback(input)).ok).toBe(true);
    }
    const blocked = await submitFeedback(input);

    expect(blocked.ok).toBe(false);
    expect(createForumThreadMock).toHaveBeenCalledTimes(5);
  });
});
