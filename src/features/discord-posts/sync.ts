import { droppedIdsForSubDivision } from "@/features/drops/queries";
import { motwByMatchId } from "@/features/motw/queries";
import {
  getMatchForReport,
  getMatchResult,
} from "@/features/reporting/queries";
import {
  deleteChannelMessage,
  editChannelMessage,
  postChannelMessage,
} from "@/lib/discord";
import { motwVodMessage, resultMessage, shouldPostResult } from "./messages";
import { deletePostRow, getPost, type PostKind, upsertPost } from "./queries";

// Best-effort convergence of the Discord results channel onto the hub's
// public state: one message per match and kind — posted, edited, or deleted
// so the channel always matches what the hub shows openly. Called by the
// reporting/MotW actions after their DB write; every entry point catches and
// logs, a Discord outage never fails an action. Without
// DISCORD_RESULTS_CHANNEL_ID nothing is posted at all (local dev stays
// silent); without APP_BASE_URL posts simply carry no hub link.

function configuredChannel(): string | null {
  const id = process.env.DISCORD_RESULTS_CHANNEL_ID;
  return id && id.length > 0 ? id : null;
}

function matchUrl(matchId: string): string | null {
  const base = process.env.APP_BASE_URL;
  return base && base.length > 0
    ? `${base.replace(/\/+$/, "")}/match/${matchId}`
    : null;
}

// Post, edit, or re-post (self-healing on a 404 — the message was deleted on
// Discord) so the stored message shows `content`.
async function putMessage(
  kind: PostKind,
  matchId: string,
  channelId: string,
  content: string,
): Promise<void> {
  const post = await getPost(kind, matchId);
  if (post) {
    const edited = await editChannelMessage(
      post.channelId,
      post.messageId,
      content,
    );
    if (edited.ok) {
      return;
    }
    if (edited.status !== 404) {
      console.error(
        `[discord-posts] edit failed (${edited.status}) for ${kind}/${matchId}`,
      );
      return;
    }
    // 404 → fall through to a fresh post in the configured channel.
  }
  const created = await postChannelMessage(channelId, content);
  if (!created.ok) {
    console.error(
      `[discord-posts] post failed (${created.status}) for ${kind}/${matchId}`,
    );
    return;
  }
  await upsertPost({ kind, matchId, channelId, messageId: created.messageId });
}

// Deletes the stored message (best-effort; a 404 just means it is already
// gone) and its row.
async function dropMessage(kind: PostKind, matchId: string): Promise<void> {
  const post = await getPost(kind, matchId);
  if (!post) {
    return;
  }
  const deleted = await deleteChannelMessage(post.channelId, post.messageId);
  if (!deleted.ok && deleted.status !== 404) {
    console.error(
      `[discord-posts] delete failed (${deleted.status}) for ${kind}/${matchId}`,
    );
    return;
  }
  await deletePostRow(kind, matchId);
}

// Converges the result post of a match: posted while the hub shows a public
// result (and the match is not the Match of the Week), deleted otherwise.
export async function syncResultPost(matchId: string): Promise<void> {
  try {
    const channelId = configuredChannel();
    if (!channelId) {
      return;
    }
    const match = await getMatchForReport(matchId);
    if (!match || !match.playerB) {
      return;
    }
    const [result, motw, droppedIds] = await Promise.all([
      getMatchResult(matchId),
      motwByMatchId(matchId),
      droppedIdsForSubDivision(match.subDivisionId),
    ]);

    const hasDroppedParticipant =
      droppedIds.has(match.playerA.userId) ||
      droppedIds.has(match.playerB.userId);
    if (
      !shouldPostResult({
        isMotw: motw !== null,
        hasDroppedParticipant,
        result,
      })
    ) {
      await dropMessage("result", matchId);
      return;
    }
    if (!result) {
      return; // unreachable after shouldPostResult, but keeps types narrow
    }

    const winnerName =
      result.winnerId === match.playerA.userId
        ? match.playerA.name
        : result.winnerId === match.playerB.userId
          ? match.playerB.name
          : null;
    const content = resultMessage({
      groupName: match.groupName,
      round: match.round,
      playerAName: match.playerA.name,
      playerBName: match.playerB.name,
      outcome: result.outcome,
      winnerName,
      scoreA: result.games.filter((g) => g.winnerId === match.playerA.userId)
        .length,
      scoreB: result.games.filter((g) => g.winnerId === match.playerB?.userId)
        .length,
      platform: result.platform,
      playerATeamUrl: result.playerATeamUrl,
      playerBTeamUrl: result.playerBTeamUrl,
      videoUrl: result.videoUrl,
      replayUrls: result.games
        .map((g) => g.replayUrl)
        .filter((url): url is string => url !== null && url !== undefined),
      corrected: result.correctedAt !== null,
      matchUrl: matchUrl(matchId),
    });
    await putMessage("result", matchId, channelId, content);
  } catch (error) {
    console.error("[discord-posts] syncResultPost failed", error);
  }
}

// Converges the Match-of-the-Week VOD announcement: posted while the match
// is the featured pick *and* has a YouTube link, deleted otherwise. Never
// contains the result.
export async function syncMotwVodPost(matchId: string): Promise<void> {
  try {
    const channelId = configuredChannel();
    if (!channelId) {
      return;
    }
    const match = await getMatchForReport(matchId);
    if (!match || !match.playerB) {
      return;
    }
    const selection = await motwByMatchId(matchId);

    if (!selection?.youtubeUrl) {
      await dropMessage("motw_vod", matchId);
      return;
    }
    const content = motwVodMessage({
      round: selection.round,
      playerAName: match.playerA.name,
      playerBName: match.playerB.name,
      youtubeUrl: selection.youtubeUrl,
      matchUrl: matchUrl(matchId),
    });
    await putMessage("motw_vod", matchId, channelId, content);
  } catch (error) {
    console.error("[discord-posts] syncMotwVodPost failed", error);
  }
}
