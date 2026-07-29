import { redirect } from "next/navigation";
import { devToolsEnabled } from "@/features/dev/enabled";
import { clearSeedData } from "@/features/dev/seed";

// Dev-only: removes generated test registrations, windows and fake users.
export async function GET() {
  if (!(await devToolsEnabled())) {
    return new Response("Not found", { status: 404 });
  }

  await clearSeedData();
  redirect("/dev");
}
