"use server";

import { currentUser } from "@/features/roles/guard";
import { currentMatchday } from "@/features/season/dashboard";
import { matchdaysForWindow } from "@/features/season/queries";
import { latestWindow } from "@/features/staff/queries";
import { createForumThread } from "@/lib/discord";
import { germanToday } from "@/lib/german-time";
import {
  canSubmit,
  feedbackInputSchema,
  RATE_LIMIT_WINDOW_MS,
  reporterThreadUrl,
  submissionAllowed,
  threadBody,
  threadTitle,
} from "./feedback";
import { insertFeedback, markPosted, recentFeedbackCount } from "./queries";

export type FeedbackActionResult =
  | { ok: true; threadUrl: string | null }
  | { ok: false; error: string };

// Unset → no thread is created and the row is all there is (local dev stays
// silent, like DISCORD_RESULTS_CHANNEL_ID). The forum may sit in any guild
// the bot belongs to; no guild id is configured for it.
function forumChannel(): string | null {
  const id = process.env.DISCORD_FEEDBACK_FORUM_CHANNEL_ID;
  return id && id.length > 0 ? id : null;
}

// Optional forum tag ids. They belong to their forum, so moving the forum to
// another server means new ids here.
function tagFor(kind: "bug" | "idea"): string[] {
  const id =
    kind === "bug"
      ? process.env.DISCORD_FEEDBACK_TAG_BUG
      : process.env.DISCORD_FEEDBACK_TAG_IDEA;
  return id && id.length > 0 ? [id] : [];
}

function buildSha(): string | null {
  const sha = process.env.APP_BUILD_SHA;
  return sha && sha.length > 0 ? sha : null;
}

function mainGuildId(): string | null {
  const id = process.env.DISCORD_GUILD_ID;
  return id && id.length > 0 ? id : null;
}

// Season context the reporter never supplies: which window is live and which
// Spieltag it is in right now.
async function seasonContext(): Promise<{
  windowId: string | null;
  seasonNumber: number | null;
  round: number | null;
}> {
  const window = await latestWindow();
  if (!window) {
    return { windowId: null, seasonNumber: null, round: null };
  }
  const matchdays = await matchdaysForWindow(window.id);
  const round = currentMatchday(matchdays, germanToday())?.round ?? null;
  return {
    windowId: window.id,
    seasonNumber: window.seasonNumber,
    round,
  };
}

/**
 * Files a bug report or (staff+) a feature idea: one row, then one Discord
 * forum thread. The row is written first and is the durable record — a failed
 * Discord call costs the reporter the thread link, never the report.
 */
export async function submitFeedback(
  input: unknown,
): Promise<FeedbackActionResult> {
  const current = await currentUser();
  if (!current) {
    return { ok: false, error: "Nicht angemeldet" };
  }

  const parsed = feedbackInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Eingabe ungültig",
    };
  }
  const report = parsed.data;

  if (!canSubmit(current.role, report.kind)) {
    return { ok: false, error: "Keine Berechtigung" };
  }

  const recentCount = await recentFeedbackCount(
    current.userId,
    new Date(Date.now() - RATE_LIMIT_WINDOW_MS),
  );
  const allowed = submissionAllowed({ recentCount });
  if (!allowed.ok) {
    return allowed;
  }

  const season = await seasonContext();
  const sha = buildSha();

  const id = await insertFeedback({
    kind: report.kind,
    title: report.title,
    body: report.body,
    path: report.path,
    userAgent: report.userAgent,
    buildSha: sha,
    windowId: season.windowId,
    round: season.round,
    reporterId: current.userId,
    reporterRole: current.role,
  });

  // Everything below is best-effort: the report is already safe.
  const channelId = forumChannel();
  if (!channelId) {
    return { ok: true, threadUrl: null };
  }

  try {
    const created = await createForumThread(channelId, {
      name: threadTitle({ kind: report.kind, title: report.title }),
      content: threadBody({
        body: report.body,
        reporterName: current.displayName ?? current.username ?? "Unbekannt",
        reporterRole: current.role,
        path: report.path,
        userAgent: report.userAgent,
        buildSha: sha,
        round: season.round,
        seasonNumber: season.seasonNumber,
      }),
      appliedTags: tagFor(report.kind),
    });
    if (!created.ok) {
      console.error(`[feedback] thread creation failed (${created.status})`);
      return { ok: true, threadUrl: null };
    }
    await markPosted(id, created);
    return {
      ok: true,
      threadUrl: reporterThreadUrl({
        threadId: created.threadId,
        threadGuildId: created.guildId,
        mainGuildId: mainGuildId(),
      }),
    };
  } catch (error) {
    console.error("[feedback] thread creation failed", error);
    return { ok: true, threadUrl: null };
  }
}
