import { redirect } from "next/navigation";
import { generateSeedData } from "@/features/dev/seed";

// Dev-only: generates a closed window with fake registrations for testing the
// seeding tool. /dev/seed-registrations?count=100
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new Response("Not found", { status: 404 });
  }

  const raw = Number(new URL(request.url).searchParams.get("count") ?? "100");
  const count = Math.min(Math.max(Number.isFinite(raw) ? raw : 100, 1), 500);
  await generateSeedData(count);
  redirect("/staff/seeding");
}
