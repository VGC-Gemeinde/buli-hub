// Pure decisions about Discord guild membership. No database, no request —
// registration gating, the season gate and the action lock all derive from the
// same tri-state here, so they can never disagree about who is blocked.
//
// The tri-state is profiles.guild_member: null = never confirmed either way,
// true/false = last confirmed state. Everything fails open on "unknown"
// (Discord env not configured, no Discord id in the JWT, API error) and closes
// only on a confirmed 404 — so local dev, outages and misconfiguration can
// never lock a player out.

/** True only when Discord confirmed via 404 that the account is not on the server. */
export function isConfirmedNonMember(guildMember: boolean | null): boolean {
  return guildMember === false;
}

/**
 * The refusal a membership-locked action returns, or null when the caller may
 * proceed. Pure, because the value already sits on CurrentUser.
 */
export function membershipBlock(
  guildMember: boolean | null,
): { ok: false; error: string } | null {
  return isConfirmedNonMember(guildMember)
    ? { ok: false, error: MEMBERSHIP_ERROR }
    : null;
}

/** The refusal a locked action returns. Shown verbatim, so it says what to do. */
export const MEMBERSHIP_ERROR = "Tritt zuerst unserem Discord-Server bei.";

/** Recheck ran and Discord still answered 404. */
export const STILL_NOT_MEMBER =
  "Wir konnten dich noch nicht auf dem Server finden. Der Beitritt kann einen Moment dauern. Versuch es gleich nochmal.";

/** Recheck could not run (no config, no Discord-Id, API error). */
export const RECHECK_FAILED =
  "Die Prüfung ist gerade nicht möglich. Versuch es später erneut.";

/** One registered player's membership state, as the staff overview needs it. */
export type RosterMembership = {
  userId: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  guildMember: boolean | null;
  guildMemberCheckedAt: Date | null;
};

/**
 * Splits a registered roster into the staff overview's buckets. Confirmed
 * non-members and never-checked players are listed separately: "not on the
 * server" is a fact, "never checked" is only an admission. oldestCheckedAt is
 * the honest roster-wide stamp — everyone confirmed was checked at least since
 * then; players never checked do not water it down because they are visibly
 * their own bucket.
 */
export function bucketMembership(rows: readonly RosterMembership[]): {
  nonMembers: RosterMembership[];
  unchecked: RosterMembership[];
  allConfirmed: boolean;
  oldestCheckedAt: Date | null;
} {
  const nonMembers = rows.filter((row) => row.guildMember === false);
  const unchecked = rows.filter((row) => row.guildMember === null);
  let oldestCheckedAt: Date | null = null;
  for (const row of rows) {
    if (row.guildMemberCheckedAt === null) {
      continue;
    }
    if (
      oldestCheckedAt === null ||
      row.guildMemberCheckedAt < oldestCheckedAt
    ) {
      oldestCheckedAt = row.guildMemberCheckedAt;
    }
  }
  return {
    nonMembers,
    unchecked,
    allConfirmed: nonMembers.length === 0 && unchecked.length === 0,
    oldestCheckedAt,
  };
}
