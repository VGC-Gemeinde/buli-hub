import { ChapterSidebar } from "buli-hub";
import type { ChapterLink } from "@/features/regelwerk/components/chapter-list";

/* The Regelwerk's sticky chapter list beside the document (desktop). Its
 * scroll-spy marks the last chapter whose heading has passed 160px from the
 * top, so the active cell carries the document's own chapter anchors above
 * the list, where the page would have scrolled them. */

const CHAPTERS: ChapterLink[] = [
  { id: "anmeldung", number: 1, title: "Anmeldung" },
  { id: "struktur", number: 2, title: "Struktur der Liga" },
  { id: "ablauf", number: 3, title: "Ablauf des Ligabetriebs" },
  { id: "bewertung", number: 4, title: "Bewertung" },
];

/* Top of the page: no chapter reached yet. */
export function Seitenanfang() {
  return <ChapterSidebar chapters={CHAPTERS} />;
}

/* Scrolled into chapter 3: headings 1 to 3 have passed the line. The anchors
 * are pinned to the viewport top (where the scrolled page would hold them) and
 * carry their own ids, so the first cell, rendered beside it, stays unreached. */
const SCROLLED: ChapterLink[] = CHAPTERS.map((chapter) => ({
  ...chapter,
  id: `gelesen-${chapter.id}`,
}));

export function ImKapitelAblauf() {
  return (
    <div>
      {SCROLLED.slice(0, 3).map((chapter) => (
        <span key={chapter.id} id={chapter.id} className="fixed top-0" />
      ))}
      <ChapterSidebar chapters={SCROLLED} />
    </div>
  );
}
