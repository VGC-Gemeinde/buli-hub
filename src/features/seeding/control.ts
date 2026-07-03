// Pure logic for the seeding control lock. Division seeding is a live staff
// meeting: one person drives while the group watches the shared screen. This
// lock keeps everyone else read-only until they explicitly take control, and a
// heartbeat lets a crashed/slept tab's lock go stale so it never bricks the
// meeting.

// How long a lock stays valid without a heartbeat. The controller's tab pings
// every CONTROL_HEARTBEAT_MS; three missed beats and the lock is free to take.
export const CONTROL_TTL_MS = 60_000;
export const CONTROL_HEARTBEAT_MS = 20_000;

export type Lock = {
  holderId: string;
  heartbeatAt: Date;
};

// From the current user's point of view:
// - free:          no lock at all — take it, no confirmation needed
// - self:          the current user holds a fresh lock — they are the controller
// - held-by-other: someone else holds a fresh lock — takeover needs confirmation
// - stale:         a lock exists but its heartbeat expired — take it freely
export type ControlState = "free" | "self" | "held-by-other" | "stale";

export function isLockFresh(
  lock: Lock,
  now: Date,
  ttlMs = CONTROL_TTL_MS,
): boolean {
  return now.getTime() - lock.heartbeatAt.getTime() < ttlMs;
}

export function deriveControlState({
  lock,
  currentUserId,
  now,
  ttlMs = CONTROL_TTL_MS,
}: {
  lock: Lock | null;
  currentUserId: string;
  now: Date;
  ttlMs?: number;
}): ControlState {
  if (!lock) {
    return "free";
  }
  if (!isLockFresh(lock, now, ttlMs)) {
    return "stale";
  }
  return lock.holderId === currentUserId ? "self" : "held-by-other";
}

// The current user may edit the seeding only while they hold a fresh lock.
export function controls(state: ControlState): boolean {
  return state === "self";
}

// Taking over a lock held by someone else needs a confirmation; free/stale
// locks are takeable without one.
export function needsTakeoverConfirmation(state: ControlState): boolean {
  return state === "held-by-other";
}
