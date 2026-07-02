import { redirect } from "next/navigation";
import { clearSeedData } from "@/features/dev/seed";

// Dev-only: removes generated test registrations, windows and fake users.
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return new Response("Not found", { status: 404 });
  }

  await clearSeedData();
  redirect("/dev");
}
