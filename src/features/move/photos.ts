// Parses `gcloud storage ls -l -r gs://<bucket>/**` into path → size, for
// the photo check of the switch. Lines look like
//   "    113238  2026-10-21T03:02:25Z  gs://bucket/<userId>/<uuid>.webp";
// directory headers and the TOTAL line are skipped.
export function parseStorageListing(
  text: string,
  bucket: string,
): Map<string, number> {
  const prefix = `gs://${bucket}/`;
  const sizes = new Map<string, number>();
  for (const line of text.split("\n")) {
    const [, size, url] =
      line.trim().match(/^(\d+)\s+\S+\s+(gs:\/\/\S+)$/) ?? [];
    if (!url?.startsWith(prefix) || url.endsWith("/")) {
      continue;
    }
    sizes.set(url.slice(prefix.length), Number(size));
  }
  return sizes;
}
