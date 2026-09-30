import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FullSchedule } from "@/features/public-league/components/full-schedule";
import { publicLeagueOverview } from "@/features/public-league/queries";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import { currentSeason } from "@/features/season/season-status";
import {
  parseSpoilersOff,
  SPOILERS_OFF_COOKIE,
} from "@/features/spoilers/spoilers";
import { StaffPage } from "@/features/staff/components/staff-page";
import { germanToday } from "@/lib/german-time";

// The Spielplan inside the Staff-Bereich (docs/plans/staff-dashboard.md):
// the same schedule as the public `/spielplan`, in the staff shell, so the
// tab bar does not send staff out of their area. While the schedule is still
// internal it is the preview of exactly what will go live.
export default async function StaffSchedulePage() {
  const current = await currentUser();
  if (!current || !roleAtLeast(current.role, "staff")) {
    redirect("/");
  }
  const { window, phase } = await currentSeason();
  if (!window || (phase !== "regular_season" && phase !== "schedule_hidden")) {
    redirect("/staff");
  }

  const [overview, cookieStore] = await Promise.all([
    publicLeagueOverview(window.id, window.seasonNumber, germanToday(), {
      userId: current.userId,
      isStaff: true,
    }),
    cookies(),
  ]);

  return (
    <StaffPage
      title="Spielplan"
      intro={
        phase === "schedule_hidden"
          ? "Der Spielplan, wie er nach der Veröffentlichung für alle aussieht. Bis dahin sehen ihn nur Staff."
          : undefined
      }
    >
      <FullSchedule
        overview={overview}
        meId={current.userId}
        initialSpoilersOff={parseSpoilersOff(
          cookieStore.get(SPOILERS_OFF_COOKIE)?.value,
        )}
        hiddenPreview={phase === "schedule_hidden"}
        embedded
      />
    </StaffPage>
  );
}
