import { describe, expect, it } from "vitest";
import {
  disputeChange,
  disputeDecisionSchema,
  disputeNoteSchema,
} from "./dispute";
import type { StaffResultInput } from "./report";

const alice = "alice";
const bob = "bob";
const NOTE = "Replays geprüft, Spiel 2 ging an Bob.";

const reported = { outcome: "normal" as const, confirmed: true };
const pendingFreeWin = { outcome: "free_win" as const, confirmed: false };
const confirmedFreeWin = { outcome: "free_win" as const, confirmed: true };

const editReport: StaffResultInput = {
  outcome: "normal",
  platform: "showdown",
  games: [
    { winnerId: bob, replayUrl: "https://replay/1" },
    { winnerId: bob, replayUrl: "https://replay/2" },
  ],
  playerATeamUrl: "https://pokepast.es/a",
  playerBTeamUrl: "https://pokepast.es/b",
};

describe("disputeNoteSchema", () => {
  it("rejects an empty or whitespace-only explanation", () => {
    expect(disputeNoteSchema.safeParse("").success).toBe(false);
    expect(disputeNoteSchema.safeParse("   ").success).toBe(false);
    expect(disputeNoteSchema.safeParse("\n\t").success).toBe(false);
  });

  it("trims and accepts a real explanation", () => {
    const parsed = disputeNoteSchema.safeParse(`  ${NOTE}  `);
    expect(parsed.success && parsed.data).toBe(NOTE);
  });

  it("rejects an over-long explanation", () => {
    expect(disputeNoteSchema.safeParse("a".repeat(2001)).success).toBe(false);
  });
});

describe("disputeDecisionSchema", () => {
  it("accepts each decision shape", () => {
    expect(disputeDecisionSchema.safeParse({ kind: "uphold" }).success).toBe(
      true,
    );
    expect(
      disputeDecisionSchema.safeParse({ kind: "edit", report: {} }).success,
    ).toBe(true);
    expect(
      disputeDecisionSchema.safeParse({ kind: "free_win", winnerId: alice })
        .success,
    ).toBe(true);
    expect(
      disputeDecisionSchema.safeParse({ kind: "double_loss" }).success,
    ).toBe(true);
    expect(disputeDecisionSchema.safeParse({ kind: "reset" }).success).toBe(
      true,
    );
  });

  it("rejects an unknown decision and a free win without a winner", () => {
    expect(disputeDecisionSchema.safeParse({ kind: "nope" }).success).toBe(
      false,
    );
    expect(
      disputeDecisionSchema.safeParse({ kind: "free_win", winnerId: "" })
        .success,
    ).toBe(false);
  });
});

describe("disputeChange", () => {
  it("upholding a normal result changes nothing", () => {
    expect(disputeChange({ kind: "uphold" }, reported, NOTE)).toEqual({
      resolution: "upheld",
      change: { kind: "keep" },
    });
  });

  it("upholding a pending free win confirms it", () => {
    expect(disputeChange({ kind: "uphold" }, pendingFreeWin, NOTE)).toEqual({
      resolution: "upheld",
      change: { kind: "confirm" },
    });
  });

  it("upholding an already confirmed free win changes nothing", () => {
    expect(disputeChange({ kind: "uphold" }, confirmedFreeWin, NOTE)).toEqual({
      resolution: "upheld",
      change: { kind: "keep" },
    });
  });

  it("upholding a double loss changes nothing", () => {
    expect(
      disputeChange(
        { kind: "uphold" },
        { outcome: "double_loss", confirmed: false },
        NOTE,
      ),
    ).toEqual({ resolution: "upheld", change: { kind: "keep" } });
  });

  it("an edit is corrected and replaces the result with the new rows", () => {
    const { resolution, change } = disputeChange(
      { kind: "edit", report: editReport },
      reported,
      NOTE,
    );
    expect(resolution).toBe("corrected");
    expect(change.kind).toBe("replace");
    if (change.kind !== "replace") return;
    expect(change.result.outcome).toBe("normal");
    expect(change.result.winnerId).toBe(bob);
    expect(change.games).toEqual([
      { gameNumber: 1, winnerId: bob, replayUrl: "https://replay/1" },
      { gameNumber: 2, winnerId: bob, replayUrl: "https://replay/2" },
    ]);
  });

  it("a free win is corrected, keeps no games and takes the note as its reason", () => {
    const { resolution, change } = disputeChange(
      { kind: "free_win", winnerId: alice },
      reported,
      NOTE,
    );
    expect(resolution).toBe("corrected");
    expect(change).toEqual({
      kind: "replace",
      result: {
        outcome: "free_win",
        winnerId: alice,
        platform: null,
        playerATeamUrl: null,
        playerBTeamUrl: null,
        videoUrl: null,
        freeWinReason: NOTE,
        discussedWithId: null,
      },
      games: [],
    });
  });

  it("a double loss is corrected and has no winner", () => {
    const { resolution, change } = disputeChange(
      { kind: "double_loss" },
      reported,
      NOTE,
    );
    expect(resolution).toBe("corrected");
    expect(change.kind === "replace" && change.result.outcome).toBe(
      "double_loss",
    );
    expect(change.kind === "replace" && change.result.winnerId).toBeNull();
    expect(change.kind === "replace" && change.games).toEqual([]);
  });

  it("a reset is corrected and deletes the result", () => {
    expect(disputeChange({ kind: "reset" }, reported, NOTE)).toEqual({
      resolution: "corrected",
      change: { kind: "delete" },
    });
  });

  it("only upholding keeps the result: every other decision touches it", () => {
    const decisions = [
      { kind: "edit", report: editReport },
      { kind: "free_win", winnerId: alice },
      { kind: "double_loss" },
      { kind: "reset" },
    ] as const;
    for (const decision of decisions) {
      const { resolution, change } = disputeChange(decision, reported, NOTE);
      expect(resolution).toBe("corrected");
      expect(change.kind === "keep" || change.kind === "confirm").toBe(false);
    }
  });
});
