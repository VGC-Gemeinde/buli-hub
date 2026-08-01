import { redirect } from "next/navigation";
import { devToolsEnabled } from "@/features/dev/enabled";
import {
  clearAcceptance,
  recordAcceptance,
} from "@/features/regelwerk/queries";
import { currentUser } from "@/features/roles/guard";
import { latestWindow } from "@/features/staff/queries";

// Dev-only: flips the signed-in user's Regelwerk acceptance for the current
// season. Acceptance is a one-way door in the product — once confirmed there
// is no un-confirm — so without this the reminder and gate dialogs are each
// reachable exactly once per developer per season.
//
// /dev/regelwerk?accept=0  → drop the acceptance (dialogs come back)
// /dev/regelwerk?accept=1  → accept (confirmed state, actions unlocked)
export async function GET(request: Request) {
  if (!(await devToolsEnabled())) {
    return new Response("Not found", { status: 404 });
  }

  const current = await currentUser();
  if (!current) {
    return new Response("Nicht angemeldet\n", { status: 401 });
  }
  const window = await latestWindow();
  if (!window) {
    return new Response("Keine Saison vorhanden\n", { status: 400 });
  }

  const accept = new URL(request.url).searchParams.get("accept") !== "0";
  if (accept) {
    await recordAcceptance(window.id, current.userId);
  } else {
    await clearAcceptance(window.id, current.userId);
  }

  redirect("/regelwerk");
}
