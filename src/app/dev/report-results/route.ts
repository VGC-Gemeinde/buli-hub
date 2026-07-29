import { devToolsEnabled } from "@/features/dev/enabled";
import { reportDevResults } from "@/features/dev/seed";

// Dev-only: reports up to `count` (default 5, max 20) open matches of the
// latest season like real player reports, including the Discord result-post
// sync — the manual test path for the results channel.
// /dev/report-results?count=5
export async function GET(request: Request) {
  if (!(await devToolsEnabled())) {
    return new Response("Not found", { status: 404 });
  }

  const raw = Number(new URL(request.url).searchParams.get("count") ?? "5");
  const count = Math.min(Math.max(Number.isFinite(raw) ? raw : 5, 1), 20);
  const reported = await reportDevResults(count);

  const discord = process.env.DISCORD_RESULTS_CHANNEL_ID
    ? "Discord-Sync ausgeführt."
    : "Discord-Sync übersprungen (DISCORD_RESULTS_CHANNEL_ID nicht gesetzt).";
  return new Response(
    `${reported} von ${count} angeforderten Ergebnissen gemeldet. ${discord}\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}
