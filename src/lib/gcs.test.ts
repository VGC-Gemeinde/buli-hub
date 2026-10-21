import { describe, expect, it } from "vitest";
import { LONG_CACHE, multipartBody, objectUrl } from "./gcs";

describe("multipartBody", () => {
  it("carries the metadata as JSON, then the bytes", () => {
    const body = multipartBody({
      name: "u1/a.webp",
      contentType: "image/webp",
      cacheControl: LONG_CACHE,
      bytes: new Uint8Array([1, 2, 3]),
      boundary: "b",
    });
    const text = new TextDecoder("latin1").decode(body);
    expect(text).toBe(
      [
        "--b",
        "Content-Type: application/json; charset=UTF-8",
        "",
        '{"name":"u1/a.webp","contentType":"image/webp","cacheControl":"public, max-age=31536000"}',
        "--b",
        "Content-Type: image/webp",
        "",
        "\u0001\u0002\u0003",
        "--b--",
        "",
      ].join("\r\n"),
    );
  });
});

describe("objectUrl", () => {
  it("encodes the slash of the object name", () => {
    expect(
      objectUrl(
        "buli-hub-stream-photos",
        "u1/a.webp",
        "https://storage.googleapis.com",
      ),
    ).toBe(
      "https://storage.googleapis.com/storage/v1/b/buli-hub-stream-photos/o/u1%2Fa.webp",
    );
  });
});
