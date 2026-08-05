// Screenshot attachments for a feedback report. Pure logic only — the client
// compresses and the action uploads; nothing here touches a canvas or a fetch.
//
// The reporter cannot open the staff-server thread, so the app is the only
// place an image can be handed over. That makes validation ours to do
// properly: staff read this forum, and a client can claim any content type.

export const MAX_ATTACHMENTS = 3;
// Discord's per-message limit is 10 MiB on an unboosted server; stay clear of
// it so a report is never rejected after the reporter already typed it.
export const MAX_TOTAL_BYTES = 6 * 1024 * 1024;
// Longest edge after client-side downscaling. Plenty to read a UI bug in.
export const MAX_IMAGE_EDGE = 1600;

export const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export function isAllowedImageType(type: string): type is AllowedImageType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type);
}

const EXTENSIONS: Record<AllowedImageType, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  if (bytes.length < signature.length) {
    return false;
  }
  return signature.every((byte, index) => bytes[index] === byte);
}

/**
 * Identifies an image from its magic bytes, or null if it is not one of the
 * allowed formats. The server trusts this over the client-declared type: the
 * declared type is just a string the browser sent, and this forum is read by
 * staff — a renamed executable must not reach it.
 */
export function sniffImageType(bytes: Uint8Array): AllowedImageType | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }
  // "GIF87a" / "GIF89a"
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) {
    return "image/gif";
  }
  // "RIFF" .... "WEBP" — the size field sits between the two markers.
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes.length >= 12 &&
    startsWith(bytes.subarray(8), [0x57, 0x45, 0x42, 0x50])
  ) {
    return "image/webp";
  }
  return null;
}

export type AttachmentCandidate = { size: number; type: string };

export type AttachmentValidation = { ok: true } | { ok: false; error: string };

function formatMib(bytes: number): string {
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}

// Count, total size and per-file type. Used by the dialog for immediate
// feedback and again by the action as the actual gate.
export function validateAttachments(
  files: readonly AttachmentCandidate[],
): AttachmentValidation {
  if (files.length > MAX_ATTACHMENTS) {
    return {
      ok: false,
      error: `Maximal ${MAX_ATTACHMENTS} Bilder pro Meldung.`,
    };
  }
  for (const file of files) {
    if (!isAllowedImageType(file.type)) {
      return {
        ok: false,
        error: "Nur Bilder (PNG, JPEG, WebP oder GIF) können angehängt werden.",
      };
    }
  }
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > MAX_TOTAL_BYTES) {
    return {
      ok: false,
      error: `Die Bilder sind zusammen zu groß (${formatMib(total)}). Maximal ${formatMib(MAX_TOTAL_BYTES)}.`,
    };
  }
  return { ok: true };
}

// Names are generated, never taken from the client — nothing user-controlled
// belongs in a multipart header.
export function attachmentFileName(
  index: number,
  type: AllowedImageType,
): string {
  return `screenshot-${index + 1}.${EXTENSIONS[type]}`;
}

/**
 * The compression target: shrink so the longest edge fits `maxEdge`, keeping
 * the aspect ratio. Never upscales — a small screenshot is left alone.
 */
export function scaleToFit(
  width: number,
  height: number,
  maxEdge: number = MAX_IMAGE_EDGE,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge || longest === 0) {
    return { width, height };
  }
  const factor = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * factor)),
    height: Math.max(1, Math.round(height * factor)),
  };
}

// What the success state tells the reporter. They cannot open the thread, so
// the app is the only place that can confirm the screenshots arrived.
export function attachmentOutcome(
  count: number,
  posted: boolean,
): string | null {
  if (count === 0) {
    return null;
  }
  const noun = count === 1 ? "Screenshot" : "Screenshots";
  return posted
    ? `${count} ${noun} angehängt.`
    : `${count} ${noun} konnten nicht angehängt werden. Bitte halte sie bereit, falls jemand nachfragt.`;
}
