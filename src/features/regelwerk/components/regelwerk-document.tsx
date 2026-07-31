import { SectionHeader } from "@/components/section-header";
import { Tick } from "@/components/tick";
import { AcceptanceStatus } from "@/features/regelwerk/components/acceptance-status";
import {
  ChapterDisclosure,
  ChapterSidebar,
} from "@/features/regelwerk/components/chapter-list";
import { FactsGrid } from "@/features/regelwerk/components/facts";
import type { RegelwerkDocument } from "@/features/regelwerk/content/types";
import { seasonName } from "@/features/staff/registration-window";

// The rules document (design §2). Two columns on desktop — a sticky chapter
// list beside a 760px reading measure, the same measure as the legal pages,
// because this is a document and should read like the Impressum's sibling
// rather than like a dashboard.

export function RegelwerkDocumentView({
  document,
  acceptance,
}: {
  document: RegelwerkDocument;
  /**
   * Null for anyone who is not registered for this season — signed out, or
   * signed in but not taking part. The document then simply ends after the
   * signature, because there is nothing to ask them.
   */
  acceptance: { acceptedAt: string | null } | null;
}) {
  const chapters = document.chapters.map((chapter) => ({
    id: chapter.id,
    number: chapter.number,
    title: chapter.title,
  }));

  return (
    <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-10 px-6 py-12 lg:flex-row">
      <ChapterSidebar chapters={chapters} className="hidden lg:flex" />

      <main className="flex min-w-0 max-w-[760px] flex-1 flex-col gap-12">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h1 className="text-[32px] text-brand-blue leading-[1.05] sm:text-[40px] dark:text-white">
              Regelwerk
            </h1>
            <div className="flex items-center gap-2">
              <Tick size="s" />
              <span className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.12em]">
                {seasonName(document.seasonNumber)} · Gültig ab{" "}
                {document.validFrom}
              </span>
            </div>
          </div>
          <p className="text-[14.5px] text-muted-foreground leading-[1.65]">
            Mit der Anmeldung zur VGC Bundesliga bestätigt ihr, dieses Regelwerk
            gelesen zu haben und seinen Inhalt zu akzeptieren. Änderungen werden
            auf unserem Discord angekündigt.
          </p>

          <ChapterDisclosure chapters={chapters} className="lg:hidden" />

          <FactsGrid
            facts={document.facts}
            emphasisIndex={document.emphasisIndex}
          />
        </div>

        {document.chapters.map((chapter) => (
          <section
            key={chapter.id}
            id={chapter.id}
            className="flex scroll-mt-6 flex-col gap-6"
          >
            <SectionHeader meta={`Kapitel ${chapter.number}`} wrap>
              {chapter.title}
            </SectionHeader>
            {chapter.sections.map((section) => (
              <div key={section.title} className="flex flex-col gap-4">
                <h3 className="text-[17px] text-brand-blue dark:text-white">
                  {section.title}
                </h3>
                {section.body}
              </div>
            ))}
          </section>
        ))}

        <div className="flex flex-col gap-4 border-t pt-6">
          <p className="text-[14.5px] text-muted-foreground leading-[1.65]">
            Weitere Fragen könnt ihr gerne bei Discord im
            #fragen-antworten-Kanal stellen!
          </p>
          <span className="font-bold font-heading text-[15px] text-brand-blue uppercase tracking-[0.02em] dark:text-white">
            Eure VGC Gemeinde
          </span>
        </div>

        {acceptance ? (
          <AcceptanceStatus
            seasonNumber={document.seasonNumber}
            acceptedAt={acceptance.acceptedAt}
          />
        ) : null}
      </main>
    </div>
  );
}
