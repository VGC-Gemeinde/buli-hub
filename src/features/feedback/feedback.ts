import { z } from "zod";
import type { Role } from "@/features/roles/roles";
import { roleAtLeast, roleLabel } from "@/features/roles/roles";

// Pure logic for the feedback intake: what may be submitted, how often, and
// what the Discord forum thread looks like. No database, no fetch — the
// action wires these together.

export type FeedbackKind = "bug" | "idea";

// Discord's hard limits. The body cap is derived from the message limit: body
// plus context block must always fit, see `threadBody`.
const THREAD_NAME_MAX = 100;
const MESSAGE_MAX = 2000;

export const BODY_MAX = 1200;
export const TITLE_MAX = 100;

// How many reports one user may file per hour. The feature hands every
// signed-in user a button that creates Discord threads; without a cap the
// forum is one bored user away from unusable.
export const RATE_LIMIT_PER_HOUR = 5;
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export const feedbackInputSchema = z.object({
  kind: z.enum(["bug", "idea"]),
  title: z.string().trim().min(3, "Titel ist zu kurz").max(TITLE_MAX),
  body: z.string().trim().min(10, "Beschreibung ist zu kurz").max(BODY_MAX),
  // Client-supplied context. Never trusted, only capped — it is rendered into
  // Discord with mentions disabled, so the worst case is a junk string.
  path: z.string().trim().max(200),
  userAgent: z.string().trim().max(200),
});

export type FeedbackInput = z.infer<typeof feedbackInputSchema>;

// Bugs from anyone signed in; ideas are staff+. Used by the action's gate and
// by the dialog to decide whether the type switch appears at all.
export function canSubmit(role: Role, kind: FeedbackKind): boolean {
  return kind === "bug" || roleAtLeast(role, "staff");
}

export function kindLabel(kind: FeedbackKind): string {
  return kind === "bug" ? "Fehler" : "Idee";
}

// `[Fehler] …` / `[Idee] …`, truncated to Discord's thread-name limit on a
// word boundary where one is close enough to matter.
export function threadTitle({
  kind,
  title,
}: {
  kind: FeedbackKind;
  title: string;
}): string {
  const prefix = `[${kindLabel(kind)}] `;
  const room = THREAD_NAME_MAX - prefix.length;
  const trimmed = title.trim();
  if (trimmed.length <= room) {
    return prefix + trimmed;
  }
  const cut = trimmed.slice(0, room - 1);
  const lastSpace = cut.lastIndexOf(" ");
  // Only break on a word boundary if that does not throw away half the text.
  const stem = lastSpace > room * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${prefix + stem.trimEnd()}…`;
}

export type FeedbackContext = {
  reporterName: string;
  reporterRole: Role;
  path: string;
  userAgent: string;
  buildSha: string | null;
  round: number | null;
  seasonNumber: number | null;
};

// The thread's opening message: the reporter's description, then everything
// they would never have supplied on their own.
export function threadBody(input: { body: string } & FeedbackContext): string {
  const season =
    input.seasonNumber === null
      ? "—"
      : input.round === null
        ? `Saison ${input.seasonNumber}`
        : `Saison ${input.seasonNumber}, Spieltag ${input.round}`;

  const context = [
    `**Route:** ${input.path || "—"}`,
    `**Nutzer:** ${input.reporterName} (${roleLabel(input.reporterRole)})`,
    `**Saison:** ${season}`,
    `**Build:** ${input.buildSha ?? "lokal"}`,
    `**Browser:** ${input.userAgent || "—"}`,
  ].join("\n");

  const message = `${input.body.trim()}\n\n---\n${context}`;
  // The schema's caps make this unreachable; the slice is the guarantee that
  // an over-long context block can never cost us the report.
  return message.length <= MESSAGE_MAX
    ? message
    : `${message.slice(0, MESSAGE_MAX - 1)}…`;
}

export type RateLimitResult = { ok: true } | { ok: false; error: string };

export function submissionAllowed({
  recentCount,
  limit = RATE_LIMIT_PER_HOUR,
}: {
  recentCount: number;
  limit?: number;
}): RateLimitResult {
  if (recentCount < limit) {
    return { ok: true };
  }
  return {
    ok: false,
    error:
      "Du hast gerade sehr viele Meldungen abgeschickt. Bitte versuche es in einer Stunde erneut.",
  };
}

// The link the *reporter* gets — or null when they could not open it anyway.
// The forum may live on the staff server; a player following that link lands
// on a Discord error page, which is worse than no link. Only threads in the
// guild every user is authenticated against are linked, so this flips itself
// the day the forum moves to the main server.
export function reporterThreadUrl({
  threadId,
  threadGuildId,
  mainGuildId,
}: {
  threadId: string | null;
  threadGuildId: string | null;
  mainGuildId: string | null;
}): string | null {
  if (!threadId || !threadGuildId || !mainGuildId) {
    return null;
  }
  if (threadGuildId !== mainGuildId) {
    return null;
  }
  return `https://discord.com/channels/${threadGuildId}/${threadId}`;
}
