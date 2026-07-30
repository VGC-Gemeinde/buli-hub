import { and, count, eq, gte } from "drizzle-orm";
import { feedbackReports } from "@/db/schema";
import type { Role } from "@/features/roles/roles";
import { db } from "@/lib/db";
import type { FeedbackKind } from "./feedback";

// Persistence for the feedback intake. There is deliberately no read query
// for reports: Discord is the tracker, and a list view here would be a second
// source of truth.

export type NewFeedbackReport = {
  kind: FeedbackKind;
  title: string;
  body: string;
  path: string;
  userAgent: string;
  buildSha: string | null;
  windowId: string | null;
  round: number | null;
  reporterId: string;
  reporterRole: Role;
  attachmentCount: number;
};

export async function insertFeedback(
  report: NewFeedbackReport,
): Promise<string> {
  const [row] = await db
    .insert(feedbackReports)
    .values(report)
    .returning({ id: feedbackReports.id });
  return row.id;
}

// Records the forum thread the report produced. The guild comes from the
// thread Discord returned, so a forum that later moves servers does not
// invalidate the links of older reports.
export async function markPosted(
  id: string,
  thread: { threadId: string; guildId: string | null },
): Promise<void> {
  await db
    .update(feedbackReports)
    .set({
      threadId: thread.threadId,
      threadGuildId: thread.guildId,
      postedAt: new Date(),
    })
    .where(eq(feedbackReports.id, id));
}

// The rate-limit read: how many reports this user filed since `since`.
export async function recentFeedbackCount(
  reporterId: string,
  since: Date,
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(feedbackReports)
    .where(
      and(
        eq(feedbackReports.reporterId, reporterId),
        gte(feedbackReports.createdAt, since),
      ),
    );
  return row?.value ?? 0;
}
