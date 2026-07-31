# Feedback: Screenshots anhängen

**Status: done** (2026-07-30) — `attachments.ts` + `components/compress.ts`,
multipart in `createForumThread`, `attachment_count` on the row, paste/drop/
picker in the dialog, gallery specimens. Verified by unit and integration
tests, by screenshot at 640px and 358px, and by driving the real server action
from a browser to confirm `File` arguments survive the boundary (see below).

Screenshots at submit time, attached to the Discord forum post. No Supabase
Storage.

## Why this is needed at all

`feedback.md` says screenshots "happen in the thread". That assumed the
reporter can reach the thread — and the forum lives on the **staff server**,
which is where it stays. A player cannot open that thread, so today there is
no path for a reporter to attach a screenshot. This slice is what makes the
staff-server arrangement actually workable.

Because the reporter never sees the thread, the app has to do two things the
original design left to Discord: accept the image, and tell the reporter what
happened to it.

## Scope

**In:**
- **Three ways to add an image**, all landing in the same list: paste
  (`Strg+V` anywhere in the dialog — the screenshot flow), drag & drop onto
  the dialog, and a file picker button (the only workable route on mobile,
  where `accept="image/*"` opens the photo library / camera).
- **Client-side downscale** before upload: longest edge to 1600px, re-encoded
  as WebP. A phone screenshot drops from megabytes to a few hundred KB, which
  is the difference between an instant submit and a stalled one on mobile data.
  GIFs are passed through untouched — canvas re-encoding would kill the
  animation, which is usually the whole point of the recording.
- **Up to 3 images, 6 MiB total** after compression.
- **Attached to the forum post** in the same `POST /channels/{id}/threads`
  call, as `multipart/form-data`. Nothing is stored by us.
- **Honest reporting back**: the success state states how many screenshots
  were attached, or says plainly that they could not be attached — the
  reporter cannot check for themselves.
- **`attachment_count` on the row**, so a report whose thread creation failed
  is diagnosable: staff can see it *had* screenshots that are now lost.

**Out:**
- Storing images anywhere on our side (no Supabase Storage bucket, no bytes in
  Postgres). If Discord rejects the post, the text survives and the images do
  not — see the tradeoff below.
- Videos, PDFs, arbitrary files. Images only.
- Image annotation / cropping in the browser.

## The tradeoff, stated plainly

The row is the durable record, but an image cannot live in it. So the
guarantee is asymmetric: **a failed Discord call keeps the report and loses
the screenshots.** Accepting that is what keeps Supabase Storage out of the
stack. `attachment_count` makes the loss visible rather than silent, and the
success state tells the reporter so they can follow up.

## Transport: one server action, raised body limit

Images ride along in the existing `submitFeedback` call as `File` objects.
Next caps Server Action bodies at **1 MB** by default, which one screenshot
exceeds, so `next.config.ts` sets
`experimental.serverActions.bodySizeLimit: "12mb"` (verified as the option's
location in Next 16).

The alternative — a Route Handler for the upload, then the action — was
rejected: it splits one atomic submit into two calls with nowhere to keep the
bytes in between, and Cloud Run scales to zero, so there is no dependable
local scratch space between requests.

## Data

One column on `feedback_reports`:

```
attachment_count integer not null default 0
```

Migration `feedback_attachments` (generated). No custom migration — no new
FK, and the table's RLS already covers it.

## Pure logic — `src/features/feedback/attachments.ts` (unit-tested)

- `ALLOWED_IMAGE_TYPES`, `MAX_ATTACHMENTS` (3), `MAX_TOTAL_BYTES` (6 MiB),
  `MAX_IMAGE_EDGE` (1600).
- `sniffImageType(bytes)` → mime | null, from magic bytes (PNG, JPEG, GIF,
  WebP). **The server trusts this, not the declared `type`** — a client can
  claim anything, and this forum is read by staff, so a renamed executable
  must not reach it.
- `validateAttachments(files)` → `{ ok } | { ok: false, error }` — count, total
  size, and per-file type.
- `attachmentFileName(index, mime)` → `screenshot-1.webp`. Names are generated,
  never taken from the client, so nothing user-controlled reaches the
  multipart headers.
- `scaleToFit(width, height, maxEdge)` → `{ width, height }` — the compression
  target, kept pure so the arithmetic is testable without a canvas.

Client-side compression itself (`components/compress.ts`) is imperative canvas
work and deliberately thin: it calls `scaleToFit` and encodes.

## Discord client

`createForumThread` gains `files?: { name, contentType, bytes }[]`. With files
present it sends `multipart/form-data` (`payload_json` + `files[n]`) instead of
JSON; without them the current JSON path is unchanged.

## Views

`<FeedbackPanel>` gains an attachment row above the action bar: thumbnails
(object URLs, revoked on removal) with a remove button, a "Screenshot
hinzufügen" outline button, and a hint naming the paste shortcut. Drag-over
gets a dashed brand-orange outline on the dialog. Client-side validation
errors appear in the same error slot as the rest of the form.

## Tests

- **Unit**: `sniffImageType` (each format's magic bytes, a truncated buffer, a
  disguised non-image); `validateAttachments` (count, total-size and type
  boundaries); `scaleToFit` (landscape, portrait, square, already-small —
  never upscales); `attachmentFileName` per mime.
- **Integration** (`actions.integration.test.ts`): images reach
  `createForumThread` with generated names; `attachment_count` recorded; a
  disguised non-image is rejected before the Discord call; the report still
  stores when a post carrying images fails.
- **Manual**: paste a screenshot on desktop; pick one on mobile; drop a file;
  remove a thumbnail; submit 3 images and confirm the thread carries them.
- **Transport, verified once against the running app**: passing `File`
  objects as a Server Action argument is the one assumption that unit tests
  cannot cover, and it fails silently if wrong. A signed-in browser called
  `submitFeedback` with a real PNG and got back `attachmentCount: 1`, with the
  row recording it — so the bytes crossed the boundary and passed the
  magic-byte check. Worth redoing by hand if the Next version changes.

## Delivery

One commit on `dev`, promoted via PR as usual.
