import { createHmac, timingSafeEqual } from "node:crypto";
import {
  isStreamPhotoPath,
  ownsStreamPhotoPath,
  STREAM_PHOTO_ROUTE,
} from "./photo";

// Server half of the stream photo access (specs/004-google-cloud-migration,
// FR-015, FR-016): the signed address for the stream and the rule the photo
// route applies. Kept out of photo.ts, which client components import.

// HMAC over the path, keyed by the stream API's secret: only the hub can make
// one, it never expires (a new photo gets a new path anyway), and rotating the
// stream secret withdraws every address handed out.
export function signStreamPhotoPath(path: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`stream-photo:${path}`)
    .digest("base64url");
}

export function verifyStreamPhotoSignature(
  path: string,
  signature: string | null,
  secret: string | undefined,
): boolean {
  if (!signature || !secret) return false;
  const expected = Buffer.from(signStreamPhotoPath(path, secret));
  const given = Buffer.from(signature);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// The address the stream API hands out: absolute, signed, loadable without a
// session. Null without a base URL or secret, so a half-configured hub sends
// no photo rather than a broken one.
export function signedStreamPhotoUrl(
  path: string | null,
  env: Record<string, string | undefined> = process.env,
): string | null {
  const baseUrl = env.APP_BASE_URL;
  const secret = env.STREAM_API_SECRET;
  if (!path || !baseUrl || !secret) {
    return null;
  }
  const base = baseUrl.replace(/\/+$/, "");
  return `${base}${STREAM_PHOTO_ROUTE}/${path}?sig=${signStreamPhotoPath(path, secret)}`;
}

// Who may see a photo: whoever holds a valid signature (the stream), the
// player it belongs to, and staff. Everyone else gets a 404, never a hint
// that the photo exists.
export function mayViewStreamPhoto(input: {
  path: string;
  signature: string | null;
  secret: string | undefined;
  viewer: { userId: string; isStaff: boolean } | null;
}): boolean {
  if (!isStreamPhotoPath(input.path)) return false;
  if (verifyStreamPhotoSignature(input.path, input.signature, input.secret)) {
    return true;
  }
  if (!input.viewer) return false;
  return (
    input.viewer.isStaff || ownsStreamPhotoPath(input.path, input.viewer.userId)
  );
}
