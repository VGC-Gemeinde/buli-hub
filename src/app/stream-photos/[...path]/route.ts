import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import { mayViewStreamPhoto } from "@/features/stream-photos/access";
import { streamPhotoContentType } from "@/features/stream-photos/photo";
import { readStreamPhoto } from "@/features/stream-photos/storage";

// The private bucket's only door (specs/004-google-cloud-migration, FR-015):
// the stream with a signed address, the player and staff with their session.
// Everyone else, and every photo that does not exist, gets the same 404.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const path = (await params).path.join("/");
  const signature = new URL(request.url).searchParams.get("sig");
  // The session is only looked up when there is no valid signature to go on.
  const viewer = signature ? null : await currentUser();

  const allowed = mayViewStreamPhoto({
    path,
    signature,
    secret: process.env.STREAM_API_SECRET,
    viewer: viewer
      ? { userId: viewer.userId, isStaff: roleAtLeast(viewer.role, "staff") }
      : null,
  });
  const bytes = allowed ? await readStreamPhoto(path) : null;
  if (!bytes) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(bytes, {
    headers: {
      "Content-Type": streamPhotoContentType(path),
      // A path never changes its picture (a new upload is a new path), so
      // the browser may keep it; `private` keeps shared caches out.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
