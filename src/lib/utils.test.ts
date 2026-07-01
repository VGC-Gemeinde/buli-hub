import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

// Smoke test: proves the Vitest setup (config, @ alias) works end to end.
describe("cn", () => {
  it("merges class names", () => {
    expect(cn("p-2", "text-sm")).toBe("p-2 text-sm");
  });

  it("resolves Tailwind conflicts in favor of the last class", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
