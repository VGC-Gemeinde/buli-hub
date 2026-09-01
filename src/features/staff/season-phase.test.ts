import { describe, expect, it } from "vitest";
import { seasonPhase } from "./season-phase";

describe("seasonPhase", () => {
  it("is not_started before a window exists", () => {
    expect(
      seasonPhase({
        registration: "not_started",
        seedingFinalized: false,
        hasSchedule: false,
        schedulePublished: false,
      }),
    ).toBe("not_started");
  });

  it("is registration_open while the window is open", () => {
    expect(
      seasonPhase({
        registration: "open",
        seedingFinalized: false,
        hasSchedule: false,
        schedulePublished: false,
      }),
    ).toBe("registration_open");
  });

  it("is registration_closed once closed but not yet finalized", () => {
    expect(
      seasonPhase({
        registration: "closed",
        seedingFinalized: false,
        hasSchedule: false,
        schedulePublished: false,
      }),
    ).toBe("registration_closed");
  });

  it("is seeded once the seeding is finalized", () => {
    expect(
      seasonPhase({
        registration: "closed",
        seedingFinalized: true,
        hasSchedule: false,
        schedulePublished: false,
      }),
    ).toBe("seeded");
  });

  it("is schedule_hidden while a schedule exists unpublished", () => {
    expect(
      seasonPhase({
        registration: "closed",
        seedingFinalized: true,
        hasSchedule: true,
        schedulePublished: false,
      }),
    ).toBe("schedule_hidden");
  });

  it("is regular_season once the schedule is published", () => {
    expect(
      seasonPhase({
        registration: "closed",
        seedingFinalized: true,
        hasSchedule: true,
        schedulePublished: true,
      }),
    ).toBe("regular_season");
  });

  it("ignores a published flag without a schedule", () => {
    expect(
      seasonPhase({
        registration: "closed",
        seedingFinalized: true,
        hasSchedule: false,
        schedulePublished: true,
      }),
    ).toBe("seeded");
  });
});
