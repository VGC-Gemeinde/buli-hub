import { redirect } from "next/navigation";
import { generateSeedData } from "@/features/dev/seed";
import { currentUser } from "@/features/roles/guard";

// Dev-only: generates a closed window with fake registrations for testing the
// seeding tool. /dev/seed-registrations?count=100
// - &finalize=1 also builds + finalizes a seeding → ready for „Spielplan
//   erstellen".
// - &schedule=1 goes all the way to a running season (schedule + matches) and
//   registers the signed-in persona so their Spieler-Dashboard is populated.
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new Response("Not found", { status: 404 });
  }

  const params = new URL(request.url).searchParams;
  const raw = Number(params.get("count") ?? "100");
  const count = Math.min(Math.max(Number.isFinite(raw) ? raw : 100, 1), 500);
  const finalize = params.get("finalize") === "1";
  const schedule = params.get("schedule") === "1";
  const current = await currentUser();
  await generateSeedData(count, {
    finalize,
    schedule,
    includeUserId: current?.userId,
  });
  redirect(schedule ? "/spieler" : finalize ? "/staff" : "/staff/seeding");
}
