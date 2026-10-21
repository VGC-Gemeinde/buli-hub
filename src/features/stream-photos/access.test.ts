import { describe, expect, it } from "vitest";
import {
  mayViewStreamPhoto,
  signedStreamPhotoUrl,
  signStreamPhotoPath,
  verifyStreamPhotoSignature,
} from "./access";

const OWNER = "0b6f3c3a-3f4e-4c55-9d1e-2a3b4c5d6e7f";
const OTHER = "1c7a4d4b-4a5f-4d66-8e2f-3b4c5d6e7f80";
const PATH = `${OWNER}/9f8e7d6c-5b4a-4321-8fed-cba987654321.webp`;
const SECRET = "stream-secret";

describe("signStreamPhotoPath / verifyStreamPhotoSignature", () => {
  it("accepts its own signature for the same path and secret", () => {
    const sig = signStreamPhotoPath(PATH, SECRET);
    expect(sig).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(verifyStreamPhotoSignature(PATH, sig, SECRET)).toBe(true);
  });

  it("refuses another path, another secret, a missing or mangled signature", () => {
    const sig = signStreamPhotoPath(PATH, SECRET);
    const other = PATH.replace(".webp", ".png");
    expect(verifyStreamPhotoSignature(other, sig, SECRET)).toBe(false);
    expect(verifyStreamPhotoSignature(PATH, sig, "rotated")).toBe(false);
    expect(verifyStreamPhotoSignature(PATH, null, SECRET)).toBe(false);
    expect(verifyStreamPhotoSignature(PATH, `${sig}x`, SECRET)).toBe(false);
    expect(verifyStreamPhotoSignature(PATH, sig, undefined)).toBe(false);
  });
});

describe("signedStreamPhotoUrl", () => {
  it("is absolute and carries the signature", () => {
    expect(
      signedStreamPhotoUrl(PATH, {
        APP_BASE_URL: "https://buli.vgcgemein.de/",
        STREAM_API_SECRET: SECRET,
      }),
    ).toBe(
      `https://buli.vgcgemein.de/stream-photos/${PATH}?sig=${signStreamPhotoPath(PATH, SECRET)}`,
    );
  });

  it("is null without a path, a base URL or a secret", () => {
    const env = { APP_BASE_URL: "https://x", STREAM_API_SECRET: SECRET };
    expect(signedStreamPhotoUrl(null, env)).toBeNull();
    expect(signedStreamPhotoUrl(PATH, { ...env, APP_BASE_URL: "" })).toBeNull();
    expect(
      signedStreamPhotoUrl(PATH, { ...env, STREAM_API_SECRET: undefined }),
    ).toBeNull();
  });
});

describe("mayViewStreamPhoto", () => {
  const base = { path: PATH, signature: null, secret: SECRET };

  it("lets the stream in with a valid signature, signed in or not", () => {
    expect(
      mayViewStreamPhoto({
        ...base,
        signature: signStreamPhotoPath(PATH, SECRET),
        viewer: null,
      }),
    ).toBe(true);
  });

  it("lets the owner and staff in through the session", () => {
    expect(
      mayViewStreamPhoto({
        ...base,
        viewer: { userId: OWNER, isStaff: false },
      }),
    ).toBe(true);
    expect(
      mayViewStreamPhoto({
        ...base,
        viewer: { userId: OTHER, isStaff: true },
      }),
    ).toBe(true);
  });

  it("keeps everyone else out", () => {
    expect(mayViewStreamPhoto({ ...base, viewer: null })).toBe(false);
    expect(
      mayViewStreamPhoto({
        ...base,
        viewer: { userId: OTHER, isStaff: false },
      }),
    ).toBe(false);
    expect(
      mayViewStreamPhoto({
        ...base,
        signature: signStreamPhotoPath(PATH, "wrong"),
        viewer: null,
      }),
    ).toBe(false);
  });

  it("never looks at a path of the wrong shape, not even for staff", () => {
    expect(
      mayViewStreamPhoto({
        ...base,
        path: "../../etc/passwd",
        viewer: { userId: OTHER, isStaff: true },
      }),
    ).toBe(false);
  });
});
