import { headers } from "next/headers";
import { currentUser } from "@/features/roles/guard";
import { PATH_HEADER } from "./path-header";
import { recordPageLoad } from "./store";
import {
  clientIp,
  isBot,
  isPageLoadPath,
  visitorTokenForClient,
  visitorTokenForUser,
} from "./visitor";

/** Statistics may slow a page by at most this much, then they are dropped. */
const TIMEOUT_MS = 2000;

/**
 * Count this page load. Rendered once in the root layout inside a Suspense
 * boundary, so the shell streams out while this runs and nothing here is on
 * the critical path.
 *
 * Server-side rather than a script in the page: no extra request, nothing for
 * a content blocker to remove, no identifier in the browser. Soft navigations
 * reuse the root layout and do not re-run it, so this counts page loads (a
 * tab opened, a Discord link followed, a reload), not route changes.
 *
 * The user id, address and agent go straight into a per-period hash and are
 * never stored; see store.ts and visitor.ts for exactly what is kept.
 */
export async function CountPageLoad() {
  try {
    const h = await headers();
    const path = h.get(PATH_HEADER) ?? "";
    if (!path || !isPageLoadPath(path)) return null;
    const userAgent = h.get("user-agent") ?? "";
    if (isBot(userAgent)) return null;

    const current = await currentUser();
    const token = current
      ? visitorTokenForUser(current.userId)
      : visitorTokenForClient(clientIp(h.get("x-forwarded-for")), userAgent);

    await Promise.race([
      recordPageLoad(token),
      new Promise<void>((resolve) => setTimeout(resolve, TIMEOUT_MS).unref()),
    ]);
  } catch (error) {
    // Statistics must never be able to fail a page render.
    console.warn("[usage] page load not counted:", error);
  }
  return null;
}
