import { redirect } from "next/navigation";
import { devToolsEnabled } from "@/features/dev/enabled";
import {
  DEV_SEASON_SHAPE,
  generateEvenRunningSeason,
  generateLadderSeason,
  generateSeedData,
} from "@/features/dev/seed";
import { currentUser } from "@/features/roles/guard";

// Dev-only: generates a closed window with fake registrations for testing the
// seeding tool. /dev/seed-registrations?count=100
// - &grouped=1 places everyone and generates all groups but leaves the
//   post-season rules unset → the „Auf- & Abstieg" step is what's missing.
// - &finalize=1 also builds + finalizes a seeding → ready for „Spielplan
//   erstellen".
// - &schedule=1 goes all the way to a running season (schedule + matches) and
//   registers the signed-in persona so their Spieler-Dashboard is populated.
//   finalize/schedule build the fixed league shape (`DEV_SEASON_SHAPE`) and
//   ignore `count`.
// - &even=1 is a running season with equal-size sub-divisions, so the division
//   table appears on the Spieler-Dashboard (ignores count).
// - &ladder=division|sub_division is a 3-division running season with the persona
//   in a fully-zoned middle division, decided by the Gesamt- or Gruppentabelle.
export async function GET(request: Request) {
  if (!(await devToolsEnabled())) {
    return new Response("Not found", { status: 404 });
  }

  const params = new URL(request.url).searchParams;
  const current = await currentUser();

  const ladder = params.get("ladder");
  if (ladder === "division" || ladder === "sub_division") {
    await generateLadderSeason(ladder, current?.userId);
    redirect("/spieler");
  }

  if (params.get("even") === "1") {
    await generateEvenRunningSeason(current?.userId);
    redirect("/spieler");
  }

  const raw = Number(params.get("count") ?? "100");
  const count = Math.min(Math.max(Number.isFinite(raw) ? raw : 100, 1), 500);
  const grouped = params.get("grouped") === "1";
  const finalize = params.get("finalize") === "1";
  const schedule = params.get("schedule") === "1";
  // A finalized league is built to the fixed shape (7 divisions, Division 4 on
  // its Gesamttabelle), which fixes the player count — `count` only steers the
  // pre-seeding states, where an arbitrary field size is the point.
  await generateSeedData(count, {
    grouped,
    finalize,
    schedule,
    includeUserId: current?.userId,
    shape: finalize || schedule ? DEV_SEASON_SHAPE : undefined,
  });
  redirect(schedule ? "/spieler" : finalize ? "/staff" : "/staff/seeding");
}
