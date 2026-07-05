import { and, eq } from "drizzle-orm";
import { discordPosts } from "@/db/schema";
import { db } from "@/lib/db";

export type PostKind = "result" | "motw_vod";

export type StoredPost = { channelId: string; messageId: string };

// The Discord message currently mirroring a match (per kind), or null.
export async function getPost(
  kind: PostKind,
  matchId: string,
): Promise<StoredPost | null> {
  const row = await db.query.discordPosts.findFirst({
    columns: { channelId: true, messageId: true },
    where: and(eq(discordPosts.kind, kind), eq(discordPosts.matchId, matchId)),
  });
  return row ?? null;
}

// Records (or re-points, after a self-healing re-post) a match's message.
export async function upsertPost(input: {
  kind: PostKind;
  matchId: string;
  channelId: string;
  messageId: string;
}): Promise<void> {
  await db
    .insert(discordPosts)
    .values(input)
    .onConflictDoUpdate({
      target: [discordPosts.kind, discordPosts.matchId],
      set: {
        channelId: input.channelId,
        messageId: input.messageId,
        updatedAt: new Date(),
      },
    });
}

export async function deletePostRow(
  kind: PostKind,
  matchId: string,
): Promise<void> {
  await db
    .delete(discordPosts)
    .where(and(eq(discordPosts.kind, kind), eq(discordPosts.matchId, matchId)));
}
