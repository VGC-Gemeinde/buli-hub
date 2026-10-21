import { describe, expect, it } from "vitest";
import { parseStorageListing } from "./photos";

describe("parseStorageListing", () => {
  it("reads size and path of every object and skips the rest", () => {
    const text = [
      "gs://buli-hub-stream-photos/u1/:",
      "    113238  2026-10-21T03:02:25Z  gs://buli-hub-stream-photos/u1/a.webp",
      "",
      "   1830685  2026-10-21T03:02:25Z  gs://buli-hub-stream-photos/u2/b.png",
      "TOTAL: 2 objects, 1943923 bytes (1.85MiB)",
    ].join("\n");
    expect(parseStorageListing(text, "buli-hub-stream-photos")).toEqual(
      new Map([
        ["u1/a.webp", 113238],
        ["u2/b.png", 1830685],
      ]),
    );
  });

  it("ignores objects of another bucket", () => {
    expect(
      parseStorageListing(
        "  1  2026-10-21T03:02:25Z  gs://other/u1/a.webp",
        "buli-hub-stream-photos",
      ).size,
    ).toBe(0);
  });
});
