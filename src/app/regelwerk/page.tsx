import type { Metadata } from "next";
import { EmptyStateCard } from "@/components/empty-state-card";
import { SiteHeader } from "@/components/site-header";
import { RegelwerkDocumentView } from "@/features/regelwerk/components/regelwerk-document";
import { regelwerkForSeason } from "@/features/regelwerk/content";
import { acceptedAt } from "@/features/regelwerk/queries";
import { getRegistration } from "@/features/registration/queries";
import { currentUser } from "@/features/roles/guard";
import { latestWindow } from "@/features/staff/queries";

export const metadata: Metadata = {
  title: "Regelwerk · Buli Hub",
  description: "Das Regelwerk der VGC Bundesliga",
};

// Public — readable signed out, because registration requires accepting it and
// players link it into Discord. Always serves the running season: the head
// names the season explicitly, so an old link never silently shows the wrong
// ruleset, and a season with no published document says so rather than falling
// back to the previous one.
export default async function RegelwerkPage() {
  const window = await latestWindow();
  const document =
    window === null ? null : regelwerkForSeason(window.seasonNumber);
  const current = await currentUser();

  // The acceptance block belongs to players who are in this season. Everyone
  // else — signed out, or signed in but not registered — reads the document
  // and is asked nothing: for them acceptance is part of registering, and the
  // checkbox on /anmeldung is where it happens.
  const registration =
    current && window ? await getRegistration(window.id, current.userId) : null;
  const acceptance =
    current && window && registration
      ? {
          acceptedAt:
            (await acceptedAt(window.id, current.userId))?.toISOString() ??
            null,
        }
      : null;

  if (document === null) {
    return (
      <div className="flex flex-1 flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-[640px] flex-1 px-6 py-12 sm:px-8">
          <h1 className="mb-9 text-[32px] text-brand-blue sm:text-[40px] dark:text-white">
            Regelwerk
          </h1>
          <EmptyStateCard title="Noch nicht veröffentlicht" informational>
            Für die kommende Saison steht das Regelwerk noch nicht fest. Sobald
            es veröffentlicht ist, wird es hier und im Discord angekündigt.
          </EmptyStateCard>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <RegelwerkDocumentView document={document} acceptance={acceptance} />
    </div>
  );
}
