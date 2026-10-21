// Maintenance mode (specs/004-google-cloud-migration, contracts/maintenance.md).
// Switched with the Cloud Run env var MAINTENANCE=on: a new revision of the
// same image, no release. While on, nothing reaches route code except the
// legal pages, so no change can be submitted during a database move.

type Env = Record<string, string | undefined>;

export const MAINTENANCE_PAGE_PATH = "/wartung";
export const MAINTENANCE_RETRY_AFTER_SECONDS = 3600;

export function maintenanceMode(env: Env = process.env): boolean {
  return env.MAINTENANCE === "on";
}

// The imprint must stay reachable (and the privacy page with it); both are
// plain text that never touches the database in maintenance.
const REACHABLE = new Set(["/impressum", "/datenschutz", "/robots.txt"]);

/**
 * What the proxy answers for a path while maintenance is on: the request
 * passes through, gets the JSON 503 (API callers: the stream backend, Cloud
 * Scheduler), or gets the maintenance page with 503 (everyone else).
 * Static assets never reach the proxy (its matcher excludes them).
 */
export function maintenanceRoute(pathname: string): "pass" | "json" | "page" {
  if (REACHABLE.has(pathname) || pathname === MAINTENANCE_PAGE_PATH) {
    return "pass";
  }
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    return "json";
  }
  return "page";
}
