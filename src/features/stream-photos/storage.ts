import { deleteObject, downloadObject, uploadObject } from "@/lib/gcs";

// The bucket side of the stream photos (Cloud Storage since
// specs/004-google-cloud-migration). Server only. The bucket is private; the
// photo route reads through here after deciding who may see a photo
// (access.ts).

export type StorageResult = { ok: true } | { ok: false; error: string };

function bucket(): string | null {
  return process.env.STREAM_PHOTOS_BUCKET || null;
}

export async function uploadStreamPhoto(input: {
  path: string;
  bytes: ArrayBuffer;
  contentType: string;
}): Promise<StorageResult> {
  const name = bucket();
  if (!name) {
    return { ok: false, error: "Bild-Speicher ist nicht konfiguriert" };
  }
  try {
    // A fresh path per upload, so nothing is ever overwritten in place and
    // the year-long cache is safe.
    await uploadObject({
      bucket: name,
      name: input.path,
      bytes: input.bytes,
      contentType: input.contentType,
    });
  } catch (error) {
    console.error("[stream-photos] upload failed", error);
    return {
      ok: false,
      error: "Das Bild konnte nicht gespeichert werden. Versuch es nochmal.",
    };
  }
  return { ok: true };
}

// Best effort: the row already points somewhere else, so a leftover object
// is wasted space and nothing worse.
export async function deleteStreamPhoto(path: string): Promise<void> {
  const name = bucket();
  if (!name) {
    return;
  }
  try {
    await deleteObject(name, path);
  } catch (error) {
    console.error("[stream-photos] delete failed", error);
  }
}

/** A stored photo's bytes, or null when the bucket does not hold it. */
export async function readStreamPhoto(
  path: string,
): Promise<ArrayBuffer | null> {
  const name = bucket();
  return name ? downloadObject(name, path) : null;
}
