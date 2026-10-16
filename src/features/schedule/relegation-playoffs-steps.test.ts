import { describe, expect, it } from "vitest";
import { STAFF_STEPS, staffStep } from "./relegation-playoffs-steps";

describe("staffStep", () => {
  it("walks from creating the schedule to the completed season", () => {
    const step = (created: boolean, published: boolean, completed: boolean) =>
      staffStep({ created, published, completed });
    expect(step(false, false, false)).toBe(0);
    expect(step(true, false, false)).toBe(1);
    expect(step(true, true, false)).toBe(2);
    expect(step(true, true, true)).toBe(STAFF_STEPS.length);
  });
});
