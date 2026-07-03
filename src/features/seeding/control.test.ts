import { describe, expect, it } from "vitest";
import {
  CONTROL_TTL_MS,
  controls,
  deriveControlState,
  isLockFresh,
  needsTakeoverConfirmation,
} from "./control";

const now = new Date("2026-07-03T12:00:00Z");
const ms = (offset: number) => new Date(now.getTime() + offset);

describe("isLockFresh", () => {
  it("is fresh just inside the TTL", () => {
    expect(
      isLockFresh({ holderId: "a", heartbeatAt: ms(-CONTROL_TTL_MS + 1) }, now),
    ).toBe(true);
  });

  it("is stale exactly at the TTL boundary", () => {
    expect(
      isLockFresh({ holderId: "a", heartbeatAt: ms(-CONTROL_TTL_MS) }, now),
    ).toBe(false);
  });

  it("is stale past the TTL", () => {
    expect(
      isLockFresh({ holderId: "a", heartbeatAt: ms(-CONTROL_TTL_MS - 1) }, now),
    ).toBe(false);
  });

  it("honors a custom TTL", () => {
    const lock = { holderId: "a", heartbeatAt: ms(-5_000) };
    expect(isLockFresh(lock, now, 10_000)).toBe(true);
    expect(isLockFresh(lock, now, 4_000)).toBe(false);
  });
});

describe("deriveControlState", () => {
  it("is free with no lock", () => {
    expect(deriveControlState({ lock: null, currentUserId: "me", now })).toBe(
      "free",
    );
  });

  it("is self when the current user holds a fresh lock", () => {
    expect(
      deriveControlState({
        lock: { holderId: "me", heartbeatAt: ms(-1_000) },
        currentUserId: "me",
        now,
      }),
    ).toBe("self");
  });

  it("is held-by-other when someone else holds a fresh lock", () => {
    expect(
      deriveControlState({
        lock: { holderId: "other", heartbeatAt: ms(-1_000) },
        currentUserId: "me",
        now,
      }),
    ).toBe("held-by-other");
  });

  it("is stale when the current user's own lock expired", () => {
    expect(
      deriveControlState({
        lock: { holderId: "me", heartbeatAt: ms(-CONTROL_TTL_MS - 1) },
        currentUserId: "me",
        now,
      }),
    ).toBe("stale");
  });

  it("is stale when another user's lock expired", () => {
    expect(
      deriveControlState({
        lock: { holderId: "other", heartbeatAt: ms(-CONTROL_TTL_MS - 1) },
        currentUserId: "me",
        now,
      }),
    ).toBe("stale");
  });
});

describe("controls / needsTakeoverConfirmation", () => {
  it("only the holder controls", () => {
    expect(controls("self")).toBe(true);
    expect(controls("free")).toBe(false);
    expect(controls("held-by-other")).toBe(false);
    expect(controls("stale")).toBe(false);
  });

  it("only a fresh foreign lock needs confirmation to take over", () => {
    expect(needsTakeoverConfirmation("held-by-other")).toBe(true);
    expect(needsTakeoverConfirmation("free")).toBe(false);
    expect(needsTakeoverConfirmation("stale")).toBe(false);
    expect(needsTakeoverConfirmation("self")).toBe(false);
  });
});
