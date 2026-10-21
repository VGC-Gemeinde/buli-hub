// Cloud Storage through its JSON API with plain fetch (specs/004-google-cloud-migration,
// research.md R7): upload, download and delete are all the hub needs, so no
// client library. On Cloud Run the access token comes from the metadata server and
// the service account's role on the bucket decides what it may do. Locally
// STORAGE_API_URL points at the emulator from compose.yaml, which takes no
// token. Server only.

const GOOGLE_STORAGE_API = "https://storage.googleapis.com";
const METADATA_TOKEN_URL =
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";

export const LONG_CACHE = "public, max-age=31536000";

function apiBase(
  env: Record<string, string | undefined> = process.env,
): string {
  return (env.STORAGE_API_URL || GOOGLE_STORAGE_API).replace(/\/+$/, "");
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function authorization(): Promise<Record<string, string>> {
  if (process.env.STORAGE_API_URL) {
    return {};
  }
  // Refetch a minute before expiry; tokens live about an hour.
  if (!cachedToken || cachedToken.expiresAt - 60_000 < Date.now()) {
    const response = await fetch(METADATA_TOKEN_URL, {
      headers: { "Metadata-Flavor": "Google" },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Metadata token request failed: ${response.status}`);
    }
    const body = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };
    cachedToken = {
      value: body.access_token,
      expiresAt: Date.now() + body.expires_in * 1000,
    };
  }
  return { Authorization: `Bearer ${cachedToken.value}` };
}

/**
 * A multipart upload body: the object's metadata as JSON, then its bytes.
 * Multipart because only it can set Cache-Control in the same request
 * (uploadType=media carries no metadata).
 */
export function multipartBody(input: {
  name: string;
  contentType: string;
  cacheControl: string;
  bytes: Uint8Array;
  boundary: string;
}): Uint8Array<ArrayBuffer> {
  const metadata = JSON.stringify({
    name: input.name,
    contentType: input.contentType,
    cacheControl: input.cacheControl,
  });
  const head = new TextEncoder().encode(
    `--${input.boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${input.boundary}\r\nContent-Type: ${input.contentType}\r\n\r\n`,
  );
  const tail = new TextEncoder().encode(`\r\n--${input.boundary}--\r\n`);
  const body = new Uint8Array(
    new ArrayBuffer(head.length + input.bytes.length + tail.length),
  );
  body.set(head, 0);
  body.set(input.bytes, head.length);
  body.set(tail, head.length + input.bytes.length);
  return body;
}

export function objectUrl(
  bucket: string,
  name: string,
  base = apiBase(),
): string {
  return `${base}/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(name)}`;
}

export async function uploadObject(input: {
  bucket: string;
  name: string;
  bytes: ArrayBuffer;
  contentType: string;
}): Promise<void> {
  const boundary = `buli-hub-${crypto.randomUUID()}`;
  const response = await fetch(
    `${apiBase()}/upload/storage/v1/b/${encodeURIComponent(input.bucket)}/o?uploadType=multipart`,
    {
      method: "POST",
      headers: {
        ...(await authorization()),
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody({
        name: input.name,
        contentType: input.contentType,
        cacheControl: LONG_CACHE,
        bytes: new Uint8Array(input.bytes),
        boundary,
      }),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new Error(
      `Upload of ${input.name} failed: ${response.status} ${await response.text()}`,
    );
  }
}

export async function deleteObject(
  bucket: string,
  name: string,
): Promise<void> {
  const response = await fetch(objectUrl(bucket, name), {
    method: "DELETE",
    headers: await authorization(),
    cache: "no-store",
  });
  // Already gone counts as deleted.
  if (!response.ok && response.status !== 404) {
    throw new Error(
      `Delete of ${name} failed: ${response.status} ${await response.text()}`,
    );
  }
}

/** An object's bytes, or null when it does not exist. */
export async function downloadObject(
  bucket: string,
  name: string,
): Promise<ArrayBuffer | null> {
  const response = await fetch(`${objectUrl(bucket, name)}?alt=media`, {
    headers: await authorization(),
    cache: "no-store",
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(
      `Download of ${name} failed: ${response.status} ${await response.text()}`,
    );
  }
  return response.arrayBuffer();
}
