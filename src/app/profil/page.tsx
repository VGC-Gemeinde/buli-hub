import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { ProfileHeader } from "@/features/profile/components/profile-header";
import { SettingsForm } from "@/features/profile/components/settings-form";
import { getProfile } from "@/features/profile/queries";
import { currentUser } from "@/features/roles/guard";
import { roleLabel } from "@/features/roles/roles";

export default async function ProfilPage() {
  const current = await currentUser();
  if (!current) {
    redirect("/");
  }

  const profile = await getProfile(current.userId);

  const initial = {
    twitterHandle: profile?.twitterHandle ?? "",
    blueskyHandle: profile?.blueskyHandle ?? "",
    origin: profile?.origin ?? null,
    hasCaptureCard: profile?.hasCaptureCard ?? false,
  };

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[640px] flex-1 px-6 py-12 sm:px-8">
        <ProfileHeader
          displayName={current.displayName}
          username={current.username}
          avatarUrl={current.avatarUrl}
          roleLabel={roleLabel(current.role)}
        />
        <div className="mt-11">
          <SettingsForm initial={initial} />
        </div>
      </main>
    </div>
  );
}
