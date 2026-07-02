import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { discordIdentityFromUser } from "@/features/auth/identity";
import { ProfileHeader } from "@/features/profile/components/profile-header";
import { SettingsForm } from "@/features/profile/components/settings-form";
import { getProfile } from "@/features/profile/queries";
import { roleLabel } from "@/features/roles/roles";
import { getRole } from "@/features/roles/sync";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/");
  }

  const identity = discordIdentityFromUser(user);
  const role = await getRole(user.id, identity.discordId);
  const profile = await getProfile(user.id);

  const initial = {
    twitterHandle: profile?.twitterHandle ?? "",
    blueskyHandle: profile?.blueskyHandle ?? "",
    origin: profile?.origin ?? null,
  };

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
        <ProfileHeader identity={identity} roleLabel={roleLabel(role)} />
        <div className="mt-10">
          <SettingsForm initial={initial} />
        </div>
      </main>
    </div>
  );
}
