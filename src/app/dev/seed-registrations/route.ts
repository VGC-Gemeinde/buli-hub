import { redirect } from "next/navigation";
import { generateSeedData } from "@/features/dev/seed";

// Dev-only: generates a closed window with fake registrations for testing the
// seeding tool. /dev/seed-registrations?count=100
// Add &finalize=1 to also build + finalize a seeding, so the „Spielplan
// erstellen" flow can be exercised right away.
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new Response("Not found", { status: 404 });
  }

  const params = new URL(request.url).searchParams;
  const raw = Number(params.get("count") ?? "100");
  const count = Math.min(Math.max(Number.isFinite(raw) ? raw : 100, 1), 500);
  const finalize = params.get("finalize") === "1";
  await generateSeedData(count, finalize);
  redirect(finalize ? "/staff" : "/staff/seeding");
}
